'use client';

import { ReactNode } from 'react';
import Image from 'next/image';
import { Spotlight } from '@/components/ui/spotlight-new';
import { ShineBorder } from '@/components/ui/shine-border';
import { MotionConfig, motion, type Variants } from 'framer-motion';
import { FiMoon, FiSun } from '@/lib/icons';
import { useThemeMode } from '@/hooks/useThemeMode';
import { applyAppTheme, startThemeTransition } from '@/lib/theme/theme-transition';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  showLogo?: boolean;
  sideContent?: ReactNode; // Optional custom content for the left side
  contentClassName?: string;
  wideContent?: boolean; // For steps that need more width (like pricing)
  showThemeToggle?: boolean;
}

export default function AuthLayout({ 
  children, 
  title, 
  subtitle, 
  showLogo = true,
  sideContent,
  contentClassName,
  wideContent = false,
  showThemeToggle = true
}: AuthLayoutProps) {
  const { themeMode, isDark } = useThemeMode();

  const toggleTheme = () => {
    const next = themeMode === 'dark' ? 'light' : 'dark';
    startThemeTransition(() => {
      applyAppTheme(next);
    });
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.25,
        ease: [0.16, 1, 0.3, 1],
        when: 'beforeChildren',
        staggerChildren: 0.06
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ type: 'spring', bounce: 0.12, visualDuration: 0.35 }}
    >
      <div className="h-[100dvh] bg-background text-foreground relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <Spotlight
            gradientFirst={
              isDark
                ? 'radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(210, 100%, 85%, .08) 0, hsla(210, 100%, 55%, .02) 50%, hsla(210, 100%, 45%, 0) 80%)'
                : 'radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(210, 100%, 55%, .12) 0, hsla(210, 100%, 55%, .05) 50%, hsla(210, 100%, 45%, 0) 80%)'
            }
            gradientSecond={
              isDark
                ? 'radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .06) 0, hsla(210, 100%, 55%, .02) 80%, transparent 100%)'
                : 'radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 55%, .10) 0, hsla(210, 100%, 55%, .04) 80%, transparent 100%)'
            }
            translateY={-250}
            width={460}
            height={1100}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />
          <div
            className={`absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full blur-3xl ${
              isDark ? 'bg-blue-500/10' : 'bg-blue-500/18'
            } mix-blend-multiply motion-safe:animate-[pulse_14s_ease-in-out_infinite] motion-reduce:animate-none`}
          />
          <div
            className={`absolute -top-24 -right-24 h-[420px] w-[420px] rounded-full blur-3xl ${
              isDark ? 'bg-purple-500/10' : 'bg-purple-500/18'
            } mix-blend-multiply motion-safe:animate-[pulse_16s_ease-in-out_infinite] motion-reduce:animate-none`}
          />
          <div
            className={`absolute -bottom-28 left-16 h-[420px] w-[420px] rounded-full blur-3xl ${
              isDark ? 'bg-emerald-500/10' : 'bg-emerald-500/16'
            } mix-blend-multiply motion-safe:animate-[pulse_18s_ease-in-out_infinite] motion-reduce:animate-none`}
          />
        </div>

        {showThemeToggle && (
          <div className="absolute top-4 right-4 z-20">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="h-9 w-9 rounded-full border border-border bg-background/70 text-foreground backdrop-blur-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              {isDark ? <FiSun className="h-4 w-4 mx-auto" /> : <FiMoon className="h-4 w-4 mx-auto" />}
            </button>
          </div>
        )}

        <div className="relative z-10 h-full overflow-y-auto overscroll-contain">
          <div className="min-h-full box-border flex items-start sm:items-center justify-center px-6 py-6 sm:py-10 [@media(max-height:740px)]:py-5">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className={`w-full ${wideContent ? 'max-w-[800px]' : 'max-w-[420px]'} ${contentClassName || ''}`}
            >
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card/80 backdrop-blur-sm shadow-xl p-6 sm:p-8">
                <ShineBorder shineColor={["#3B82F6", "#02AC47", "#3B82F6"]} duration={10} borderWidth={0.5} />

                <motion.div variants={itemVariants} className="text-center">
                  {showLogo && (
                    <div className="flex justify-center mb-4 sm:mb-6">
                      <Image
                        src="/images/Evolve.png"
                        alt="MindDash Logo"
                        width={64}
                        height={64}
                        className="object-contain"
                      />
                    </div>
                  )}

                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-2">
                    {title}
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    {subtitle}
                  </p>
                </motion.div>

                {sideContent && (
                  <motion.div variants={itemVariants} className="mt-5 sm:mt-6">
                    {sideContent}
                  </motion.div>
                )}

                <motion.div variants={itemVariants} className="mt-5 sm:mt-6">
                  {children}
                </motion.div>

                <motion.div variants={itemVariants} className="pt-4 sm:pt-6 text-center text-xs text-muted-foreground">
                  &copy; {new Date().getFullYear()} MindDash.
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}