import { Box, Button, HStack, Text } from "@chakra-ui/react";
import { useCallback, useMemo, useState } from "react";

const STORAGE_DISCLOSURE_ACK_KEY = "budgeteer:storageDisclosureAck:v1" as const;

function readAcked(): boolean {
  try {
    return localStorage.getItem(STORAGE_DISCLOSURE_ACK_KEY) === "1";
  } catch {
    return false;
  }
}

function writeAcked(): void {
  try {
    localStorage.setItem(STORAGE_DISCLOSURE_ACK_KEY, "1");
  } catch {
    // ignore
  }
}

export function StorageDisclosureBanner() {
  const initialOpen = useMemo(() => !readAcked(), []);
  const [open, setOpen] = useState(initialOpen);

  const acknowledge = useCallback(() => {
    writeAcked();
    setOpen(false);
  }, []);

  if (!open) return null;

  return (
    <Box
      borderWidth="3px"
      borderColor="bg.inverted"
      bg="bg.emphasized"
      width="75vw"
      height="130px"
      color="none"
      px={4}
      py={3}
      boxShadow="sm"
      position="fixed"
      bottom="64px"
      left="50%"
      transform="translateX(-50%)"
      zIndex={1000}
    >
      <HStack justify="space-between" gap={4} flexWrap="wrap">
        <Text fontSize="lg" color="fg">
          This app uses cookies and local storage to keep you signed in and to remember your settings.
        </Text>

        <HStack gap={2} flexShrink={0}>
          <Button size="sm" color="fg" fontWeight="bold" bg="bg" onClick={acknowledge}>
            OK
          </Button>
        </HStack>
      </HStack>
    </Box>
  );
}
