import { Button, HStack, Text, Spacer } from "@chakra-ui/react";
import { RouterLink } from "./RouterLink";

export const SidebarItem = (
  {
    to,
    label,
    main,
    rightAdornment,
    onNavigate,
  }: {
    to: string;
    label: string;
    main?: boolean;
    rightAdornment?: React.ReactNode;
    onNavigate?: () => void;
  }
) => {
  return (
    <RouterLink
      to={to}
      onClick={(e) => {
        if (e.defaultPrevented) return;

        // Match RouterLink behavior: only treat as in-app nav on normal left-clicks.
        if (e.button !== 0) return;
        if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return;

        const target = (e.currentTarget as HTMLAnchorElement | null)?.target;
        if (target === "_blank") return;

        onNavigate?.();
      }}
    >
      {({ isActive }) => (
        <Button
          as="span"
          variant="ghost"
          justifyContent="flex-start"
          width="100%"
          paddingX={main ? 2 : 5}
          fontWeight={main ? "700" : "500"}
          color={main ? "black" : ""}
          bg={isActive ? "blackAlpha.100" : "transparent"}
          _hover={{ bg: "blackAlpha.100" }}
        >
          <HStack w="100%" gap={2} minW={0} justify="start">
            <Text truncate>{label}</Text>
            {rightAdornment ?
              <>
                <Spacer/>
                <HStack flexShrink={0} gap={1}>
                  {rightAdornment}
                </HStack>
              </> : null}
          </HStack>
        </Button>
      )}
    </RouterLink>
  );
}