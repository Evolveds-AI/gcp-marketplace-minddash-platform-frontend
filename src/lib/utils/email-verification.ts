import crypto from 'crypto';
import { nanoid } from 'nanoid';
import prisma from '@/lib/database';

const prismaAny = prisma as any;

interface EmailVerificationToken {
  id: string;
  email: string;
  token: string;
  expiresAt: Date;
  used: boolean;
}

/**
 * Genera un token seguro para verificación de email
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Crea un token de verificación en la base de datos
 */
export async function createVerificationToken(userId: string, email: string): Promise<string> {
  const token = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

  // Eliminar tokens anteriores para este usuario
  await prismaAny.password_resets.deleteMany({
    where: {
      usuario_id: userId,
      used: false
    }
  });

  // Crear nuevo token (reutilizamos la tabla password_resets para verificación)
  await prismaAny.password_resets.create({
    data: {
      id: nanoid(),
      usuario_id: userId,
      token: token,
      expires_at: expiresAt,
      used: false
    }
  });

  return token;
}

/**
 * Verifica un token de verificación de email
 */
export async function verifyEmailToken(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const verificationRecord = await prismaAny.password_resets.findUnique({
      where: { token },
      include: {
        usuarios: true
      }
    });

    if (!verificationRecord) {
      return { success: false, error: 'Token inválido' };
    }

    if (verificationRecord.used) {
      return { success: false, error: 'Token ya utilizado' };
    }

    if (verificationRecord.expires_at < new Date()) {
      return { success: false, error: 'Token expirado' };
    }

    // Marcar token como usado
    await prismaAny.password_resets.update({
      where: { id: verificationRecord.id },
      data: { used: true }
    });

    // Marcar email como verificado
    await prisma.users.update({
      where: { id: verificationRecord.usuario_id },
      data: { 
        email_verified: true,
        updated_at: new Date()
      }
    });

    return { 
      success: true, 
      userId: verificationRecord.usuario_id 
    };

  } catch (error) {
    console.error('Error verificando token de email:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Reenvía email de verificación
 */
export async function resendVerificationEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await prisma.users.findUnique({
      where: { email }
    });

    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    if (user.email_verified) {
      return { success: false, error: 'Email ya verificado' };
    }

    if (!user.email) {
      return { success: false, error: 'Usuario sin email configurado' };
    }

    // Crear nuevo token
    const token = await createVerificationToken(user.id, user.email);

    // Enviar email
    await sendVerificationEmail(user.email, user.username, '', token);

    return { success: true };

  } catch (error) {
    console.error('Error reenviando email de verificación:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Envía email de verificación
 */
export async function sendVerificationEmail(
  email: string, 
  username: string, 
  clientName: string,
  token: string
): Promise<void> {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  
  // TODO: Implementar con servicio real de email (SendGrid, AWS SES, etc.)
  console.log(`📧 EMAIL DE VERIFICACIÓN`);
  console.log(`Para: ${email}`);
  console.log(`Usuario: ${username}`);
  console.log(`Cliente: ${clientName}`);
  console.log(`URL de verificación: ${verificationUrl}`);
  
  // Simulación de envío de email
  const emailContent = generateVerificationEmailHTML(username, clientName, verificationUrl);
  
  // Aquí se integraría con el servicio de email real
  if (process.env.NODE_ENV === 'production') {
    // await sendEmail({
    //   to: email,
    //   subject: 'Verificar tu cuenta - Chatbot Platform',
    //   html: emailContent
    // });
  }

  console.log(`✅ Email de verificación enviado a ${email}`);
}

/**
 * Genera HTML para el email de verificación
 */
export function generateVerificationEmailHTML(
  username: string, 
  clientName: string, 
  verificationUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verificar tu cuenta</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .code { background: #e9ecef; padding: 15px; border-radius: 5px; font-family: monospace; margin: 15px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>¡Bienvenido a Chatbot Platform!</h1>
            <p>Verificar tu cuenta para ${clientName}</p>
        </div>
        
        <div class="content">
            <h2>Hola ${username},</h2>
            
            <p>¡Gracias por registrarte en nuestra plataforma de chatbots! Para completar tu registro y activar tu cuenta, necesitas verificar tu dirección de email.</p>
            
            <p><strong>Haz clic en el siguiente botón para verificar tu cuenta:</strong></p>
            
            <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verificar mi cuenta</a>
            </div>
            
            <p>O copia y pega este enlace en tu navegador:</p>
            <div class="code">${verificationUrl}</div>
            
            <p><strong>Este enlace expirará en 24 horas.</strong></p>
            
            <h3>¿Qué sigue después de verificar tu cuenta?</h3>
            <ul>
                <li>✅ Acceso completo a la plataforma</li>
                <li>🤖 Crear y configurar chatbots</li>
                <li>👥 Invitar miembros a tu equipo</li>
                <li>📊 Acceder a análisis y estadísticas</li>
            </ul>
            
            <p>Si no solicitaste esta cuenta, puedes ignorar este email de forma segura.</p>
            
            <p>¡Esperamos verte pronto en la plataforma!</p>
            
            <p>El equipo de Chatbot Platform</p>
        </div>
        
        <div class="footer">
            <p>Este es un email automático, por favor no respondas a este mensaje.</p>
            <p>Si tienes problemas, contacta nuestro soporte en: soporte@chatbot.com</p>
        </div>
    </body>
    </html>
  `;
}

/**
 * Configuración de servicios de email
 */
export const EmailConfig = {
  // SendGrid
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.FROM_EMAIL || 'noreply@chatbot.com',
    fromName: process.env.FROM_NAME || 'Chatbot Platform'
  },
  
  // AWS SES
  ses: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
  },
  
  // Resend
  resend: {
    apiKey: process.env.RESEND_API_KEY
  }
};

/**
 * Función para integrar con diferentes servicios de email
 */
export async function sendEmailWithProvider(
  provider: 'sendgrid' | 'ses' | 'resend' | 'console',
  emailData: {
    to: string;
    subject: string;
    html: string;
  }
): Promise<boolean> {
  switch (provider) {
    case 'console':
      console.log(`📧 [${provider.toUpperCase()}] Email simulado:`);
      console.log(`Para: ${emailData.to}`);
      console.log(`Asunto: ${emailData.subject}`);
      console.log(`HTML: ${emailData.html.substring(0, 200)}...`);
      return true;

    case 'sendgrid':
      // TODO: Implementar SendGrid
      console.log('📧 [SENDGRID] Email enviado (placeholder)');
      return true;

    case 'ses':
      // TODO: Implementar AWS SES
      console.log('📧 [AWS SES] Email enviado (placeholder)');
      return true;

    case 'resend':
      // TODO: Implementar Resend
      console.log('📧 [RESEND] Email enviado (placeholder)');
      return true;

    default:
      throw new Error(`Proveedor de email no soportado: ${provider}`);
  }
}