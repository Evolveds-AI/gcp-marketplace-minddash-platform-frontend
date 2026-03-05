import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { nanoid } from 'nanoid';

const JWT_SECRET = process.env.JWT_SECRET || 'evolve-secret-key';

// Crear pool de conexiones de PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  roleType: 'super_admin' | 'chatbot_owner' | 'chatbot_user';
  primaryChatbotId?: string;
  canManageUsers?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Obtener token de autorización
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorización requerido' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Verificar y decodificar JWT
    let payload: JWTPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Verificar que sea chatbot owner
    if (payload.roleType !== 'chatbot_owner') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo chatbot owners pueden crear usuarios.' },
        { status: 403 }
      );
    }

    // Verificar que tenga chatbot asignado
    if (!payload.primaryChatbotId) {
      return NextResponse.json(
        { error: 'No tienes un chatbot asignado' },
        { status: 400 }
      );
    }

    const { username, email, password, fullName } = await request.json();

    // Validaciones básicas
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email y password son requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Verificar que el email sea válido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Verificar que el usuario no exista
    const checkUserQuery = `
      SELECT id FROM usuarios 
      WHERE username = $1 OR email = $2
    `;
    const existingUser = await pool.query(checkUserQuery, [username, email]);

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: 'El usuario o email ya existe' },
        { status: 409 }
      );
    }

    // Obtener el cliente del chatbot owner
    const getOwnerQuery = `
      SELECT client_id FROM usuarios 
      WHERE id = $1
    `;
    const ownerResult = await pool.query(getOwnerQuery, [payload.userId]);

    if (ownerResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Error obteniendo información del owner' },
        { status: 500 }
      );
    }

    const clientId = ownerResult.rows[0].client_id;

    // Hashear la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear el nuevo usuario
    const userId = nanoid();
    const createUserQuery = `
      INSERT INTO usuarios (
        id, 
        username, 
        email, 
        password_hash, 
        iam_role, 
        client_id,
        primary_chatbot_id,
        can_manage_users,
        email_verified,
        is_active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING id, username, email, created_at
    `;

    const newUserResult = await pool.query(createUserQuery, [
      userId,
      username.trim(),
      email.trim().toLowerCase(),
      hashedPassword,
      'user', // iam_role
      clientId,
      payload.primaryChatbotId, // primary_chatbot_id
      false, // can_manage_users
      false, // email_verified (puede implementarse verificación por email después)
      true // is_active
    ]);

    const newUser = newUserResult.rows[0];

    // Log de auditoría
    console.log(`[AUDIT] Chatbot owner ${payload.username} created user ${username} for chatbot ${payload.primaryChatbotId}`);

    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        chatbotId: payload.primaryChatbotId,
        createdAt: newUser.created_at,
        createdBy: payload.username
      }
    });

  } catch (error) {
    console.error('Error creando usuario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para listar usuarios creados por el chatbot owner
export async function GET(request: NextRequest) {
  try {
    // Obtener token de autorización
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorización requerido' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Verificar y decodificar JWT
    let payload: JWTPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Verificar que sea chatbot owner
    if (payload.roleType !== 'chatbot_owner') {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    if (!payload.primaryChatbotId) {
      return NextResponse.json(
        { error: 'No tienes un chatbot asignado' },
        { status: 400 }
      );
    }

    // Obtener usuarios del chatbot específico
    const usersQuery = `
      SELECT 
        id,
        username,
        email,
        is_active,
        created_at,
        primary_chatbot_id
      FROM usuarios 
      WHERE primary_chatbot_id = $1 
        AND iam_role = 'user'
      ORDER BY created_at DESC
    `;

    const result = await pool.query(usersQuery, [payload.primaryChatbotId]);

    return NextResponse.json({
      success: true,
      users: result.rows.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        isActive: user.is_active,
        createdAt: user.created_at.toISOString(),
        chatbotId: user.primary_chatbot_id
      }))
    });

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}