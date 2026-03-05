'use client';

import { motion } from 'framer-motion';
import { Spotlight } from '@/components/ui/spotlight-new';
import Image from 'next/image';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fondo Spotlight */}
      <Spotlight
        gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(210, 100%, 85%, .06) 0, hsla(210, 100%, 55%, .02) 50%, hsla(210, 100%, 45%, 0) 80%)"
        gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .04) 0, hsla(210, 100%, 55%, .02) 80%, transparent 100%)"
        gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .03) 0, hsla(210, 100%, 45%, .01) 80%, transparent 100%)"
        translateY={-250}
        width={400}
        height={1000}
        smallWidth={180}
        duration={8}
        xOffset={80}
      />

      <div className="w-full max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
            {subtitle && (
              <p className="text-gray-400">{subtitle}</p>
            )}
          </div>

          {/* Content */}
          {children}

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400">
              ¿Necesitas ayuda?{' '}
              <a href="mailto:soporte@chatbot.com" className="text-blue-400 hover:text-blue-300">
                Contacta soporte
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};