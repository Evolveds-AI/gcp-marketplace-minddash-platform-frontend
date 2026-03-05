import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';

interface ConversationRow {
  id: string;
  user_id: string;
  product_id: string | null;
  title: string;
  created_at: Date;
  updated_at: Date;
  is_archived: boolean;
  last_message: string | null;
}

// GET /api/conversations - Obtener conversaciones del usuario
export async function GET(request: NextRequest) {
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

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(decoded.userId)) {
      console.warn('[conversations] userId from token is not a valid UUID:', decoded.userId);
      return NextResponse.json({ success: true, data: { conversations: [] } });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    const searchQuery = searchParams.get('search')?.trim() || '';

    if (productId && !uuidRegex.test(productId)) {
      console.warn('[conversations] product_id is not a valid UUID:', productId);
      return NextResponse.json({ success: true, data: { conversations: [] } });
    }

    // Check if the conversations table exists before querying
    const tableCheck = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'conversations'
      ) as exists
    `;
    if (!tableCheck?.[0]?.exists) {
      return NextResponse.json({ success: true, data: { conversations: [] } });
    }

    let conversations: ConversationRow[];

    if (searchQuery) {
      // Full-text search: search inside message content, conversation title
      const searchPattern = `%${searchQuery}%`;
      if (productId) {
        conversations = await prisma.$queryRaw<ConversationRow[]>`
          SELECT DISTINCT c.*,
            (SELECT content FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
          FROM conversations c
          LEFT JOIN chat_messages m ON m.conversation_id = c.id
          WHERE c.user_id = ${decoded.userId}::uuid
            AND c.is_archived = false
            AND c.product_id = ${productId}::uuid
            AND (
              c.title ILIKE ${searchPattern}
              OR m.content ILIKE ${searchPattern}
            )
          ORDER BY c.updated_at DESC
        `;
      } else {
        conversations = await prisma.$queryRaw<ConversationRow[]>`
          SELECT DISTINCT c.*,
            (SELECT content FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
          FROM conversations c
          LEFT JOIN chat_messages m ON m.conversation_id = c.id
          WHERE c.user_id = ${decoded.userId}::uuid
            AND c.is_archived = false
            AND (
              c.title ILIKE ${searchPattern}
              OR m.content ILIKE ${searchPattern}
            )
          ORDER BY c.updated_at DESC
        `;
      }
    } else if (productId) {
      conversations = await prisma.$queryRaw<ConversationRow[]>`
        SELECT c.*, 
          (SELECT content FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
        FROM conversations c
        WHERE c.user_id = ${decoded.userId}::uuid 
          AND c.is_archived = false
          AND c.product_id = ${productId}::uuid
        ORDER BY c.updated_at DESC
      `;
    } else {
      conversations = await prisma.$queryRaw<ConversationRow[]>`
        SELECT c.*, 
          (SELECT content FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
        FROM conversations c
        WHERE c.user_id = ${decoded.userId}::uuid 
          AND c.is_archived = false
        ORDER BY c.updated_at DESC
      `;
    }

    const formattedConversations = conversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      lastMessage: conv.last_message?.substring(0, 100) || '',
      timestamp: conv.updated_at,
      product_id: conv.product_id,
    }));

    return NextResponse.json({
      success: true,
      data: { conversations: formattedConversations },
    });
  } catch (error: any) {
    // If the table doesn't exist, return empty instead of 500
    if (error?.message?.includes('does not exist') || error?.code === '42P01') {
      console.warn('[conversations GET] Table not found, returning empty:', error?.message);
      return NextResponse.json({ success: true, data: { conversations: [] } });
    }
    console.error('[conversations GET] Error:', error?.message || error);
    return NextResponse.json(
      { success: false, message: 'Error al obtener conversaciones' },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Crear nueva conversación
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { title, product_id, initial_message } = body;

    const result = await prisma.$queryRaw<ConversationRow[]>`
      INSERT INTO conversations (user_id, product_id, title, created_at, updated_at, is_archived)
      VALUES (${decoded.userId}::uuid, ${product_id || null}::uuid, ${title || 'Nueva conversación'}, NOW(), NOW(), false)
      RETURNING *
    `;

    const conversation = result[0];

    // Si hay mensaje inicial, crearlo
    if (initial_message && conversation) {
      await prisma.$executeRaw`
        INSERT INTO chat_messages (conversation_id, role, content, message_type, created_at)
        VALUES (${conversation.id}::uuid, 'assistant', ${initial_message}, 'text', NOW())
      `;
    }

    return NextResponse.json({
      success: true,
      data: {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          lastMessage: initial_message || '',
          timestamp: conversation.created_at,
          product_id: conversation.product_id,
        },
      },
    });
  } catch (error: any) {
    if (error?.message?.includes('does not exist') || error?.code === '42P01') {
      return NextResponse.json({ success: false, message: 'Conversations not available' }, { status: 503 });
    }
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { success: false, message: 'Error al crear conversación' },
      { status: 500 }
    );
  }
}

// PATCH /api/conversations - Renombrar conversación
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { id, title } = body;

    if (!id || !title) {
      return NextResponse.json({ success: false, message: 'ID y título son requeridos' }, { status: 400 });
    }

    // Verificar que la conversación pertenece al usuario
    const conversations = await prisma.$queryRaw<ConversationRow[]>`
      SELECT * FROM conversations 
      WHERE id = ${id}::uuid AND user_id = ${decoded.userId}::uuid
    `;

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ success: false, message: 'Conversación no encontrada' }, { status: 404 });
    }

    await prisma.$executeRaw`
      UPDATE conversations SET title = ${title}, updated_at = NOW()
      WHERE id = ${id}::uuid
    `;

    return NextResponse.json({
      success: true,
      data: { id, title },
    });
  } catch (error: any) {
    if (error?.message?.includes('does not exist') || error?.code === '42P01') {
      return NextResponse.json({ success: false, message: 'Conversations not available' }, { status: 503 });
    }
    console.error('Error renaming conversation:', error);
    return NextResponse.json(
      { success: false, message: 'Error al renombrar conversación' },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations - Eliminar conversación (archivar)
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('id');

    if (!conversationId) {
      return NextResponse.json({ success: false, message: 'ID de conversación requerido' }, { status: 400 });
    }

    // Verificar que la conversación pertenece al usuario
    const conversations = await prisma.$queryRaw<ConversationRow[]>`
      SELECT * FROM conversations 
      WHERE id = ${conversationId}::uuid AND user_id = ${decoded.userId}::uuid
    `;

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ success: false, message: 'Conversación no encontrada' }, { status: 404 });
    }

    // Archivar en lugar de eliminar
    await prisma.$executeRaw`
      UPDATE conversations SET is_archived = true, updated_at = NOW()
      WHERE id = ${conversationId}::uuid
    `;

    return NextResponse.json({ success: true, message: 'Conversación eliminada' });
  } catch (error: any) {
    if (error?.message?.includes('does not exist') || error?.code === '42P01') {
      return NextResponse.json({ success: false, message: 'Conversations not available' }, { status: 503 });
    }
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { success: false, message: 'Error al eliminar conversación' },
      { status: 500 }
    );
  }
}
