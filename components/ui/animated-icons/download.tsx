'use client';

import type { Variants } from 'motion/react';
import type { HTMLAttributes } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef, useEffect } from 'react';
import { motion, useAnimation } from 'motion/react';

import { cn } from '@/lib/utils';
import { useAnimateIconContext } from '@/components/ui/animated-icons/animate-icon';

export interface DownloadIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface DownloadIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const ARROW_VARIANTS: Variants = {
  normal: { y: 0 },
  animate: {
    y: 2,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 10,
      mass: 1,
    },
  },
};

const DownloadIcon = forwardRef<DownloadIconHandle, DownloadIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);
    const context = useAnimateIconContext();

    // Sync with AnimateIcon context so parent hovers can drive the animation
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <motion.g variants={ARROW_VARIANTS} initial="normal" animate={controls}>
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </motion.g>
        </svg>
      </div>
    );
  }
);

DownloadIcon.displayName = 'DownloadIcon';

export { DownloadIcon };
