'use client';

import { flushSync } from 'react-dom';

export type ThemeMode = 'light' | 'dark';

type AnimationVariant = 'circle';
type StartPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const STORAGE_KEY = 'minddash-theme';

let transitionInProgress = false;

function injectTransitionStyles({
  variant,
  start,
}: {
  variant: AnimationVariant;
  start: StartPosition;
}) {
  const styleId = `theme-transition-${Date.now()}`;
  const style = document.createElement('style');
  style.id = styleId;

  const positions: Record<StartPosition, string> = {
    center: 'center',
    'top-left': 'top left',
    'top-right': 'top right',
    'bottom-left': 'bottom left',
    'bottom-right': 'bottom right',
  };

  let css = '';

  if (variant === 'circle') {
    const cx = start === 'center' ? '50' : start.includes('left') ? '0' : '100';
    const cy = start === 'center' ? '50' : start.includes('top') ? '0' : '100';

    css = `
      @supports (view-transition-name: root) {
        ::view-transition-old(root) {
          animation: none;
        }
        ::view-transition-new(root) {
          animation: circle-expand 0.4s ease-out;
          transform-origin: ${positions[start]};
        }
        @keyframes circle-expand {
          from {
            clip-path: circle(0% at ${cx}% ${cy}%);
          }
          to {
            clip-path: circle(150% at ${cx}% ${cy}%);
          }
        }
      }
    `;
  }

  if (!css.trim()) return null;

  style.textContent = css;
  document.head.appendChild(style);

  return styleId;
}

function cleanupTransitionStyles(styleId: string | null) {
  if (!styleId) return;
  const styleEl = document.getElementById(styleId);
  if (styleEl) styleEl.remove();
}

export function applyAppTheme(mode: ThemeMode) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(STORAGE_KEY, mode);
  if (mode === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: mode } }));
}

export function startThemeTransition(
  updateFn: () => void,
  {
    variant = 'circle',
    start = 'center',
  }: {
    variant?: AnimationVariant;
    start?: StartPosition;
  } = {}
) {
  if (typeof document === 'undefined') {
    updateFn();
    return;
  }

  if (!('startViewTransition' in document)) {
    updateFn();
    return;
  }

  if (transitionInProgress) {
    updateFn();
    return;
  }

  transitionInProgress = true;
  const styleId = injectTransitionStyles({ variant, start });

  try {
    const viewTransition = (document as any).startViewTransition(() => {
      flushSync(() => {
        updateFn();
      });
    });

    const finished = viewTransition?.finished;
    if (finished && typeof finished.finally === 'function') {
      finished.finally(() => {
        transitionInProgress = false;
        cleanupTransitionStyles(styleId);
      });
    } else {
      transitionInProgress = false;
      setTimeout(() => cleanupTransitionStyles(styleId), 3000);
    }
  } catch {
    transitionInProgress = false;
    cleanupTransitionStyles(styleId);
    updateFn();
  }
}
