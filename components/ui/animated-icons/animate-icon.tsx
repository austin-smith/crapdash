'use client';

import type { HTMLAttributes, MouseEvent, ReactNode } from 'react';
import { createContext, forwardRef, useCallback, useContext, useState } from 'react';
import { Slot } from 'radix-ui';

interface AnimateIconContextValue {
  active: boolean;
}

const AnimateIconContext = createContext<AnimateIconContextValue | null>(null);

export function useAnimateIconContext() {
  return useContext(AnimateIconContext);
}

interface AnimateIconProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  asChild?: boolean;
  animateOnHover?: boolean;
}

const AnimateIcon = forwardRef<HTMLElement, AnimateIconProps>(function AnimateIcon(
  { children, asChild, animateOnHover, onMouseEnter, onMouseLeave, ...props },
  ref
) {
  const [active, setActive] = useState(false);

  const handleMouseEnter = useCallback((event: MouseEvent<HTMLElement>) => {
    if (animateOnHover) {
      setActive(true);
    }

    onMouseEnter?.(event);
  }, [animateOnHover, onMouseEnter]);

  const handleMouseLeave = useCallback((event: MouseEvent<HTMLElement>) => {
    if (animateOnHover) {
      setActive(false);
    }

    onMouseLeave?.(event);
  }, [animateOnHover, onMouseLeave]);

  const Comp = asChild ? Slot.Root : 'span';

  return (
    <AnimateIconContext.Provider value={{ active }}>
      <Comp ref={ref} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} {...props}>
        {children}
      </Comp>
    </AnimateIconContext.Provider>
  );
});

export { AnimateIcon };
