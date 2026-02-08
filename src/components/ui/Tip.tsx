import { Box, CloseButton, HStack, Text, VStack } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { Tooltip } from "./Tooltip";
import { userScopedGetItem, userScopedSetItem } from "../../services/userScopedStorage";

export type TipProps = {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;

  // If provided, dismissal will persist in localStorage.
  storageKey?: string;
};

export function Tip({ title = "Tip", children, action, storageKey }: TipProps) {
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
    <Box w="100%" p={3} bg="blue.50" borderWidth="1px" borderColor="blue.200" rounded="md">
      <HStack align="start" justify="space-between" gap={3}>
        <VStack align="start" gap={1} flex={1} minW={0}>
          <Text fontWeight={700}>{title}</Text>
          <Text fontSize="sm" color="gray.700">
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
