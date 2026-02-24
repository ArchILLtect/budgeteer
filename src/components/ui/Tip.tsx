import { Box, CloseButton, HStack, Text, VStack } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { Tooltip } from "./Tooltip";
import { userScopedGetItem, userScopedSetItem } from "../../services/userScopedStorage";

export type TipProps = {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;

  size?: "xs" | "sm" | "md";
  color?: string;

  // If provided, dismissal will persist in localStorage.
  storageKey?: string;
};

export function Tip({ title = "Tip", children, action, size = "sm", color, storageKey }: TipProps) {
  const [open, setOpen] = useState(() => {
    if (!storageKey) return true;
    try {
      return userScopedGetItem(storageKey) !== "dismissed";
    } catch {
      return true;
    }
  });

  const dismiss = useCallback(() => {
    setOpen(false);
    if (!storageKey) return;

    try {
      userScopedSetItem(storageKey, "dismissed");
    } catch {
      // ignore storage errors
    }
  }, [storageKey]);

  if (!open) return null;

  return (
    <Box w="100%" p={3} bg="bg.info" borderWidth="1px" borderColor="border" rounded="md">
      <HStack align="start" justify="space-between" gap={3}>
        <VStack align="start" gap={1} flex={1} minW={0}>
          <Text fontWeight={700} fontSize={size ? (size === "xs" ? "sm" : size === "sm" ? "md" : "lg") : "unset"}>{title}</Text>
          <Text fontSize={size} color={color || "fg.muted"}>
            {children}
          </Text>
          {action ? <Box pt={1}>{action}</Box> : null}
        </VStack>

        <Tooltip content="Click to dismiss this tip">
          <CloseButton aria-label="Dismiss tip" size="sm" onClick={dismiss} />
        </Tooltip>
      </HStack>
    </Box>
  );
}
