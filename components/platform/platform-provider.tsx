'use client';

import { createContext, useContext } from "react";
import { MODIFIER_CTRL, type ModifierPlatform } from "@/lib/platform";

const PlatformContext = createContext<ModifierPlatform>(MODIFIER_CTRL);

export function PlatformProvider({
  value,
  children,
}: {
  value: ModifierPlatform;
  children: React.ReactNode;
}) {
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatformDefault() {
  return useContext(PlatformContext);
}

