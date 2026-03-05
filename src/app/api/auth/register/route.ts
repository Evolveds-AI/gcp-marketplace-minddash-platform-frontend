import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

interface RegisterRequest {
  // Datos del cliente
  clientName: string;
  clientDescription: string;
  
  // Datos del usuario admin
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  
  // Términos y condiciones
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  
  // Plan seleccionado (opcional, default: 'free')
  selectedPlanId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    
    // Validación de datos
    const validationError = validateRegistrationData(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    
         // Verificar si el email ya existe
     const existingUser = await prisma.users.findUnique({
       where: { email: body.email }
     });
     
     if (existingUser) {
       return NextResponse.json({ 
         error: 'Este email ya está registrado' 
       }, { status: 400 });
     }
     
     // Verificar si el nombre de cliente ya existe
     const existingCompany = await prisma.clients.findFirst({
       where: { nombre: body.clientName }
     });
     
     if (existingCompany) {
       return NextResponse.json({ 
         error: 'Un cliente con este nombre ya existe' 
       }, { status: 400 });
     }
     
     // Hash de la contraseña
     const hashedPassword = await bcrypt.hash(body.password, 10);
     
     // Crear cliente y usuario en una transacción
     const result = await prisma.$transaction(async (tx: any) => {
       // Crear cliente
      const client = await tx.clients.create({
        data: {
          id: uuidv4(),
          nombre: body.clientName,
          description: body.clientDescription,
          created_at: new Date(),
          updated_at: new Date(),
        }
      });
       
       // Crear usuario normal (por defecto todos los nuevos usuarios son 'user')
      // Buscar el role_id correspondiente a 'user'
      const userRole = await tx.roles.findFirst({
        where: { name: 'user' }
      });
      
      if (!userRole) {
        throw new Error('Rol de usuario no encontrado en la base de datos');
      }
      
      const adminRole = await tx.roles.findFirst({
        where: { name: 'admin' }
      });
      
      const roleIdToUse = adminRole ? adminRole.id : userRole.id;
      
      const user = await tx.users.create({
        data: {
          id: uuidv4(),
          username: body.username,
          email: body.email,
          password_hash: hashedPassword,
          role_id: roleIdToUse,
          is_active: true,
          email_verified: false, // Requiere verificación por email
          created_at: new Date(),
          updated_at: new Date(),
        }
      });
      
      // Crear organización por defecto para el cliente
      const organization = await tx.organizations.create({
        data: {
          id: uuidv4(),
          name: body.clientName,
          company_name: body.clientName,
          description: `Organización principal de ${body.clientName}`,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      
      // Crear proyecto por defecto
      const project = await tx.projects.create({
        data: {
          id: uuidv4(),
          name: `${body.clientName} - Proyecto Principal`,
          description: `Proyecto principal de ${body.clientName}`,
          organization_id: organization.id,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      
      // Crear producto por defecto
      const product = await tx.products.create({
        data: {
          id: uuidv4(),
          name: `${body.clientName} - Producto Principal`,
          description: `Producto principal de ${body.clientName}`,
          project_id: project.id,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      
      // Buscar rol de admin para asignar al usuario creado
      
      // Crear relaciones de acceso para el usuario
      // 1. Relación usuario-cliente
      await tx.access_user_client.create({
        data: {
          user_id: user.id,
          client_id: client.id,
          role_id: roleIdToUse,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      
      // 2. Relación usuario-organización
      await tx.access_user_organization.create({
        data: {
          user_id: user.id,
          organization_id: organization.id,
          role_id: roleIdToUse,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      
      await tx.access_user_project.create({
        data: {
          user_id: user.id,
          project_id: project.id,
          role_id: roleIdToUse,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      
      await tx.access_user_product.create({
        data: {
          user_id: user.id,
          product_id: product.id,
          role_id: roleIdToUse,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
       
       // Crear client_settings con el plan seleccionado
      const planId = body.selectedPlanId || 'free';
      await tx.client_settings.create({
        data: {
          client_id: client.id,
          company_name: body.clientName,
          company_description: body.clientDescription || null,
          current_plan: planId,
          billing_email: body.email,
        }
      });
       
       return { client, user, organization, project, product, planId };
     });
    
    // Crear token de verificación y enviar email (opcional, no bloquea el registro)
    try {
      const { createVerificationToken, sendVerificationEmail } = await import('@/lib/utils/email-verification');
      const verificationToken = await createVerificationToken(result.user.id, body.email);
      await sendVerificationEmail(body.email, body.username, body.clientName, verificationToken);
    } catch (emailError) {
      console.warn('Error enviando email de verificación (registro completado exitosamente):', emailError);
    }
    
    return NextResponse.json({
      message: 'Registro exitoso. Se ha enviado un email de confirmación. El usuario se creó con rol "admin".',
      clientId: result.client.id,
      userId: result.user.id,
      planId: result.planId
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error en registro:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function validateRegistrationData(data: RegisterRequest): string | null {
  // Validar cliente
  if (!data.clientName || data.clientName.trim().length < 3) {
    return 'El nombre del cliente debe tener al menos 3 caracteres';
  }
  
  const clientDescriptionTrimmed = data.clientDescription?.trim() || '';
  if (clientDescriptionTrimmed.length > 0 && clientDescriptionTrimmed.length < 10) {
    return 'La descripción del cliente debe tener al menos 10 caracteres';
  }
  
  // Validar usuario
  if (!data.username || data.username.trim().length < 3) {
    return 'El nombre de usuario debe tener al menos 3 caracteres';
  }
  
  const usernameRegex = /^[a-zA-Z0-9._-]+$/;
  if (!usernameRegex.test(data.username)) {
    return 'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos (sin espacios).';
  }
  
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return 'El email no es válido';
  }
  
  if (!data.password || data.password.length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres';
  }
  
  if (data.password !== data.confirmPassword) {
    return 'Las contraseñas no coinciden';
  }
  
  // Validar términos y condiciones
  if (!data.acceptTerms) {
    return 'Debes aceptar los términos y condiciones';
  }
  
  if (!data.acceptPrivacy) {
    return 'Debes aceptar las políticas de privacidad';
  }
  
  return null;
}

// Función para crear configuración inicial del cliente
async function createDefaultCompanySettings(clientId: string) {
  // TODO: Crear configuraciones por defecto para el cliente
  // - Límites de usuarios
  // - Configuraciones de chatbot
  // - Permisos por defecto
  
  return Promise.resolve();
}