// Utilidad para manejar el tema personalizado de Bayer
export const BAYER_USER_ID = 'fdbc7a27d1d4b7747192';

export const BAYER_COLORS = {
  // Arlequín Verde
  primary: '#56D500',
  primaryRgb: '86, 213, 0',
  
  // Azul de Prusia
  secondary: '#00314E',
  secondaryRgb: '0, 49, 78',
  
  // Capri
  accent: '#01BEFF',
  accentRgb: '1, 190, 255',
};

export const DEFAULT_COLORS = {
  primary: '#10b981', // Verde por defecto
  primaryRgb: '16, 185, 129',
  secondary: '#6366f1', // Índigo por defecto
  secondaryRgb: '99, 102, 241',
  accent: '#3b82f6', // Azul por defecto
  accentRgb: '59, 130, 246',
};

/**
 * Verifica si el usuario actual es el admin de Bayer
 */
export function isBayerAdmin(): boolean {
  try {
    const authData = localStorage.getItem('evolve-auth');
    if (!authData) return false;
    
    const auth = JSON.parse(authData);
    return auth.userId === BAYER_USER_ID;
  } catch (error) {
    console.error('Error verificando usuario Bayer:', error);
    return false;
  }
}

/**
 * Obtiene los colores del tema según el usuario
 */
export function getThemeColors() {
  return isBayerAdmin() ? BAYER_COLORS : DEFAULT_COLORS;
}

/**
 * Genera estilos CSS dinámicos para el usuario de Bayer
 */
export function getBayerDynamicStyles() {
  if (!isBayerAdmin()) return '';
  
  return `
    <style>
      /* Sobrescribir colores principales para el usuario Bayer */
      .bayer-primary-bg { background-color: ${BAYER_COLORS.primary} !important; }
      .bayer-primary-text { color: ${BAYER_COLORS.primary} !important; }
      .bayer-primary-border { border-color: ${BAYER_COLORS.primary} !important; }
      .bayer-primary-shadow { box-shadow: 0 0 20px rgba(${BAYER_COLORS.primaryRgb}, 0.3) !important; }
      
      .bayer-secondary-bg { background-color: ${BAYER_COLORS.secondary} !important; }
      .bayer-secondary-text { color: ${BAYER_COLORS.secondary} !important; }
      .bayer-secondary-border { border-color: ${BAYER_COLORS.secondary} !important; }
      
      .bayer-accent-bg { background-color: ${BAYER_COLORS.accent} !important; }
      .bayer-accent-text { color: ${BAYER_COLORS.accent} !important; }
      .bayer-accent-border { border-color: ${BAYER_COLORS.accent} !important; }
      
      /* Gradientes específicos para Bayer */
      .bayer-gradient-primary {
        background: linear-gradient(135deg, ${BAYER_COLORS.primary} 0%, ${BAYER_COLORS.accent} 100%) !important;
      }
      
      .bayer-gradient-secondary {
        background: linear-gradient(135deg, ${BAYER_COLORS.secondary} 0%, ${BAYER_COLORS.primary} 100%) !important;
      }
      
      .bayer-gradient-accent {
        background: linear-gradient(135deg, ${BAYER_COLORS.accent} 0%, ${BAYER_COLORS.secondary} 100%) !important;
      }
      
      /* Botones específicos para Bayer */
      .bayer-btn-primary {
        background: linear-gradient(135deg, ${BAYER_COLORS.primary} 0%, #4ade80 100%) !important;
        border: 1px solid ${BAYER_COLORS.primary} !important;
        color: ${BAYER_COLORS.secondary} !important;
        font-weight: 600 !important;
      }
      
      .bayer-btn-primary:hover {
        background: linear-gradient(135deg, #4ade80 0%, ${BAYER_COLORS.primary} 100%) !important;
        box-shadow: 0 4px 15px rgba(${BAYER_COLORS.primaryRgb}, 0.4) !important;
      }
      
      .bayer-btn-secondary {
        background: linear-gradient(135deg, ${BAYER_COLORS.secondary} 0%, #1e40af 100%) !important;
        border: 1px solid ${BAYER_COLORS.secondary} !important;
        color: white !important;
      }
      
      .bayer-btn-accent {
        background: linear-gradient(135deg, ${BAYER_COLORS.accent} 0%, #0ea5e9 100%) !important;
        border: 1px solid ${BAYER_COLORS.accent} !important;
        color: white !important;
      }
      
      /* Elementos específicos del panel admin */
      .bayer-card {
        border: 1px solid rgba(${BAYER_COLORS.primaryRgb}, 0.2) !important;
      }
    </style>
  `;
}

/**
 * Obtiene el logo apropiado según el usuario
 */
export function getLogoPath(): string {
  return isBayerAdmin() ? '/images/bayerLogo.png' : '/images/placeholder.svg';
}

/**
 * Genera clases CSS condicionales para Bayer
 * @param defaultClasses - Clases CSS por defecto
 * @param bayerClasses - Clases CSS específicas para Bayer
 * @param excludeBackground - Si es true, no aplicar cambios de fondo
 */
export function getBayerClasses(defaultClasses: string, bayerClasses: string, excludeBackground: boolean = false): string {
  if (excludeBackground && isBayerAdmin()) {
    // Si se excluyen fondos, mantener las clases por defecto pero permitir otros cambios
    return defaultClasses;
  }
  return isBayerAdmin() ? bayerClasses : defaultClasses;
}

