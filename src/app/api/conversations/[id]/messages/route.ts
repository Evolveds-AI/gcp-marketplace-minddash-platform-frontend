import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';

interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  message_type: string;
  metadata: any;
  created_at: Date;
}

interface ConversationRow {
  id: string;
  user_id: string;
}

// GET /api/conversations/[id]/messages - Obtener mensajes de una conversación
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const conversationId = params.id;

    // Verificar que la conversación pertenece al usuario
    const conversations = await prisma.$queryRaw<ConversationRow[]>`
      SELECT id, user_id FROM conversations 
      WHERE id = ${conversationId}::uuid AND user_id = ${decoded.userId}::uuid
    `;

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ success: false, message: 'Conversación no encontrada' }, { status: 404 });
    }

    const messages = await prisma.$queryRaw<MessageRow[]>`
      SELECT * FROM chat_messages 
      WHERE conversation_id = ${conversationId}::uuid
      ORDER BY created_at ASC
    `;

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      type: msg.role,
      content: msg.content,
      messageType: msg.message_type,
      metadata: msg.metadata,
      createdAt: msg.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: { messages: formattedMessages },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { success: false, message: 'Error al obtener mensajes' },
      { status: 500 }
    );
  }
}

// POST /api/conversations/[id]/messages - Agregar mensaje a una conversación
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ success: false, message: 'Token inválido' }, { status: 401 });
    }

    const conversationId = params.id;

    // Verificar que la conversación pertenece al usuario
    const conversations = await prisma.$queryRaw<ConversationRow[]>`
      SELECT id, user_id FROM conversations 
      WHERE id = ${conversationId}::uuid AND user_id = ${decoded.userId}::uuid
    `;

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ success: false, message: 'Conversación no encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { role, content, message_type = 'text', metadata } = body;

    if (!role || !content) {
      return NextResponse.json({ success: false, message: 'Role y content son requeridos' }, { status: 400 });
    }

    const result = await prisma.$queryRaw<MessageRow[]>`
      INSERT INTO chat_messages (conversation_id, role, content, message_type, metadata, created_at)
      VALUES (${conversationId}::uuid, ${role}, ${content}, ${message_type}, ${metadata ? JSON.stringify(metadata) : null}::jsonb, NOW())
      RETURNING *
    `;

    const message = result[0];

    // Actualizar updated_at de la conversación
    await prisma.$executeRaw`
      UPDATE conversations SET updated_at = NOW() WHERE id = ${conversationId}::uuid
    `;

    return NextResponse.json({
      success: true,
      data: {
        message: {
          id: message.id,
          role: message.role,
          type: message.role,
          content: message.content,
          message_type: message.message_type,
          metadata: message.metadata,
          createdAt: message.created_at,
        },
      },
    });
  } catch (error) {
    console.error('Error adding message:', error);
    return NextResponse.json(
      { success: false, message: 'Error al agregar mensaje' },
      { status: 500 }
    );
  }
}
