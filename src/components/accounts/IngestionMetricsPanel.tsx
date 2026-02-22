import { Box, Stat, StatHelpText, SimpleGrid, Progress, Heading, HStack, Tag, Text, VStack, Flex } from '@chakra-ui/react';
import { Tooltip } from '../ui/Tooltip';
import type { IngestionMetrics } from '../../types/ingestionMetrics';

type MetricStatProps = {
  label: string;
  value: string;
  help?: string;
};

function MetricStat({ label, value, help }: MetricStatProps) {
  return (
    <Stat.Root p={2.5} borderWidth={1} borderColor="border" borderRadius="md" bg="bg.subtle">
      <Stat.Label fontSize="xs" color="fg.muted">{label}</Stat.Label>
      <Stat.ValueText fontSize="lg" fontWeight="semibold" fontVariantNumeric="tabular-nums">
        {value}
      </Stat.ValueText>
      {help ? <StatHelpText fontSize="xs" color="fg.muted">{help}</StatHelpText> : null}
    </Stat.Root>
  );
}

// Expect an object like metrics = { ingestMs, parseMs, processMs, totalMs, rowsProcessed, rowsPerSec, duplicatesRatio }
// Provide graceful fallback if metrics is missing.
export default function IngestionMetricsPanel({ metrics, sessionId }: { metrics?: IngestionMetrics, sessionId?: string }) {
  if (!metrics) return null;
  const { ingestMs, parseMs, processMs, totalMs, rowsProcessed, rowsPerSec, duplicatesRatio, stageTimings, earlyShortCircuits } = metrics;

  const fmtMs = (n: number) => (Number.isFinite(n) && n >= 0 ? `${n.toFixed(0)} ms` : '—');
  const fmtPct = (n: number) => (Number.isFinite(n) ? `${n.toFixed(1)}%` : '—');
  const fmtNum = (n: number) => (Number.isFinite(n) ? n.toLocaleString() : '—');

  const derivePct = (part?: number) => {
    if (!ingestMs) return 0;
    return Math.min(100, Math.round(((part || 0) / ingestMs) * 100));
  };
  const stages: [string, number, string][] = stageTimings ? [
    ['Normalize', stageTimings.normalizeMs, 'gray'],
    ['Classify', stageTimings.classifyMs, 'blue'],
    ['Infer', stageTimings.inferMs, 'purple'],
    ['Key', stageTimings.keyMs, 'cyan'],
    ['Dedupe', stageTimings.dedupeMs, 'orange'],
    ['Consensus', stageTimings.consensusMs, 'teal'],
  ] : [];

  return (
    <Box p={{ base: 3, md: 4 }} borderWidth={1} borderColor="border" borderRadius="lg" bg="bg.panel">
      <Flex mb={3} justify="space-between" align="center" gap={3} wrap="wrap">
        <Box>
          <Heading as="h3" size="sm">Ingestion Timing</Heading>
          <Text fontSize="xs" color="fg.muted">Most recent captured ingestion run</Text>
        </Box>
        {sessionId ? (
          <HStack gap={2}>
            <Text fontSize="xs" color="fg.muted">Session</Text>
            <Tag.Root size="sm" colorPalette="blue" fontVariantNumeric="tabular-nums">
              {sessionId.slice(0, 8)}
            </Tag.Root>
          </HStack>
        ) : null}
      </Flex>

      <SimpleGrid minChildWidth="150px" gap={3} mb={3}>
        <MetricStat label="Total (UI)" value={fmtMs(totalMs)} help="Modal open → done" />
        <MetricStat label="Parse" value={fmtMs(parseMs)} help={`${derivePct(parseMs)}%`} />
        <MetricStat label="Process" value={fmtMs(processMs)} help={`${derivePct(processMs)}%`} />
        <MetricStat label="Ingest End" value={fmtMs(ingestMs)} help="loop + consensus" />
        <MetricStat label="Rows" value={Number.isFinite(rowsProcessed) ? fmtNum(rowsProcessed) : '—'} help="processed" />
        <MetricStat label="Throughput" value={Number.isFinite(rowsPerSec) ? fmtNum(rowsPerSec) : '—'} help="rows/sec" />
        <MetricStat label="Dupes Ratio" value={fmtPct(duplicatesRatio)} help="existing + intra" />
        {earlyShortCircuits ? (
          <MetricStat
            label="Early Short-C"
            value={fmtNum(earlyShortCircuits.total)}
            help={fmtPct((earlyShortCircuits.total / ((rowsProcessed || 1) as number)) * 100)}
          />
        ) : null}
      </SimpleGrid>

      <Box maxW={"30%"}>
        <Text fontSize="sm" color="fg" mb={2}>Breakdown (share of ingest time)</Text>
        <VStack align="stretch" gap={2}>
          <Tooltip content={`Parse: ${fmtMs(parseMs)} (${derivePct(parseMs)}%)`} showArrow>
            <HStack gap={3} borderBottom={"1px solid"} borderColor="border" pb={1}>
              <Text fontSize="sm" color="fg.muted" minW="88px">Parse</Text>
              <Progress.Root size="sm" value={derivePct(parseMs)} colorPalette="purple" flex="1" />
              <Text fontSize="sm" color="fg.muted" minW="42px" textAlign="right">{derivePct(parseMs)}%</Text>
            </HStack>
          </Tooltip>
          <Tooltip content={`Process: ${fmtMs(processMs)} (${derivePct(processMs)}%)`} showArrow>
            <HStack gap={3} borderBottom={"1px solid"} borderColor="border" pb={1}>
              <Text fontSize="sm" color="fg.muted" minW="88px">Process</Text>
              <Progress.Root size="sm" value={derivePct(processMs)} colorPalette="teal" flex="1" />
              <Text fontSize="sm" color="fg.muted" minW="42px" textAlign="right">{derivePct(processMs)}%</Text>
            </HStack>
          </Tooltip>
          {stages.length > 0 ? (
            <Box>
              {stages.map(([label, ms, color]) => (
                <Tooltip
                  key={label}
                  content={`${label}: ${fmtMs(ms)} (${derivePct(ms)}%)`}
                  showArrow
                >
                  <HStack gap={3} mb={1} borderBottom={"1px solid"} borderColor="border.muted" pb={1}>
                    <Text fontSize="xs" color="fg.muted" minW="88px">{label}</Text>
                    <Progress.Root size="sm" value={derivePct(ms)} colorPalette={color} flex="1" />
                    <Text fontSize="xs" color="fg.muted" minW="42px" textAlign="right">{derivePct(ms)}%</Text>
                  </HStack>
                </Tooltip>
              ))}
            </Box>
          ) : null}
        </VStack>
      </Box>
    </Box>
  );
}
