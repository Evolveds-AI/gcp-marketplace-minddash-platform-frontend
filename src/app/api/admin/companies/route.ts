import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    // Obtener todos los clientes (empresas) con sus relaciones
    const clients = await prisma.clients.findMany({
      select: {
        id: true,
        nombre: true,
        description: true,
        created_at: true,
        updated_at: true,
        access_user_client: {
          select: {
            users: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        }
      },
      take: limit,
      orderBy: {
        created_at: 'desc'
      }
    });

    // Transformar datos para el frontend (formato esperado por AdminPanel)
    const transformedClients = clients.map(client => ({
      id: client.id,
      nombre: client.nombre,
      descripcion: client.description || '',
      created_at: client.created_at?.toISOString() || new Date().toISOString(),
      updated_at: client.updated_at?.toISOString() || new Date().toISOString(),
      usersCount: client.access_user_client?.length || 0
    }));
    
    return NextResponse.json({
      success: true,
      data: transformedClients
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Error fetching clients', details: error instanceof Error ? error.message : 'Unknown error' },
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

    // Solo super_admin puede crear clientes
    const userRole = (decoded.role || '').toLowerCase();
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { success: false, message: 'Acceso denegado. Solo super administradores.' },
        { status: 403 }
      );
    }

    const { nombre, description } = await request.json();

    // Validaciones básicas
    if (!nombre) {
      return NextResponse.json(
        { success: false, message: 'El nombre del cliente es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el nombre no exista
    const existingClient = await prisma.clients.findFirst({
      where: {
        nombre: {
          equals: nombre,
          mode: 'insensitive'
        }
      }
    });

    if (existingClient) {
      return NextResponse.json(
        { success: false, message: 'Ya existe un cliente con ese nombre' },
        { status: 400 }
      );
    }

    // Crear el cliente
    const newClient = await prisma.clients.create({
      data: {
        id: uuidv4(),
        nombre: nombre,
        description: description || null,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: {
        id: newClient.id,
        nombre: newClient.nombre,
        descripcion: newClient.description,
        created_at: newClient.created_at?.toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Error creating client', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
