import { createContext, useContext, type ReactNode } from "react";

const E2EModeContext = createContext(false);

export function E2EModeProvider({
  value,
  children,
}: {
  value: boolean;
  children: ReactNode;
}) {
  return (
    <E2EModeContext.Provider value={value}>{children}</E2EModeContext.Provider>
  );
}

export function useE2EMode() {
  return useContext(E2EModeContext);
}
