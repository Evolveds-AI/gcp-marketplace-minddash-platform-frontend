import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import prisma from '@/lib/database';

/**
 * POST /api/backend/projects/create
 * Crea un nuevo proyecto usando Prisma directamente
 * (Bypass del backend Python que tiene SP faltante)
 */
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

    // Verificar rol (case-insensitive)
    const userRole = decoded.role?.toLowerCase();
    const allowedRoles = ['admin', 'admin-client', 'super_admin'];
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      console.error('❌ Acceso denegado. Rol del usuario:', decoded.role);
      return NextResponse.json(
        { success: false, message: 'No tienes permisos para crear proyectos' },
        { status: 403 }
      );
    }
    
    console.log('✅ Usuario autorizado:', decoded.username, '- Rol:', decoded.role);

    const body = await request.json();
    const { organization_id, name, description, label, label_color } = body;

    // Validaciones
    if (!organization_id) {
      return NextResponse.json(
        { success: false, message: 'organization_id es requerido' },
        { status: 400 }
      );
    }

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'El nombre del proyecto es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la organización existe
    const organization = await prisma.organizations.findUnique({
      where: { id: organization_id }
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, message: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    // Crear proyecto en Prisma
    const newProject = await prisma.projects.create({
      data: {
        organization_id,
        name: name.trim(),
        description: description?.trim() || null,
        label: label?.trim() || null,
        label_color: label_color || null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      select: {
        id: true,
        organization_id: true,
        name: true,
        description: true,
        label: true,
        label_color: true,
        created_at: true,
        updated_at: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Proyecto creado exitosamente',
      project: {
        project_id: newProject.id,
        organization_id: newProject.organization_id,
        project_name: newProject.name,
        project_description: newProject.description,
        project_label: newProject.label,
        project_label_color: newProject.label_color,
        created_at: newProject.created_at,
        updated_at: newProject.updated_at,
      }
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al crear proyecto',
        error: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    );
  }
}
