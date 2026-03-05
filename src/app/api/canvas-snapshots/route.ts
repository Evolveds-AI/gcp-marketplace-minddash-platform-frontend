import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database';
import { verifyAccessToken } from '@/lib/auth';
import { randomUUID } from 'crypto';

const APP_NAME = 'minddash_canvas_snapshots';

type SnapshotPayload = {
  name: string;
  data: any;
};

type StoredSnapshot = {
  id: string;
  name: string;
  createdAt: string;
  data: any;
};

type StoredState = Record<string, { snapshots: StoredSnapshot[] }>;

async function getUserState(userId: string): Promise<StoredState> {
  const rows = await prisma.$queryRaw<{ state: any }[]>`
    SELECT state
    FROM user_states
    WHERE app_name = ${APP_NAME} AND user_id = ${userId}
    LIMIT 1
  `;

  const raw = rows?.[0]?.state;
  if (!raw) return {};

  if (typeof raw === 'object') return raw as StoredState;

  try {
    return JSON.parse(raw) as StoredState;
  } catch {
    return {};
  }
}

async function upsertUserState(userId: string, state: StoredState): Promise<void> {
  const json = JSON.stringify(state);
  await prisma.$executeRaw`
    INSERT INTO user_states (app_name, user_id, state, update_time)
    VALUES (${APP_NAME}, ${userId}, ${json}::jsonb, NOW())
    ON CONFLICT (app_name, user_id)
    DO UPDATE SET state = ${json}::jsonb, update_time = NOW()
  `;
}

function getAuthUserId(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);
  return decoded?.userId || null;
}

export async function GET(request: NextRequest) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    if (!productId) {
      return NextResponse.json({ success: false, message: 'product_id requerido' }, { status: 400 });
    }

    const state = await getUserState(userId);
    const snapshots = state[productId]?.snapshots || [];

    return NextResponse.json({ success: true, data: { snapshots } });
  } catch (error) {
    console.error('Error fetching canvas snapshots:', error);
    return NextResponse.json({ success: false, message: 'Error al obtener snapshots' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }

    const body = (await request.json()) as { product_id?: string; snapshot?: SnapshotPayload };
    const productId = body.product_id;
    const snapshot = body.snapshot;

    if (!productId) {
      return NextResponse.json({ success: false, message: 'product_id requerido' }, { status: 400 });
    }
    if (!snapshot?.data) {
      return NextResponse.json({ success: false, message: 'snapshot.data requerido' }, { status: 400 });
    }
    if (!snapshot?.name || snapshot.name.trim() === '') {
      return NextResponse.json({ success: false, message: 'snapshot.name requerido' }, { status: 400 });
    }

    const state = await getUserState(userId);
    const prev = state[productId]?.snapshots || [];
    const normalizedName = snapshot.name.trim().toLowerCase();
    const duplicate = prev.some((s) => (s.name || '').trim().toLowerCase() === normalizedName);
    if (duplicate) {
      return NextResponse.json({ success: false, message: 'Ya existe una versión con ese nombre' }, { status: 409 });
    }

    const created: StoredSnapshot = {
      id: randomUUID(),
      name: snapshot.name.trim(),
      createdAt: new Date().toISOString(),
      data: snapshot.data,
    };
    const next = [created, ...prev].slice(0, 50);

    const updated: StoredState = {
      ...state,
      [productId]: { snapshots: next },
    };

    await upsertUserState(userId, updated);

    return NextResponse.json({ success: true, data: { snapshot: created } });
  } catch (error) {
    console.error('Error creating canvas snapshot:', error);
    return NextResponse.json({ success: false, message: 'Error al crear snapshot' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    const snapshotId = searchParams.get('snapshot_id');

    if (!productId) {
      return NextResponse.json({ success: false, message: 'product_id requerido' }, { status: 400 });
    }
    if (!snapshotId) {
      return NextResponse.json({ success: false, message: 'snapshot_id requerido' }, { status: 400 });
    }

    const state = await getUserState(userId);
    const prev = state[productId]?.snapshots || [];
    const next = prev.filter((s) => s.id !== snapshotId);

    const updated: StoredState = {
      ...state,
      [productId]: { snapshots: next },
    };

    await upsertUserState(userId, updated);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting canvas snapshot:', error);
    return NextResponse.json({ success: false, message: 'Error al eliminar snapshot' }, { status: 500 });
  }
}
