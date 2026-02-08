import { Tooltip as ChakraTooltip, Portal } from "@chakra-ui/react"
import * as React from "react"

import type { Placement } from "@floating-ui/react-dom";

export interface TooltipProps extends ChakraTooltip.RootProps {
  p?: number | string
  bg?: string
  placement?: Placement
  rounded?: string | number
  // Legacy alias; prefer `bg`
  colorScheme?: string
  showArrow?: boolean
  portalled?: boolean
  portalRef?: React.RefObject<HTMLElement | null>
  content: React.ReactNode
  contentProps?: ChakraTooltip.ContentProps
  disabled?: boolean
}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  function Tooltip(props, ref) {
    const {
      p = 2,
      bg,
      placement = "bottom",
      rounded = "none",
      colorScheme,
      showArrow,
      children,
      disabled,
      portalled = true,
      content,
      contentProps,
      portalRef,
      positioning: positioningProp,
      ...rest
    } = props

    if (disabled) return children

    const tooltipBg = bg ?? colorScheme
    const finalBg = (contentProps?.bg ?? tooltipBg ?? "gray.900") as unknown as string;

    const positioning = { ...(positioningProp ?? {}), placement };

    const mergedCss = {
      ...((contentProps?.css as Record<string, unknown> | undefined) ?? {}),
      "--tooltip-bg": finalBg,
    } as unknown as ChakraTooltip.ContentProps["css"];

    return (
      <ChakraTooltip.Root {...rest} positioning={positioning}>
        <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
        <Portal disabled={!portalled} container={portalRef}>
          <ChakraTooltip.Positioner>
            <ChakraTooltip.Content
              ref={ref}
              {...contentProps}
              css={mergedCss}
              bg={finalBg}
              color={contentProps?.color ?? "white"}
              p={contentProps?.p ?? p}
              rounded={contentProps?.rounded ?? rounded}
            >
              {showArrow && (
                <ChakraTooltip.Arrow>
                  <ChakraTooltip.ArrowTip />
                </ChakraTooltip.Arrow>
              )}
              {content}
            </ChakraTooltip.Content>
          </ChakraTooltip.Positioner>
        </Portal>
      </ChakraTooltip.Root>
    )
  },
)

Tooltip.displayName = "Tooltip";
