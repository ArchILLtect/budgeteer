import { useEffect, useState } from "react";
import {
  type ColorMode,
  getInitialColorMode,
  setColorMode,
  toggleColorMode,
} from "../services/colorMode";

export function useColorModeClass() {
  const [mode, setMode] = useState<ColorMode>(() => getInitialColorMode());

  useEffect(() => {
    setColorMode(mode);
  }, [mode]);

  return {
    mode,
    setMode,
    toggle: () => setMode((m) => toggleColorMode(m)),
  };
}
