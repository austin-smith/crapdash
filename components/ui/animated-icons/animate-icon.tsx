'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { Slot } from 'radix-ui';

interface AnimateIconContextValue {
  active: boolean;
}

const AnimateIconContext = createContext<AnimateIconContextValue | null>(null);

export function useAnimateIconContext() {
  return useContext(AnimateIconContext);
}

interface AnimateIconProps {
  children: React.ReactNode;
  asChild?: boolean;
  animateOnHover?: boolean;
}

export function AnimateIcon({ children, asChild, animateOnHover }: AnimateIconProps) {
  const [active, setActive] = useState(false);

  const handleMouseEnter = useCallback(() => {
    if (animateOnHover) {
      setActive(true);
    }
  }, [animateOnHover]);

  const handleMouseLeave = useCallback(() => {
    if (animateOnHover) {
      setActive(false);
    }
  }, [animateOnHover]);

  const Comp = asChild ? Slot.Root : 'span';

  return (
    <AnimateIconContext.Provider value={{ active }}>
      <Comp onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        {children}
      </Comp>
    </AnimateIconContext.Provider>
  );
}
