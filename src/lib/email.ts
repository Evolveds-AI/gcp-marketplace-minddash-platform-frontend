import sgMail from '@sendgrid/mail';

// Configurar SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@evolve.com';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export async function sendVerificationEmail(email: string, username: string): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key no configurada. Email de verificación no enviado.');
    return;
  }

  const msg = {
    to: email,
    from: FROM_EMAIL,
    subject: 'Verificación de cuenta - Chatbot MindDash',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3978d5;">¡Bienvenido a Chatbot MindDash!</h2>
        <p>Hola <strong>${username}</strong>,</p>
        <p>Tu cuenta ha sido creada exitosamente. Ya puedes comenzar a usar nuestros servicios de chatbot.</p>
        <p>Si no creaste esta cuenta, puedes ignorar este email.</p>
        <br>
        <p>Saludos,<br>El equipo de Chatbot MindDash</p>
      </div>
    `
  };

  try {
    await sgMail.send(msg);
    console.log('Email de verificación enviado a:', email);
  } catch (error) {
    console.error('Error enviando email de verificación:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(email: string, username: string, resetToken: string): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key no configurada. Email de reset no enviado.');
    return;
  }

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

  const msg = {
    to: email,
    from: FROM_EMAIL,
    subject: 'Recuperación de contraseña - Chatbot MindDash',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3978d5;">Recuperación de contraseña</h2>
        <p>Hola <strong>${username}</strong>,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
        <p style="margin: 20px 0;">
          <a href="${resetUrl}" style="background-color: #3978d5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Restablecer contraseña
          </a>
        </p>
        <p><strong>Este enlace expira en 1 hora.</strong></p>
        <p>Si no solicitaste este cambio, puedes ignorar este email.</p>
        <br>
        <p>Saludos,<br>El equipo de Chatbot MindDash</p>
      </div>
    `
  };

  try {
    await sgMail.send(msg);
    console.log('Email de reset enviado a:', email);
  } catch (error) {
    console.error('Error enviando email de reset:', error);
    throw error;
  }
}

export async function sendPasswordChangedNotification(email: string, username: string): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key no configurada. Notificación no enviada.');
    return;
  }

  const msg = {
    to: email,
    from: FROM_EMAIL,
    subject: 'Contraseña actualizada - Chatbot MindDash',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3978d5;">Contraseña actualizada</h2>
        <p>Hola <strong>${username}</strong>,</p>
        <p>Tu contraseña ha sido actualizada exitosamente.</p>
        <p>Si no realizaste este cambio, contacta inmediatamente a nuestro soporte.</p>
        <br>
        <p>Saludos,<br>El equipo de Chatbot MindDash</p>
      </div>
    `
  };

  try {
    await sgMail.send(msg);
    console.log('Notificación de cambio de password enviada a:', email);
  } catch (error) {
    console.error('Error enviando notificación:', error);
    throw error;
  }
} 