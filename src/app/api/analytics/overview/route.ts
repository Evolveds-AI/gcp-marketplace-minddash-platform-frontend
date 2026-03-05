export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 
  'https://backend-service-dev-minddash-294493969622.us-central1.run.app';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';
    
    // Para super_admin, obtener analytics globales
    // Como los endpoints del backend están fallando, usamos datos de ejemplo
    // TODO: Implementar llamada real cuando /organizations/getListOrganization funcione
    
    // Datos de ejemplo
    const mockData = {
      overview: {
        totalUsers: 5,
        activeUsers: 4,
        totalOrganizations: 1,
        totalProjects: 15,
        totalChatbots: 8,
        userGrowth: "+12.5%",
        orgGrowth: "+8.3%",
        projectGrowth: "+15.2%",
        chatbotGrowth: "+18.7%"
      },
      timeline: [
        { date: '2025-01-19', users: 3, organizations: 1, projects: 12, chatbots: 6 },
        { date: '2025-01-20', users: 4, organizations: 1, projects: 13, chatbots: 7 },
        { date: '2025-01-21', users: 5, organizations: 1, projects: 15, chatbots: 8 }
      ],
      topOrganizations: [
        { id: 'org-1', name: 'Evolve Backup', users: 5, projects: 15, chatbots: 8 }
      ],
      recentActivity: {
        newUsers: 1,
        newOrganizations: 0,
        newProjects: 2,
        activeToday: 3
      }
    };
    
    return NextResponse.json({
      success: true,
      data: mockData
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    return NextResponse.json(
      { error: 'Error fetching analytics overview', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
