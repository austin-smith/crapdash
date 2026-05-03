'use client';

import type { Variants } from 'motion/react';
import type { HTMLAttributes } from 'react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { motion, useAnimation } from 'motion/react';

import { useAnimateIconContext } from '@/components/ui/animated-icons/animate-icon';
import { cn } from '@/lib/utils';

export interface BrushCleaningIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface BrushCleaningIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const BRUSH_VARIANTS: Variants = {
  normal: {
    rotate: 0,
    transition: { duration: 0.6, ease: 'easeInOut' },
  },
  animate: {
    rotate: [0, -10, 10, 0],
    transformOrigin: 'top center',
    transition: { duration: 0.6, ease: 'easeInOut' },
  },
};

const BrushCleaningIcon = forwardRef<BrushCleaningIconHandle, BrushCleaningIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);
    const context = useAnimateIconContext();

    useEffect(() => {
      if (context) {
        if (context.active) {
          controls.start('animate');
        } else {
          controls.start('normal');
        }
      }
    }, [context, context?.active, controls]);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate');
        } else {
          onMouseEnter?.(e);
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal');
        } else {
          onMouseLeave?.(e);
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={BRUSH_VARIANTS}
          initial="normal"
          animate={controls}
        >
          <path d="m16 22-1-4" />
          <path d="M19 13.99a1 1 0 0 0 1-1V12a2 2 0 0 0-2-2h-3a1 1 0 0 1-1-1V4a2 2 0 0 0-4 0v5a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2v.99a1 1 0 0 0 1 1" />
          <path d="M5 14h14l1.973 6.767A1 1 0 0 1 20 22H4a1 1 0 0 1-.973-1.233z" />
          <path d="m8 22 1-4" />
        </motion.svg>
      </div>
    );
  }
);

BrushCleaningIcon.displayName = 'BrushCleaningIcon';

export { BrushCleaningIcon };
