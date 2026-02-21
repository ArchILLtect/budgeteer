import { Box, Tooltip as ChakraTooltip, Portal } from "@chakra-ui/react"
import * as React from "react"

import type { Placement } from "@floating-ui/react-dom";

export interface TooltipProps extends ChakraTooltip.RootProps {
  p?: ChakraTooltip.ContentProps["p"]
  bg?: ChakraTooltip.ContentProps["bg"]
  placement?: Placement
  rounded?: ChakraTooltip.ContentProps["rounded"]
  // Legacy alias; prefer `bg`
  colorScheme?: ChakraTooltip.ContentProps["bg"]
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

    const childArray = React.Children.toArray(children)
    const onlyChild = childArray.length === 1 ? childArray[0] : null
    const isSingleValidElement = onlyChild != null && React.isValidElement(onlyChild)
    // Chakra/Ark will pass `data-scope`/`data-part` props to the child.
    // React.Fragment cannot receive arbitrary props, so wrap it.
    const isFragment = isSingleValidElement && onlyChild.type === React.Fragment
    const canUseAsChildDirectly = isSingleValidElement && !isFragment

    const triggerChild = canUseAsChildDirectly ? (
      (onlyChild as React.ReactElement)
    ) : (
      <Box as="span" display="inline-flex" alignItems="center">
        {children}
      </Box>
    )

    const tooltipBg = bg ?? colorScheme
    const finalBg: ChakraTooltip.ContentProps["bg"] = contentProps?.bg ?? tooltipBg ?? "gray.900"

    const positioning = { ...(positioningProp ?? {}), placement };

    const mergedCss: ChakraTooltip.ContentProps["css"] = {
      ...(contentProps?.css ?? {}),
      "--tooltip-bg": finalBg,
    }

    return (
      <ChakraTooltip.Root {...rest} positioning={positioning}>
        <ChakraTooltip.Trigger asChild>{triggerChild}</ChakraTooltip.Trigger>
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
