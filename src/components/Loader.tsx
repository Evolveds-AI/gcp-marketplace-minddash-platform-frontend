'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface LoaderProps {
  loading: boolean;
  onTransitionComplete?: () => void;
}

const Loader: React.FC<LoaderProps> = ({ loading, onTransitionComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [transitionStage, setTransitionStage] = useState<'initial' | 'shrinking' | 'complete'>('initial');
  
  useEffect(() => {
    // Reproducir el video automáticamente cuando el componente se monte
    if (videoRef.current) {
      videoRef.current.play().catch(error => {
        console.error('Error al reproducir el video:', error);
      });
    }
    
    // Si loading cambia a false, comenzamos la animación de transición
    if (!loading && transitionStage === 'initial') {
      setTransitionStage('shrinking');
      
      // Notificamos inmediatamente que la transición está en curso
      // No marcamos como 'complete' para que el loader no desaparezca visualmente
      if (onTransitionComplete) {
        // Pequeño delay para asegurar que la animación es visible
        setTimeout(() => {
          onTransitionComplete();
        }, 500);
      }
    }
  }, [loading, transitionStage, onTransitionComplete]);
  
  // Nunca retornamos null para mantener la continuidad visual
  
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex items-center justify-center z-50 bg-[#000000] pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{
          opacity: transitionStage === 'shrinking' ? 0 : 1
        }}
        transition={{ 
          duration: 0.8,
          // Retraso para que el fondo se desvanezca solo después de que el video llegue a su posición
          delay: transitionStage === 'shrinking' ? 0.7 : 0
        }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{
            scale: transitionStage === 'shrinking' ? 0.1 : 1,
            opacity: 1, // Mantenemos la opacidad constante en 1 durante toda la animación
            x: transitionStage === 'shrinking' ? '-43vw' : 0,
            y: transitionStage === 'shrinking' ? '-45vh' : 0
          }}
          transition={{
            duration: transitionStage === 'shrinking' ? 0.7 : 0.5,
            ease: ['easeOut', 'easeIn', 'easeOut'], // Curva de velocidad más natural
            scale: { duration: transitionStage === 'shrinking' ? 0.7 : 0.5 }
          }}
          className="w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] md:w-[600px] md:h-[600px] flex items-center justify-center"
        >
            <video 
              ref={videoRef}
              className="w-full h-full object-contain"
              autoPlay 
              loop 
              muted 
              playsInline
              suppressHydrationWarning
            >
              <source src="https://res.cloudinary.com/dwgu8k7ba/video/upload/v1747668947/loader2_fk8hh2.mp4" type="video/mp4" />
              Tu navegador no soporta videos HTML5.
            </video>
          </motion.div>
        </motion.div>
    </AnimatePresence>
  );
};

export default Loader;
