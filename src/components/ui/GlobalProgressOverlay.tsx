import { Box, HStack, Progress, Text } from "@chakra-ui/react";

import { useBudgetStore } from "../../store/budgetStore";

export function GlobalProgressOverlay() {
  const isOpen = useBudgetStore((s) => s.isProgressOpen);
  const header = useBudgetStore((s) => s.progressHeader);
  const count = useBudgetStore((s) => s.progressCount);
  const total = useBudgetStore((s) => s.progressTotal);

  if (!isOpen) return null;

  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0;
  const safeCount = Number.isFinite(count) && count > 0 ? count : 0;
  const pct = safeTotal ? Math.min(100, Math.max(0, (safeCount / safeTotal) * 100)) : 0;

  return (
    <Box
      position="fixed"
      top={"3%"}
      left={"0%"}
      right={0}
      zIndex={3000}
      px={3}
      pointerEvents="none"
    >
      <Box
        maxW="720px"
        mx="auto"
        bg="bg.panel"
        borderWidth="1px"
        borderColor="border"
        rounded="md"
        boxShadow="sm"
        px={3}
        py={2}
      >
        <HStack justify="space-between" gap={3} mb={2}>
          <Text fontSize="sm" fontWeight={700} lineClamp={1}>
            {header || "Working…"}
          </Text>
          <Text fontSize="xs" color="fg.muted" flexShrink={0}>
            {safeTotal ? `${safeCount}/${safeTotal}` : ""}
          </Text>
        </HStack>

        <Progress.Root value={pct} size="sm" colorPalette="teal" borderRadius="md">
          <Progress.Track borderRadius="md" bg="bg.subtle">
            <Progress.Range borderRadius="md" />
          </Progress.Track>
        </Progress.Root>
      </Box>
    </Box>
  );
}
