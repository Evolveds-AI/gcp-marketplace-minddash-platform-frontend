import { NextRequest, NextResponse } from 'next/server';

// Archivo temporal - funcionalidad deshabilitada por errores de schema
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'Funcionalidad temporalmente deshabilitada por migración'
  }, { status: 501 });
}

export async function PUT(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'Funcionalidad temporalmente deshabilitada por migración'
  }, { status: 501 });
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: 'Funcionalidad temporalmente deshabilitada por migración'
  }, { status: 501 });
}