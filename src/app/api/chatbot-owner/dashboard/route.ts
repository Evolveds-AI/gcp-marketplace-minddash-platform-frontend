import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

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

// Mapeo de chatbot IDs a nombres y compañías
const CHATBOT_INFO: Record<string, { name: string; companyName: string }> = {
  'chatbotLisa': { name: 'Lisa AI Assistant', companyName: 'LISIT' },
  'chatbotID3456': { name: 'Cintac Support Bot', companyName: 'Cintac' },
  'chatbotID8787': { name: 'Mecánica Express Bot', companyName: 'Mecánica Express' },
  'chatbotID9292': { name: 'Restobar Assistant', companyName: 'Restobar Central' },
  'chatbotID3434': { name: 'MindDash Analytics Bot', companyName: 'MindDash Analytics' }
};

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
        { error: 'Acceso denegado. Solo chatbot owners pueden acceder.' },
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

    const chatbotId = payload.primaryChatbotId;
    const chatbotInfo = CHATBOT_INFO[chatbotId];

    if (!chatbotInfo) {
      return NextResponse.json(
        { error: 'Información del chatbot no encontrada' },
        { status: 404 }
      );
    }

    // Obtener usuarios del chatbot específico usando SQL directo
    const usersQuery = `
      SELECT 
        id,
        username,
        email,
        is_active,
        created_at,
        iam_role,
        primary_chatbot_id
      FROM usuarios 
      WHERE primary_chatbot_id = $1 
        AND iam_role = 'user'
      ORDER BY created_at DESC
    `;

    const usersResult = await pool.query(usersQuery, [chatbotId]);
    const users = usersResult.rows;

    // Preparar información del chatbot
    const chatbotData = {
      id: chatbotId,
      name: chatbotInfo.name,
      clientName: chatbotInfo.companyName,
      totalUsers: users.length,
      activeUsers: users.filter(user => user.is_active).length,
      createdAt: new Date().toISOString()
    };

    // Formatear usuarios
    const formattedUsers = users.map(user => ({
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      isActive: user.is_active,
      createdAt: user.created_at.toISOString()
    }));

    return NextResponse.json({
      success: true,
      chatbot: chatbotData,
      users: formattedUsers,
      owner: {
        username: payload.username,
        email: payload.email,
        canManageUsers: payload.canManageUsers
      }
    });

  } catch (error) {
    console.error('Error en dashboard de chatbot owner:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para obtener estadísticas adicionales
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
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    const { action } = await request.json();

    if (action === 'get_activity_stats') {
      // Obtener estadísticas de actividad reales de la base de datos
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      try {
        // Obtener todas las conversaciones de la última semana
        const weeklyConversationsResult = await pool.query(
          'SELECT COUNT(*) as count FROM conversations WHERE timestamp >= $1',
          [sevenDaysAgo]
        );
        const weeklyConversations = parseInt(weeklyConversationsResult.rows[0].count);

        // Obtener total de mensajes usando la tabla Message
        const weeklyMessagesResult = await pool.query(
          'SELECT COUNT(*) as count FROM "Message" WHERE "createdAt" >= $1',
          [sevenDaysAgo]
        );
        const weeklyMessages = parseInt(weeklyMessagesResult.rows[0].count);

        // Obtener usuarios únicos activos (con sesiones en los últimos 30 días)
        const uniqueActiveUsersResult = await pool.query(
          'SELECT COUNT(DISTINCT usuario_id) as count FROM sessions_user WHERE created_at >= $1 AND is_active = true',
          [thirtyDaysAgo]
        );
        const uniqueActiveUsers = parseInt(uniqueActiveUsersResult.rows[0].count);

        // Obtener preguntas más populares basadas en conversaciones reales
        const recentConversationsResult = await pool.query(
          'SELECT title, "lastMessage" FROM conversations WHERE title IS NOT NULL AND LENGTH(title) > 10 ORDER BY timestamp DESC LIMIT 20'
        );

        // Extraer preguntas más comunes (simplificado)
        const popularQuestions = recentConversationsResult.rows
          .slice(0, 3)
          .map(conv => conv.title);

        // Si no hay suficientes preguntas reales, usar defaults
        const defaultQuestions = [
          '¿Cómo puedes ayudarme?',
          '¿Cuáles son tus funcionalidades?',
          '¿Cómo puedo contactar soporte?'
        ];

        const stats = {
          weeklyActivity: {
            conversations: weeklyConversations,
            messages: weeklyMessages,
            uniqueUsers: uniqueActiveUsers
          },
          popularQuestions: popularQuestions.length >= 3 ? popularQuestions : defaultQuestions
        };

        return NextResponse.json({
          success: true,
          stats
        });

      } catch (error) {
        console.error('Error obteniendo estadísticas de actividad:', error);
        
        // Fallback a datos básicos en caso de error
        const fallbackStats = {
          weeklyActivity: {
            conversations: 0,
            messages: 0,
            uniqueUsers: 0
          },
          popularQuestions: [
            '¿Cómo puedes ayudarme?',
            '¿Cuáles son tus funcionalidades?',
            '¿Cómo puedo contactar soporte?'
          ]
        };

        return NextResponse.json({
          success: true,
          stats: fallbackStats
        });
      }
    }

    return NextResponse.json(
      { error: 'Acción no reconocida' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error en endpoint POST de dashboard:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}