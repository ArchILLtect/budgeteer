import { Box, HStack, Text, VStack } from "@chakra-ui/react";
import { DialogModal } from "./DialogModal";

export function DemoConfirmDialog({
  open,
  setOpen,
  loading,
  error,
  onConfirm,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  loading: boolean;
  error: string | null;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <DialogModal
      title="Start demo mode?"
      body={
        <VStack align="start" gap={3}>
          <Text color="gray.700">
            Demo mode creates a temporary demo account, signs you in, and seeds sample data.
          </Text>

          <Box bg="gray.50" borderWidth="1px" borderColor="gray.200" rounded="md" p={3} w="100%">
            <VStack align="start" gap={1}>
              <HStack justify="space-between" w="100%">
                <Text fontWeight="700">What to expect</Text>
              </HStack>
              <Text fontSize="sm" color="gray.600">
                - No email/signup required
              </Text>
              <Text fontSize="sm" color="gray.600">
                - Takes ~5 seconds
              </Text>
              <Text fontSize="sm" color="gray.600">
                - You can reset demo data in Settings
              </Text>
            </VStack>
          </Box>

          {error ? (
            <Box p={3} bg="red.50" borderWidth="1px" borderColor="red.200" rounded="md" w="100%">
              <Text fontWeight="600" color="red.800">
                Demo sign-in failed
              </Text>
              <Text fontSize="sm" color="red.700">
                {error}
              </Text>
            </Box>
          ) : null}
        </VStack>
      }
      open={open}
      setOpen={setOpen}
      acceptLabel={loading ? "Starting…" : "Start demo"}
      acceptColorPalette="purple"
      acceptVariant="solid"
      cancelLabel="Not now"
      cancelVariant="outline"
      loading={loading}
      disableClose={loading}
      closeOnAccept={false}
      onAccept={async () => {
        await onConfirm();
      }}
      onCancel={() => {
        // caller controls any additional cleanup
      }}
    />
  );
}
