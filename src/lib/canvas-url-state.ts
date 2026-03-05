/**
 * Canvas URL State Management
 * Enables deep links with filter state for sharing analytics views
 */

import { DatePreset } from '@/components/canvas/GlobalFilters';

export interface CanvasUrlState {
  datePreset?: DatePreset;
  dateFrom?: string;
  dateTo?: string;
  charts?: string[]; // Chart IDs to display
}

const STATE_PARAM = 'canvas';

/**
 * Encode canvas state to URL-safe base64
 */
export function encodeCanvasState(state: CanvasUrlState): string {
  const json = JSON.stringify(state);
  // Use base64url encoding (URL-safe)
  return btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decode canvas state from URL parameter
 */
export function decodeCanvasState(encoded: string): CanvasUrlState | null {
  try {
    // Restore base64 padding and characters
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Get current URL with canvas state
 */
export function getShareableUrl(state: CanvasUrlState): string {
  const url = new URL(window.location.href);
  const encoded = encodeCanvasState(state);
  url.searchParams.set(STATE_PARAM, encoded);
  return url.toString();
}

/**
 * Read canvas state from current URL
 */
export function readUrlState(): CanvasUrlState | null {
  if (typeof window === 'undefined') return null;
  
  const url = new URL(window.location.href);
  const encoded = url.searchParams.get(STATE_PARAM);
  
  if (!encoded) return null;
  return decodeCanvasState(encoded);
}

/**
 * Update URL without page reload
 */
export function updateUrlState(state: CanvasUrlState): void {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  const encoded = encodeCanvasState(state);
  url.searchParams.set(STATE_PARAM, encoded);
  
  window.history.replaceState({}, '', url.toString());
}

/**
 * Clear canvas state from URL
 */
export function clearUrlState(): void {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  url.searchParams.delete(STATE_PARAM);
  
  window.history.replaceState({}, '', url.toString());
}

/**
 * Copy shareable URL to clipboard
 */
export async function copyShareableUrl(state: CanvasUrlState): Promise<boolean> {
  try {
    const url = getShareableUrl(state);
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
