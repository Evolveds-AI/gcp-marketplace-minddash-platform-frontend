'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Joyride, { Step, CallBackProps, STATUS, EVENTS } from 'react-joyride';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface OnboardingTourProps {
  run: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

// Extender el tipo Step para incluir propiedades personalizadas
interface CustomStep extends Step {
  disableBack?: boolean;
}

// Estilos personalizados que mantienen la paleta oscura de la plataforma
const customStyles = {
  options: {
    arrowColor: '#1f1f1f',
    backgroundColor: '#1f1f1f',
    overlayColor: 'rgba(0, 0, 0, 0.7)',
    primaryColor: '#3b82f6',
    textColor: '#e5e7eb',
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: '12px',
    padding: 0,
  },
  tooltipContainer: {
    textAlign: 'left' as const,
  },
  buttonNext: {
    display: 'none',
  },
  buttonBack: {
    display: 'none',
  },
  buttonSkip: {
    display: 'none',
  },
};

// Componente personalizado para el tooltip con animaciones
const CustomTooltip = ({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  isLastStep,
  size,
}: any) => {
  // Verificar si el paso actual requiere interacción (spotlightClicks)
  const requiresClick = step.spotlightClicks === true;
  // Verificar si el paso deshabilita el botón Anterior
  const disableBack = step.disableBack === true;

  return (
    <AnimatePresence>
      <motion.div
        {...tooltipProps}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-minddash-card border border-minddash-border rounded-xl shadow-2xl p-6 max-w-md"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex gap-1">
                {Array.from({ length: size }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === index
                        ? 'w-8 bg-blue-500'
                        : i < index
                        ? 'w-1.5 bg-blue-500/50'
                        : 'w-1.5 bg-gray-700'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400">
                {index + 1} de {size}
              </span>
            </div>
            {step.title && (
              <h3 className="text-lg font-semibold text-white">
                {step.title}
              </h3>
            )}
          </div>
          <button
            {...closeProps}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {step.content && (
          <div className="text-gray-300 text-sm mb-6 leading-relaxed">
            {step.content}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {index > 0 && !requiresClick && !isLastStep && !disableBack && (
              <Button
                {...backProps}
                variant="outline"
                size="sm"
                className="gap-1 border-gray-700 hover:bg-gray-800"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {!isLastStep && (
              <Button
                {...skipProps}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                Saltar tour
              </Button>
            )}
            {/* Solo mostrar botón Siguiente si NO requiere click */}
            {!requiresClick && (
              <Button
                {...primaryProps}
                size="sm"
                className="gap-1 bg-blue-600 hover:bg-blue-700"
              >
                {isLastStep ? (
                  <>
                    <Check className="w-4 h-4" />
                    Finalizar
                  </>
                ) : (
                  <>
                    Siguiente
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default function OnboardingTour({ run, onComplete, onSkip }: OnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [tourRun, setTourRun] = useState(run);
  const pathname = usePathname();
  const [previousPath, setPreviousPath] = useState(pathname);


  // Sincronizar el estado del tour con la prop run
  useEffect(() => {
    if (run && !tourRun) {
      // Reiniciar el tour desde el principio
      setStepIndex(0);
      setTourRun(true);
    } else if (!run && tourRun) {
      setTourRun(false);
    }
  }, [run, tourRun]);

  // Limpiar beacons y elementos de Joyride cuando el tour se detiene
  useEffect(() => {
    const cleanupJoyride = () => {
      // Beacons
      document.querySelectorAll('.react-joyride__beacon').forEach(el => el.remove());
      
      // Overlays
      document.querySelectorAll('.react-joyride__overlay').forEach(el => el.remove());
      
      // Spotlights
      document.querySelectorAll('.react-joyride__spotlight').forEach(el => el.remove());
      
      // Tooltips
      document.querySelectorAll('.react-joyride__tooltip').forEach(el => el.remove());
      
      // Contenedores flotantes
      document.querySelectorAll('[data-floating-ui-portal]').forEach(el => {
        if (el.querySelector('.react-joyride__tooltip')) {
          el.remove();
        }
      });
    };

    if (!tourRun) {
      // Ejecutar limpieza múltiples veces para asegurar que todo se elimine
      const timeoutId1 = setTimeout(cleanupJoyride, 100);
      const timeoutId2 = setTimeout(cleanupJoyride, 300);
      const timeoutId3 = setTimeout(cleanupJoyride, 500);
      const timeoutId4 = setTimeout(cleanupJoyride, 1000);
      
      return () => {
        clearTimeout(timeoutId1);
        clearTimeout(timeoutId2);
        clearTimeout(timeoutId3);
        clearTimeout(timeoutId4);
      };
    }

    // Si el tour está corriendo, observar y eliminar beacons que aparezcan
    if (tourRun) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              // Eliminar beacons que aparezcan dinámicamente
              if (node.classList?.contains('react-joyride__beacon')) {
                node.remove();
              }
              // También revisar dentro del nodo agregado
              node.querySelectorAll?.('.react-joyride__beacon').forEach(beacon => beacon.remove());
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      return () => {
        observer.disconnect();
      };
    }
  }, [tourRun]);

  // Detectar cuando el usuario navega y esperar a que el DOM esté listo
  useEffect(() => {
    if (!tourRun) return; // Solo ejecutar si el tour está activo
    
    if (pathname !== previousPath) {
      setPreviousPath(pathname);
      
      // Función para esperar a que un elemento exista en el DOM y los datos estén cargados
      const waitForElement = (selector: string, callback: () => void, maxAttempts = 30, interval = 300) => {
        let attempts = 0;
        const checkElement = () => {
          attempts++;
          const element = document.querySelector(selector);
          
          // Verificar que el elemento existe
          if (element) {
            // Esperar un poco más para asegurar que los datos estén renderizados
            // Verificar que no haya spinners de carga visibles
            const loadingSpinner = document.querySelector('[role="status"], .animate-spin, .loading');
            
            if (!loadingSpinner) {
              // Dar un pequeño delay adicional para asegurar renderizado completo
              setTimeout(() => {
                callback();
              }, 400);
            } else if (attempts < maxAttempts) {
              setTimeout(checkElement, interval);
            }
          } else if (attempts < maxAttempts) {
            setTimeout(checkElement, interval); 
          }
        };
        checkElement();
      };
      
      // Si estamos en el paso 3 (Click en Organizaciones) y navegamos a /organizations
      if (stepIndex === 3 && pathname.includes('/organizations') && !pathname.includes('/projects')) {
        waitForElement('[data-tour="create-organization"], [data-tour="organization-card"]', () => {
          setStepIndex(4);
        });
      }
      
      // Si estamos en el paso 5 (Seleccionar org) y navegamos a /projects
      if (stepIndex === 5 && pathname.includes('/projects') && !pathname.includes('/chatbots')) {
        waitForElement('[data-tour="create-project"], [data-tour="project-card"]', () => {
          setStepIndex(6);
        });
      }
      
      // Si estamos en el paso 7 (Seleccionar proyecto) y navegamos a /chatbots
      if (stepIndex === 7 && pathname.includes('/chatbots')) {
        waitForElement('[data-tour="create-chatbot"], [data-tour="chatbot-card"]', () => {
          setStepIndex(8);
        });
      }
      
      // Si estamos en el paso 9 (Seleccionar chatbot) y navegamos al detalle del chatbot
      // La URL del detalle contiene: /chatbots/[chatbotId] (con UUID)
      if (stepIndex === 9 && pathname.match(/\/chatbots\/[a-f0-9-]{36}/i)) {
        // Esperar un poco para que la página cargue
        setTimeout(() => {
          setStepIndex(10);
        }, 800);
      }
    }
  }, [pathname, stepIndex, previousPath, tourRun]);

  // Definir los pasos del tour
  const steps: CustomStep[] = [
    {
      target: 'body',
      content: (
        <div>
          <p className="mb-3">
            ¡Bienvenido al panel de administración de MindDash! 👋
          </p>
          <p className="text-sm text-gray-400">
            Te guiaremos paso a paso para que entiendas cómo funciona la plataforma.
            Puedes saltar este tour en cualquier momento.
          </p>
        </div>
      ),
      title: '¡Bienvenido!',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="dashboard-menu"]',
      content: 'Este es el menú principal. Desde aquí accedes a todas las secciones de la plataforma.',
      title: 'Menú de navegación',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '[data-tour="organizations-menu"]',
      content: (
        <div>
          <p className="mb-2">
            <strong>Organizaciones</strong> son el nivel más alto de la jerarquía.
          </p>
          <p className="text-sm text-gray-400 mb-2">
            Representan empresas o clientes. Cada organización puede tener múltiples proyectos.
          </p>
          <p className="text-sm text-blue-400">
            👉 Haz clic en "Siguiente"
          </p>
        </div>
      ),
      title: 'Paso 1: Organizaciones',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '[data-tour="organizations-menu"]',
      content: (
        <div>
          <p className="mb-3 text-center">
            <span className="text-4xl">👈</span>
          </p>
          <p className="mb-2 font-semibold">
            Ahora haz clic en este recuadro
          </p>
          <p className="text-sm text-gray-400">
            Te llevaremos a la página de organizaciones...
          </p>
        </div>
      ),
      title: 'Navegar a Organizaciones',
      placement: 'right',
      spotlightClicks: true,
      disableBeacon: true,
      disableBack: true,
    },
    {
      target: '[data-tour="create-organization"]',
      content: (
        <div>
          <p className="mb-2">
            Si no tienes organizaciones, créalas desde este botón.
          </p>
          <p className="text-sm text-gray-400">
            Una organización agrupa todos los proyectos y chatbots de un cliente.
          </p>
        </div>
      ),
      title: 'Crear organización',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="organization-card"]',
      content: (
        <div>
          <p className="mb-2">
            Cada tarjeta representa una organización.
          </p>
          <p className="text-sm text-gray-400 mb-2">
            Haz clic en una organización para ver sus proyectos.
          </p>
          <p className="text-sm text-blue-400">
            👇 Selecciona una organización para continuar
          </p>
        </div>
      ),
      title: 'Seleccionar organización',
      placement: 'top',
      spotlightClicks: true,
      disableBeacon: true,
      disableBack: true,
    },
    {
      target: '[data-tour="create-project"]',
      content: (
        <div>
          <p className="mb-2">
            <strong>Proyectos</strong> son contenedores de chatbots dentro de una organización.
          </p>
          <p className="text-sm text-gray-400">
            Si no tienes proyectos, créalos desde este botón.
          </p>
        </div>
      ),
      title: 'Paso 2: Proyectos',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="project-card"]',
      content: (
        <div>
          <p className="mb-2">
            Los proyectos agrupan chatbots relacionados.
          </p>
          <p className="text-sm text-gray-400 mb-2">
            Por ejemplo: "Ventas", "Soporte", "Marketing".
          </p>
          <p className="text-sm text-blue-400">
            👇 Haz clic en un proyecto para ver sus chatbots
          </p>
        </div>
      ),
      title: 'Seleccionar proyecto',
      placement: 'top',
      spotlightClicks: true,
      disableBeacon: true,
      disableBack: true,
    },
    {
      target: '[data-tour="create-chatbot"]',
      content: (
        <div>
          <p className="mb-2">
            <strong>Chatbots (Productos)</strong> son los asistentes virtuales que crearás.
          </p>
          <p className="text-sm text-gray-400">
            Si no tienes chatbots, créalos desde este botón.
          </p>
        </div>
      ),
      title: 'Paso 3: Chatbots',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="chatbot-card"]',
      content: (
        <div>
          <p className="mb-2">
            Cada chatbot tiene su propia configuración, prompts, permisos y métricas.
          </p>
          <p className="text-sm text-blue-400">
            👇 Haz clic en un chatbot para configurarlo
          </p>
        </div>
      ),
      title: 'Seleccionar chatbot',
      placement: 'top',
      spotlightClicks: true,
      disableBeacon: true,
      disableBack: true,
    },
    {
      target: 'body',
      content: (
        <div>
          <p className="mb-3 text-lg">
            ¡Perfecto! Has completado el tour 🎉
          </p>
          <p className="mb-4 text-sm text-gray-300">
            Ya entiendes cómo navegar por la plataforma:
          </p>
          <div className="text-sm text-gray-300 space-y-2 mb-4 bg-gray-800/50 rounded-lg p-4">
            <p><strong className="text-blue-400">Organizaciones</strong> → Clientes/Empresas</p>
            <p><strong className="text-green-400">Proyectos</strong> → Grupos de chatbots relacionados</p>
            <p><strong className="text-purple-400">Chatbots</strong> → Asistentes virtuales configurables</p>
          </div>
          <p className="mb-3 text-sm">
            <strong>En la página de cada chatbot encontrarás:</strong>
          </p>
          <ul className="text-xs text-gray-400 space-y-1 mb-4 list-disc list-inside">
            <li><strong className="text-white">General:</strong> Configuración básica y detalles</li>
            <li><strong className="text-white">Prompt:</strong> Define el comportamiento del chatbot</li>
            <li><strong className="text-white">Permisos:</strong> Gestiona quién tiene acceso</li>
            <li><strong className="text-white">Conexiones:</strong> Configura fuentes de datos</li>
            <li><strong className="text-white">Métricas:</strong> KPIs y métricas de negocio</li>
            <li><strong className="text-white">Data Access:</strong> Control de acceso granular (RLS/CLS)</li>
            <li>Y más...</li>
          </ul>
          <p className="text-xs text-gray-500 text-center">
            💡 Puedes volver a ver este tour desde el botón de "Ayuda" en cualquier momento
          </p>
        </div>
      ),
      title: '¡Tour Completado!',
      placement: 'center',
      disableBeacon: true,
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index, action, lifecycle } = data;

    // Detectar cuando el target no se encuentra (el usuario navegó)
    if (type === EVENTS.TARGET_NOT_FOUND) {
      return;
    }

    // Si estamos en un paso con spotlightClicks y el usuario hace clic
    if (lifecycle === 'complete' && steps[index]?.spotlightClicks) {
      return;
    }

    // Actualizar índice del paso
    if (type === EVENTS.STEP_AFTER) {
      setStepIndex(index + (action === 'prev' ? -1 : 1));
    }

    // Manejar finalización o cierre
    if (status === STATUS.FINISHED) {
      setTourRun(false);
      cleanupAllJoyrideElements();
      onComplete();
    } else if (status === STATUS.SKIPPED) {
      setTourRun(false);
      cleanupAllJoyrideElements();
      onSkip();
    }
  };

  // Función helper para limpiar todos los elementos de Joyride
  const cleanupAllJoyrideElements = () => {
    document.querySelectorAll('.react-joyride__beacon').forEach(el => el.remove());
    document.querySelectorAll('.react-joyride__overlay').forEach(el => el.remove());
    document.querySelectorAll('.react-joyride__spotlight').forEach(el => el.remove());
    document.querySelectorAll('.react-joyride__tooltip').forEach(el => el.remove());
    document.querySelectorAll('[data-floating-ui-portal]').forEach(el => {
      if (el.querySelector('.react-joyride__tooltip')) {
        el.remove();
      }
    });
    
    // Limpiar nuevamente después de un delay para elementos que aparecen tarde
    setTimeout(() => {
      document.querySelectorAll('.react-joyride__beacon').forEach(el => el.remove());
      document.querySelectorAll('.react-joyride__overlay').forEach(el => el.remove());
      document.querySelectorAll('.react-joyride__spotlight').forEach(el => el.remove());
    }, 200);
  };

  return (
    <Joyride
      steps={steps}
      run={tourRun}
      continuous
      showProgress={false}
      showSkipButton={true}
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      styles={customStyles}
      tooltipComponent={CustomTooltip}
      disableOverlayClose
      disableCloseOnEsc={false}
      spotlightPadding={8}
      floaterProps={{
        disableAnimation: false,
      }}
      locale={{
        back: 'Anterior',
        close: 'Cerrar',
        last: 'Finalizar',
        next: 'Siguiente',
        skip: 'Saltar',
      }}
    />
  );
}
