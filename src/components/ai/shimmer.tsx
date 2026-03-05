"use client";

import { motion } from "motion/react";
import type { CSSProperties, ElementType, JSX } from "react";
import { memo, useMemo } from "react";

import { cn } from "@/lib/utils";

export interface ShimmerProps {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
}

const ShimmerComponent = ({
  children,
  as: Component = "span",
  className,
  duration = 2,
  spread = 2,
}: ShimmerProps) => {
  const MotionComponent = motion.create(Component as keyof JSX.IntrinsicElements);

  const dynamicSpread = useMemo(() => (children?.length ?? 0) * spread, [children, spread]);

  return (
    <MotionComponent
      className={cn(
        "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
        "[--base-color:hsl(var(--muted-foreground))] [--shimmer-color:hsl(var(--foreground))]",
        "[background-repeat:no-repeat,padding-box]",
        "[--shimmer-bg:linear-gradient(90deg,transparent_calc(50%-var(--spread)),var(--shimmer-color),transparent_calc(50%+var(--spread)))]",
        className
      )}
      style={
        {
          "--spread": `${dynamicSpread}px`,
          backgroundImage: "var(--shimmer-bg), linear-gradient(var(--base-color), var(--base-color))",
        } as CSSProperties
      }
      initial={{
        backgroundPosition: "100% center",
        opacity: 0,
      }}
      animate={{
        backgroundPosition: "0% center",
        opacity: 1,
      }}
      transition={{
        backgroundPosition: {
          repeat: Number.POSITIVE_INFINITY,
          duration,
          repeatDelay: 0.5,
          ease: "linear",
        },
        opacity: {
          duration: 0.3,
        },
      }}
    >
      {children}
    </MotionComponent>
  );
};

export const Shimmer = memo(ShimmerComponent);
