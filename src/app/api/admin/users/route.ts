import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { verifyAccessToken } from '@/lib/auth';

const prisma = new PrismaClient();

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

    // Solo super_admin puede acceder a este endpoint
    const userRole = (decoded.role || '').toLowerCase();
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo super administradores.' },
        { status: 403 }
      );
    }

    // Obtener todos los usuarios con sus relaciones
    const users = await prisma.users.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        phone_number: true,
        email_verified: true,
        role: {
          select: {
            id: true,
            name: true,
            type_role: true
          }
        },
        access_user_client: {
          select: {
            clients: {
              select: {
                id: true,
                nombre: true
              }
            }
          },
          take: 1
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Transformar datos para el frontend
    const transformedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email || '',
      iam_role: user.role?.name?.toUpperCase() || 'USER',
      is_active: user.is_active,
      created_at: user.created_at?.toISOString() || new Date().toISOString(),
      client: user.access_user_client[0]?.clients ? {
        id: user.access_user_client[0].clients.id,
        nombre: user.access_user_client[0].clients.nombre
      } : null
    }));
    
    return NextResponse.json({
      success: true,
      data: { users: transformedUsers },
      users: transformedUsers
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Error fetching users', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

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

    // Solo super_admin puede crear usuarios desde este endpoint
    const userRole = (decoded.role || '').toLowerCase();
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo super administradores.' },
        { status: 403 }
      );
    }

    const { username, email, password, iam_role, is_active, client_id } = await request.json();

    // Validaciones básicas
    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'Username, email y password son requeridos' },
        { status: 400 }
      );
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

    // Buscar el role_id correspondiente al rol seleccionado
    const roleName = (iam_role || 'user').toLowerCase();
    const roleRecord = await prisma.roles.findFirst({
      where: {
        name: {
          equals: roleName,
          mode: 'insensitive'
        }
      }
    });

    // Crear el usuario
    const newUser = await prisma.users.create({
      data: {
        id: uuidv4(),
        username: username,
        email: email,
        password_hash: hashedPassword,
        role_id: roleRecord?.id || undefined,
        is_active: is_active !== false,
        email_verified: false,
        failed_attempts: 0,
        created_at: new Date(),
        updated_at: new Date()
      },
      select: {
        id: true,
        username: true,
        email: true,
        is_active: true,
        created_at: true,
        role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Si se especificó un client_id, crear la relación
    if (client_id) {
      await prisma.access_user_client.create({
        data: {
          user_id: newUser.id,
          client_id: client_id,
          role_id: roleRecord?.id || undefined,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          iam_role: newUser.role?.name?.toUpperCase() || 'USER',
          is_active: newUser.is_active,
          created_at: newUser.created_at?.toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Error creating user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
