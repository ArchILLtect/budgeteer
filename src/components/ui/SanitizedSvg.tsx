import { Box, type BoxProps } from "@chakra-ui/react";
import DOMPurify from "dompurify";
import { useMemo } from "react";

export type SanitizedSvgProps = {
  svg: string;
  /** If the input is empty/null/undefined, render nothing. */
  allowEmpty?: boolean;
} & Omit<BoxProps, "children">;

const DEFAULT_MAX_LEN = 200_000;

/**
 * Renders an SVG string via dangerouslySetInnerHTML, after sanitizing it.
 *
 * This is intended for future user-imported SVGs (e.g. profile pictures).
 */
export function SanitizedSvg({ svg, allowEmpty = false, ...boxProps }: SanitizedSvgProps) {
  const sanitized = useMemo(() => {
    const raw = String(svg ?? "");
    if (!raw) return "";
    if (raw.length > DEFAULT_MAX_LEN) return "";

    return DOMPurify.sanitize(raw, {
      USE_PROFILES: { svg: true, svgFilters: true },
    });
  }, [svg]);

  if (!sanitized) return allowEmpty ? null : null;

  return <Box {...boxProps} dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
