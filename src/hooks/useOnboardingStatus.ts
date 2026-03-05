import { useState, useEffect } from 'react';

const ONBOARDING_KEY = 'minddash_onboarding_completed';

interface OnboardingStatus {
  hasCompleted: boolean;
  markCompleted: () => void;
  resetOnboarding: () => void;
}

/**
 * Hook para gestionar el estado del onboarding de primer ingreso
 * Usa localStorage para persistir el estado
 * TODO: Sincronizar con backend usando user metadata
 */
export function useOnboardingStatus(): OnboardingStatus {
  const [hasCompleted, setHasCompleted] = useState<boolean>(true); // Default true para evitar flash

  useEffect(() => {
    // Leer estado del localStorage al montar
    const completed = localStorage.getItem(ONBOARDING_KEY);
    setHasCompleted(completed === 'true');
  }, []);

  const markCompleted = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setHasCompleted(true);
    
    // TODO: Sincronizar con backend
    // await fetch('/api/user/onboarding', {
    //   method: 'POST',
    //   body: JSON.stringify({ completed: true })
    // });
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setHasCompleted(false);
  };

  return {
    hasCompleted,
    markCompleted,
    resetOnboarding
  };
}
