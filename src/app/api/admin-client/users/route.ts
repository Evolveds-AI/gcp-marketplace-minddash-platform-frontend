import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';
import { getAdminContext } from '@/lib/utils/admin-context';
import { isAdminClientWriteRole } from '@/lib/utils/admin-client-role';

const prismaAny = prisma as any;

/**
 * Verifica si un admin puede gestionar a un usuario específico
 * basándose en las relaciones de access_user_client
 */
async function adminCanManageUser(adminUserId: string, targetUserId: string): Promise<boolean> {
  const adminContext = await getAdminContext(adminUserId);
  if (adminContext.userIds.length > 0 && adminContext.userIds.includes(targetUserId)) {
    return true;
  }
  // Si no está en el contexto, verificar directamente via access_user_client
  const adminClients = await prismaAny.access_user_client.findMany({
    where: { user_id: adminUserId },
    select: { client_id: true }
  });
  const clientIds = adminClients.map((c: any) => c.client_id).filter(Boolean);
  if (clientIds.length === 0) return false;

  const targetUserClients = await prismaAny.access_user_client.findMany({
    where: { user_id: targetUserId, client_id: { in: clientIds } }
  });
  return targetUserClients.length > 0;
}

// ========================================
// FUNCIONES AUXILIARES PARA MÚLTIPLES CUITs
// ========================================

/**
 * Convierte array de CUITs a string concatenado (formato: "cuit1,cuit2,cuit3")
 * Compatible con formato anterior (single CUIT)
 */
function cuitArrayToString(cuitArray: string[]): string {
  return cuitArray
    .filter(cuit => cuit && cuit.trim().length > 0)
    .map(cuit => cuit.trim())
    .join(','); // Sin espacio después de la coma
}

/**
 * Convierte string concatenado a array de CUITs
 * Compatible con formato anterior (single CUIT)
 */
function cuitStringToArray(cuitString: string): string[] {
  if (!cuitString || cuitString.trim() === '') return [];
  
  return cuitString
    .split(',')
    .map(cuit => cuit.trim())
    .filter(cuit => cuit.length > 0);
}

/**
 * Valida formato de un CUIT individual
 */
function validateCuitFormat(cuit: string): boolean {
  const cuitRegex = /^\d{11}$/;
  return cuitRegex.test(cuit.trim());
}

/**
 * Valida array de CUITs (formato, unicidad, límites)
 */
function validateCuitArray(cuitArray: string[]): { valid: boolean; error?: string } {
  // Filtrar CUITs vacíos
  const validCuits = cuitArray.filter(cuit => cuit && cuit.trim().length > 0);
  
  // Máximo 3 CUITs
  if (validCuits.length > 3) {
    return { valid: false, error: 'Máximo 3 CUITs permitidos por usuario' };
  }
  
  // Validar formato de cada CUIT
  for (const cuit of validCuits) {
    if (!validateCuitFormat(cuit)) {
      return { valid: false, error: `CUIT inválido: ${cuit}. Debe contener exactamente 11 dígitos numéricos` };
    }
  }
  
  // Verificar que no haya CUITs duplicados en el array
  const uniqueCuits: string[] = [];
  for (const cuit of validCuits) {
    if (!uniqueCuits.includes(cuit)) {
      uniqueCuits.push(cuit);
    }
  }
  if (uniqueCuits.length !== validCuits.length) {
    return { valid: false, error: 'No se permiten CUITs duplicados en el mismo usuario' };
  }
  
  return { valid: true };
}

/**
 * Verifica que los CUITs no estén ya en uso por otros usuarios
 */
async function checkCuitGlobalUniqueness(cuitArray: string[], excludeUserId?: string): Promise<{ valid: boolean; error?: string }> {
  const validCuits = cuitArray.filter(cuit => cuit && cuit.trim().length > 0);
  if (validCuits.length === 0) return { valid: true };
  
  try {
    // Verificar si el modelo userAccessCode existe
    if (!prismaAny.userAccessCode) {
      return { valid: true }; // Si no existe el modelo, skip la validación
    }
    
    // Obtener todos los UserAccessCode existentes
    const existingCodes = await prismaAny.userAccessCode.findMany({
      where: excludeUserId ? { usuario_id: { not: excludeUserId } } : {},
      select: { usuario_id: true, codevalue: true }
    });
    
    // Expandir CUITs concatenados existentes para verificar unicidad global
    const allExistingCuits: string[] = [];
    for (const code of existingCodes) {
      const existingCuitArray = cuitStringToArray(code.codevalue);
      allExistingCuits.push(...existingCuitArray);
    }
    
    // Verificar si algún CUIT nuevo ya existe
    for (const cuit of validCuits) {
      if (allExistingCuits.includes(cuit)) {
        return { valid: false, error: `El CUIT ${cuit} ya está en uso por otro usuario` };
      }
    }
  } catch (e) {
    // El modelo UserAccessCode puede no existir en este schema
    console.log('UserAccessCode model not available for CUIT uniqueness check, skipping...');
  }
  
  return { valid: true };
}

// GET - Obtener usuarios del cliente
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token requerido' },
        { status: 401 }
      );
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      );
    }

    if (!isAdminClientWriteRole(decoded.role)) {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo administradores de cliente.' },
        { status: 403 }
      );
    }

    // Obtener contexto del admin (organizaciones, proyectos, productos, usuarios)
    console.log('🔍 Obteniendo contexto del admin:', decoded.userId);
    const adminContext = await getAdminContext(decoded.userId);
    console.log('✅ Contexto obtenido:', {
      organizationIds: adminContext.organizationIds.length,
      projectIds: adminContext.projectIds.length,
      productIds: adminContext.productIds.length,
      userIds: adminContext.userIds.length
    });

    // Obtener usuarios filtrados según el contexto del admin
    let users: any[] = [];

    const adminClientAccess = await prisma.access_user_client.findMany({
      where: { user_id: decoded.userId },
      select: { client_id: true }
    });

    const adminClientIds = adminClientAccess
      .map((a) => a.client_id)
      .filter(Boolean) as string[];

    const headerClientId = request.headers.get('x-client-id') || undefined;
    const tokenClientId = (decoded.clientId || decoded.client_id || headerClientId) as string | undefined;
    if (adminClientIds.length === 0 && tokenClientId) {
      adminClientIds.push(tokenClientId);
    }

    // Último fallback: si no hay clientId en token/header/DB, pero el contexto ya trae userIds,
    // usamos ese scope. Si tampoco hay userIds, devolvemos lista vacía por seguridad.
    if (adminClientIds.length === 0 && (!adminContext.userIds || adminContext.userIds.length === 0)) {
      console.log('⚠️ Admin sin clientId asociado (token y DB). Se devuelve lista vacía por seguridad.', {
        adminUserId: decoded.userId,
        tokenHasClientId: !!tokenClientId,
        accessRows: adminClientAccess.length
      });
      return NextResponse.json({
        success: true,
        users: [],
        metadata: {
          total: 0,
          filteredByAdmin: decoded.userId,
          organizationsCount: adminContext.organizationIds.length,
          projectsCount: adminContext.projectIds.length,
          productsCount: adminContext.productIds.length,
          warning: 'Admin sin clientId asociado'
        }
      });
    }

    const clientUserAccess = adminClientIds.length
      ? await prisma.access_user_client.findMany({
          where: { client_id: { in: adminClientIds } },
          select: { user_id: true },
          distinct: ['user_id']
        })
      : [];

    const clientUserIds = clientUserAccess
      .map((a) => a.user_id)
      .filter(Boolean) as string[];

    const combinedUserIds = Array.from(new Set([...(adminContext.userIds || []), ...clientUserIds]));

    if (combinedUserIds.length > 0) {
      console.log('📋 Consultando usuarios con IDs:', combinedUserIds);
      users = await prisma.users.findMany({
        where: {
          id: { in: combinedUserIds }
        },
        select: {
          id: true,
          username: true,
          email: true,
          phone_number: true,
          role_id: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          email_verified: true,
          role: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });
      console.log('✅ Usuarios encontrados:', users.length);
    } else {
      console.log('⚠️ No se pudo determinar el alcance del admin. Por seguridad, se devuelve una lista vacía.');
      users = [];
    }

    return NextResponse.json({
      success: true,
      users: users,
      metadata: {
        total: users.length,
        filteredByAdmin: decoded.userId,
        organizationsCount: adminContext.organizationIds.length,
        projectsCount: adminContext.projectIds.length,
        productsCount: adminContext.productIds.length
      }
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo usuarios del cliente:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Crear usuario para el cliente
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token requerido' },
        { status: 401 }
      );
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      );
    }

    const headerClientId = request.headers.get('x-client-id') || undefined;

    // LIMITACIÓN 1: Solo admin del cliente puede crear usuarios
    const userRole = (decoded.role || '').toLowerCase();
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo administradores de cliente.' },
        { status: 403 }
      );
    }

    // Verificar si es el usuario admin específico de Bayer
    const isBayerAdmin = decoded.userId === 'fdbc7a27d1d4b7747192';

    const { username, email, phoneNumber, password, access_role, cuit_code, cuit_codes, role } = await request.json();

    // Validaciones básicas
    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Username, email y password son requeridos' },
        { status: 400 }
      );
    }

    // Validar rol
    const validRoles = ['user', 'viewer', 'editor'];
    const selectedRole = (role || 'user').toLowerCase(); // Default a 'user' si no se especifica
    
    if (!validRoles.includes(selectedRole)) {
      return NextResponse.json(
        { success: false, message: 'Rol inválido o no permitido' },
        { status: 400 }
      );
    }

    // Validaciones específicas para el admin de Bayer
    let finalCuitArray: string[] = [];
    if (isBayerAdmin && access_role) {
      // Validar access_role
      const validAccessRoles = ['AllAccess', 'DISTRIBUIDOR_ACCESS'];
      if (!validAccessRoles.includes(access_role)) {
        return NextResponse.json(
          { success: false, message: 'Rol de acceso inválido' },
          { status: 400 }
        );
      }

      // Validar códigos CUIT para distribuidores
      if (access_role === 'DISTRIBUIDOR_ACCESS') {
        // Determinar array de CUITs a usar (priorizar cuit_codes nuevo, fallback a cuit_code legacy)
        if (cuit_codes && Array.isArray(cuit_codes)) {
          finalCuitArray = cuit_codes;
        } else if (cuit_code && typeof cuit_code === 'string') {
          // Compatibilidad con formato anterior (single CUIT)
          finalCuitArray = [cuit_code];
        } else {
          return NextResponse.json(
            { success: false, message: 'Al menos un código CUIT es requerido para distribuidores' },
            { status: 400 }
          );
        }

        // Validar formato y límites del array de CUITs
        const validationResult = validateCuitArray(finalCuitArray);
        if (!validationResult.valid) {
          return NextResponse.json(
            { success: false, message: validationResult.error },
            { status: 400 }
          );
        }

        // Verificar unicidad global de CUITs
        const uniquenessResult = await checkCuitGlobalUniqueness(finalCuitArray);
        if (!uniquenessResult.valid) {
          return NextResponse.json(
            { success: false, message: uniquenessResult.error },
            { status: 400 }
          );
        }
      }
    }

    // Verificar que username y email no existan
    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [
          { username: username },
          { email: email }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Username o email ya están en uso' },
        { status: 400 }
      );
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear el usuario y registros relacionados en una transacción
    const result = await prisma.$transaction(async (tx) => {
      const txAny = tx as any;
      // Buscar el RoleAccess correspondiente si es admin de Bayer y se especifica access_role
      let roleAccessId = null;
      if (isBayerAdmin && access_role) {
        const roleAccess = await txAny.roleAccess.findUnique({
          where: { name: access_role }
        });

        if (!roleAccess) {
          throw new Error(`Rol de acceso '${access_role}' no encontrado`);
        }
        
        roleAccessId = roleAccess.id;
      }

      // Buscar el role_id correspondiente al rol seleccionado
      const roleRecord = await txAny.roles.findFirst({
        where: {
          name: {
            equals: selectedRole,
            mode: 'insensitive'
          }
        }
      });
      
      if (!roleRecord) {
        return NextResponse.json(
          {
            success: false,
            message: `Rol '${selectedRole}' no encontrado en la base de datos. Roles permitidos: user, viewer, editor.`
          },
          { status: 400 }
        );
      }
      
      // Crear usuario con el rol seleccionado, ligado al admin que lo crea
      const newUser = await txAny.users.create({
        data: {
          id: uuidv4(),
          username: username,
          email: email,
          phone_number: phoneNumber || null,
          password_hash: hashedPassword,
          role_id: roleRecord.id, // Usar el role_id de la tabla roles
          role_acceso_data_id: roleAccessId, // Asignar el roleAccessId
          is_active: true,
          email_verified: false,
          failed_attempts: 0,
          created_at: new Date(),
          updated_at: new Date()
        },
        select: {
          id: true,
          username: true,
          email: true,
          phone_number: true,
          role_id: true,
          is_active: true,
          created_at: true,
          email_verified: true,
          role: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Crear registro en UserAccessCode si es el admin de Bayer y se especifica access_role (si el modelo existe)
      if (isBayerAdmin && access_role) {
        try {
          if (txAny.userAccessCode) {
            // Para DISTRIBUIDOR_ACCESS, usar los CUITs; para AllAccess (Total Acceso), usar el nombre del rol
            const codevalue = access_role === 'DISTRIBUIDOR_ACCESS' && finalCuitArray.length > 0 
              ? cuitArrayToString(finalCuitArray) // Formato: "cuit1,cuit2,cuit3"
              : access_role; // Para Total Acceso, usar "AllAccess"
            
            await txAny.userAccessCode.create({
              data: {
                usuario_id: newUser.id,
                codevalue: codevalue,
                createdat: new Date(),
                updatedat: new Date()
              }
            });
          }
        } catch (e) {
          // El modelo UserAccessCode puede no existir en este schema
          console.log('UserAccessCode model not available for create, skipping...');
        }
      }

      const adminClients = await txAny.access_user_client.findMany({
        where: { user_id: decoded.userId },
        select: { client_id: true, role_id: true }
      });

      const adminClientIds = adminClients
        .map((a: any) => a.client_id)
        .filter(Boolean) as string[];

      const tokenClientId = (decoded.clientId || decoded.client_id || headerClientId) as string | undefined;
      if (adminClientIds.length === 0 && tokenClientId) {
        adminClientIds.push(tokenClientId);
      }

      // Si el admin no tenía acceso persistido pero sí tokenClientId, persistirlo para evitar que el scope se pierda al relogin.
      if (tokenClientId) {
        const adminHasClient = adminClients.some((row: any) => row.client_id === tokenClientId);
        if (!adminHasClient) {
          await txAny.access_user_client.create({
            data: {
              user_id: decoded.userId,
              client_id: tokenClientId,
              role_id: adminClients?.[0]?.role_id ?? undefined,
              created_at: new Date(),
              updated_at: new Date()
            }
          });
        }
      }

      if (adminClientIds.length > 0) {
        await txAny.access_user_client.createMany({
          data: adminClientIds.map((clientId: string) => ({
            user_id: newUser.id,
            client_id: clientId,
            role_id: roleRecord.id,
            created_at: new Date(),
            updated_at: new Date()
          })),
          skipDuplicates: true
        });
      }

      await Promise.all([
        txAny.access_user_organization.deleteMany({
          where: { user_id: newUser.id }
        }),
        txAny.access_user_project.deleteMany({
          where: { user_id: newUser.id }
        }),
        txAny.access_user_product.deleteMany({
          where: { user_id: newUser.id }
        })
      ]);

      return newUser;
    });

    if (result instanceof NextResponse) {
      return result;
    }

    const newUser = result;

    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: { user: newUser }
    });

  } catch (error: any) {
    console.error('❌ Error creando usuario:', error);
    console.error('Stack trace:', error.stack);
    console.error('Error message:', error.message);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// PUT - Actualizar usuario del cliente
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token requerido' },
        { status: 401 }
      );
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      );
    }

    // Solo admin del cliente puede actualizar usuarios
    const userRolePut = (decoded.role || '').toLowerCase();
    if (userRolePut !== 'admin' && userRolePut !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo administradores de cliente.' },
        { status: 403 }
      );
    }

    // Verificar si es el usuario admin específico de Bayer
    const isBayerAdmin = decoded.userId === 'fdbc7a27d1d4b7747192';

    const { userId, username, email, phoneNumber, password, access_role, cuit_code, cuit_codes, role } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'ID de usuario requerido' },
        { status: 400 }
      );
    }

    // Validaciones específicas para el admin de Bayer
    let finalCuitArray: string[] = [];
    if (isBayerAdmin && access_role) {
      // Validar access_role
      const validAccessRoles = ['AllAccess', 'DISTRIBUIDOR_ACCESS'];
      if (!validAccessRoles.includes(access_role)) {
        return NextResponse.json(
          { success: false, message: 'Rol de acceso inválido' },
          { status: 400 }
        );
      }

      // Validar códigos CUIT para distribuidores
      if (access_role === 'DISTRIBUIDOR_ACCESS') {
        // Determinar array de CUITs a usar (priorizar cuit_codes nuevo, fallback a cuit_code legacy)
        if (cuit_codes && Array.isArray(cuit_codes)) {
          finalCuitArray = cuit_codes;
        } else if (cuit_code && typeof cuit_code === 'string') {
          // Compatibilidad con formato anterior (single CUIT)
          finalCuitArray = [cuit_code];
        } else {
          return NextResponse.json(
            { success: false, message: 'Al menos un código CUIT es requerido para distribuidores' },
            { status: 400 }
          );
        }

        // Validar formato y límites del array de CUITs
        const validationResult = validateCuitArray(finalCuitArray);
        if (!validationResult.valid) {
          return NextResponse.json(
            { success: false, message: validationResult.error },
            { status: 400 }
          );
        }

        // Verificar unicidad global de CUITs (excluyendo el usuario actual)
        const uniquenessResult = await checkCuitGlobalUniqueness(finalCuitArray, userId);
        if (!uniquenessResult.valid) {
          return NextResponse.json(
            { success: false, message: uniquenessResult.error },
            { status: 400 }
          );
        }
      }
    }

    // Verificar que el usuario existe
    const userToUpdate = await prismaAny.users.findUnique({
      where: { id: userId },
      select: { id: true, username: true }
    });

    if (!userToUpdate) {
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el admin puede gestionar este usuario (via access_user_client compartido)
    const canManage = await adminCanManageUser(decoded.userId, userId);
    if (!canManage) {
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para editar este usuario' },
        { status: 403 }
      );
    }

    // Actualizar en transacción
    const result = await prisma.$transaction(async (tx) => {
      const txAny = tx as any;
      // Datos básicos para actualizar
      const updateData: any = {
        username,
        email,
        phone_number: phoneNumber || null,
        updated_at: new Date()
      };

      // Validar y actualizar rol si se proporciona
      if (role) {
        const validRoles = ['user', 'viewer', 'editor'];
        const roleLower = role.toLowerCase();
        
        if (!validRoles.includes(roleLower)) {
          throw new Error('Rol inválido o no permitido');
        }
        
        // Buscar el role_id correspondiente
        const roleRecord = await txAny.roles.findFirst({
          where: {
            name: {
              equals: roleLower,
              mode: 'insensitive'
            }
          }
        });
        
        if (!roleRecord) {
          throw new Error(`Rol '${roleLower}' no encontrado en la base de datos`);
        }
        
        updateData.role_id = roleRecord.id;
      }

      // Solo incluir contraseña si se proporcionó
      if (password && password.trim()) {
        const hashedPassword = await bcrypt.hash(password, 12);
        updateData.password_hash = hashedPassword;
      }

      // Actualizar usuario
      const updatedUser = await txAny.users.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          username: true,
          email: true,
          phone_number: true,
          role_id: true,
          is_active: true,
          created_at: true,
          email_verified: true,
          role: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Manejar UserAccessCode para admin de Bayer (si el modelo existe)
      if (isBayerAdmin && access_role) {
        try {
          if (txAny.userAccessCode) {
            // Eliminar registro existente si existe
            await txAny.userAccessCode.deleteMany({
              where: { usuario_id: userId }
            });

            // Crear nuevo registro solo si es distribuidor y hay CUITs
            if (access_role === 'DISTRIBUIDOR_ACCESS' && finalCuitArray.length > 0) {
              // Convertir array de CUITs a string concatenado para almacenar en DB
              const concatenatedCuits = cuitArrayToString(finalCuitArray);
              
              await txAny.userAccessCode.create({
                data: {
                  usuario_id: userId,
                  codevalue: concatenatedCuits, // Formato: "cuit1,cuit2,cuit3"
                  createdat: new Date(),
                  updatedat: new Date()
                }
              });
            }
          }
        } catch (e) {
          // El modelo UserAccessCode puede no existir en este schema
          console.log('UserAccessCode model not available for update, skipping...');
        }
      }

      return updatedUser;
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: { user: result }
    });

  } catch (error) {
    console.error('Error actualizando usuario:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';