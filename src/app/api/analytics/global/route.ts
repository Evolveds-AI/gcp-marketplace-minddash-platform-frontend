export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 
  'https://backend-service-dev-minddash-294493969622.us-central1.run.app';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') || '7';
    
    // Para super_admin, obtener analytics globales en tiempo real
    // Como los endpoints del backend están fallando, usamos datos de ejemplo
    // TODO: Implementar llamada real cuando los endpoints del backend funcionen
    
    // Datos de ejemplo
    const mockData = {
      summary: {
        totalOrganizations: 1,
        totalUsers: 5,
        activeUsers: 4,
        suspendedUsers: 0,
        totalProjects: 15,
        totalChatbots: 8
      },
      orgsBreakdown: [
        {
          id: 'org-1',
          name: 'Evolve Backup',
          status: 'active',
          users: 5,
          projects: 15,
          chatbots: 8,
          admin: 'Evolve Admin'
        }
      ],
      usersByRole: {
        super_admin: 1,
        admin: 1,
        admin_client: 2,
        user: 1
      },
      recentActivity: {
        newUsersToday: 1,
        newOrgsToday: 0,
        activeSessions: 3,
        messagesToday: 50
      },
      trends: {
        usersGrowth: "+12.5%",
        orgsGrowth: "+8.3%",
        projectsGrowth: "+15.2%",
        chatbotsGrowth: "+18.7%"
      },
      systemHealth: {
        apiLatency: "45ms",
        databaseConnections: 12,
        serverLoad: "23%",
        uptime: "99.9%"
      }
    };
    
    return NextResponse.json({
      success: true,
      data: mockData
    });
  } catch (error) {
    console.error('Error fetching global analytics:', error);
    return NextResponse.json(
      { error: 'Error fetching global analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
