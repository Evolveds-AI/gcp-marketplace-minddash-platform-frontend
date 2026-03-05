"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface ShineBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Width of the border in pixels
   * @default 1
   */
  borderWidth?: number
  /**
   * Duration of the animation in seconds
   * @default 14
   */
  duration?: number
  /**
   * Color of the border, can be a single color or an array of colors
   * @default "#000000"
   */
  shineColor?: string | string[]
}

/**
 * Shine Border
 *
 * An animated background border effect component with configurable properties.
 */
export function ShineBorder({
  borderWidth = 1,
  duration = 14,
  shineColor = ["#00A5CF", "#25A18E", "#9FFFCB"],
  className,
  style,
  ...props
}: ShineBorderProps) {
  const borderRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const node = borderRef.current
    if (!node) return

    let frameId: number
    const durationMs = duration * 1000

    const start = performance.now()

    const loop = (time: number) => {
      const elapsed = (time - start) % durationMs
      const progress = elapsed / durationMs // 0..1

      let position: number
      if (progress < 0.5) {
        const t = progress * 2
        position = t * 100
      } else {
        const t = (progress - 0.5) * 2
        position = (1 - t) * 100
      }

      node.style.backgroundPosition = `${position}% ${position}%`
      frameId = requestAnimationFrame(loop)
    }

    frameId = requestAnimationFrame(loop)

    return () => {
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [duration])

  return (
    <div
      ref={borderRef}
      style={
        {
          "--border-width": `${borderWidth}px`,
          "--duration": `${duration}s`,
          backgroundImage: `radial-gradient(transparent,transparent, ${
            Array.isArray(shineColor) ? shineColor.join(",") : shineColor
          },transparent,transparent)`,
          backgroundSize: "300% 300%",
          mask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "var(--border-width)",
          ...style,
        } as React.CSSProperties
      }
      className={cn(
        "pointer-events-none absolute inset-0 size-full rounded-[inherit] will-change-[background-position] shine-border-anim",
        className
      )}
      {...props}
    />
  )
}
