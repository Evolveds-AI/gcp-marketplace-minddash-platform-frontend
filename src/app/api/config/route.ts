import { NextResponse } from 'next/server';

/**
 * GET /api/config
 * Runtime configuration endpoint.
 * Returns environment-specific values that NEXT_PUBLIC_* variables
 * would normally bake at build time.
 *
 * This allows the same build artifact to work across environments
 * (local, dev Cloud Run, production) without rebuilding.
 */
export async function GET() {
  return NextResponse.json({
    backendApiUrl: process.env.NEXT_PUBLIC_BACKEND_API_URL || '',
    dashboardsApiUrl: process.env.NEXT_PUBLIC_DASHBOARDS_API_URL || '',
    ragApiUrl: process.env.NEXT_PUBLIC_RAG_API_URL || '',
    mindsdbServerUrl: process.env.NEXT_PUBLIC_MINDSDB_SERVER_URL || '',
    environment: process.env.NODE_ENV || 'development',
  });
}
