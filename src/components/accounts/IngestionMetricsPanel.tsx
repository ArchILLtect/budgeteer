import { Box, Stat, StatHelpText, SimpleGrid, Progress, Heading, HStack, Tag } from '@chakra-ui/react';
import { Tooltip } from '../ui/Tooltip';

type IngestionMetrics = {
  ingestMs: number;
  parseMs: number;
  processMs: number;
  totalMs: number;
  rowsProcessed: number;
  rowsPerSec: number;
  duplicatesRatio: number;
  stageTimings?: {
    normalizeMs: number;
    classifyMs: number;
    inferMs: number;
    keyMs: number;
    dedupeMs: number;
    consensusMs: number;
  };
  earlyShortCircuits?: {
    total: number;
    byStage: { [stage: string]: number };
  };
};

// Expect an object like metrics = { ingestMs, parseMs, processMs, totalMs, rowsProcessed, rowsPerSec, duplicatesRatio }
// Provide graceful fallback if metrics is missing.
export default function IngestionMetricsPanel({ metrics, sessionId }: { metrics?: IngestionMetrics, sessionId?: string }) {
  if (!metrics) return null;
  const { ingestMs, parseMs, processMs, totalMs, rowsProcessed, rowsPerSec, duplicatesRatio, stageTimings, earlyShortCircuits } = metrics;
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
    <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.50" _dark={{ bg: 'gray.700' }} fontSize="sm">
      <HStack mb={2} justify="space-between">
        <Heading as="h3" size="sm">Ingestion Timing</Heading>
        {sessionId && <Tag.Root size="sm" colorScheme="blue">{sessionId.slice(0,8)}</Tag.Root>}
      </HStack>
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={3} mb={3}>
        <Stat.Root>
          <Stat.Label>Total (UI)</Stat.Label>
          <Stat.ValueText fontSize="md">{totalMs ? totalMs.toFixed(0) : '—'} ms</Stat.ValueText>
          <StatHelpText>Modal open ➜ done</StatHelpText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label>Parse</Stat.Label>
          <Stat.ValueText fontSize="md">{parseMs ? parseMs.toFixed(0) : '—'} ms</Stat.ValueText>
          <StatHelpText>{derivePct(parseMs)}%</StatHelpText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label>Process</Stat.Label>
          <Stat.ValueText fontSize="md">{processMs ? processMs.toFixed(0) : '—'} ms</Stat.ValueText>
          <StatHelpText>{derivePct(processMs)}%</StatHelpText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label>Ingest End</Stat.Label>
          <Stat.ValueText fontSize="md">{ingestMs ? ingestMs.toFixed(0) : '—'} ms</Stat.ValueText>
          <StatHelpText>loop + consensus</StatHelpText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label>Rows</Stat.Label>
          <Stat.ValueText fontSize="md">{rowsProcessed ?? '—'}</Stat.ValueText>
          <StatHelpText>processed</StatHelpText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label>Throughput</Stat.Label>
          <Stat.ValueText fontSize="md">{rowsPerSec ? rowsPerSec.toLocaleString() : '—'}</Stat.ValueText>
          <StatHelpText>rows/sec</StatHelpText>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label>Dupes Ratio</Stat.Label>
          <Stat.ValueText fontSize="md">{duplicatesRatio ? duplicatesRatio.toFixed(1) : '0.0'}%</Stat.ValueText>
          <StatHelpText>existing+intra</StatHelpText>
        </Stat.Root>
        {earlyShortCircuits && (
          <Stat.Root>
            <Stat.Label>Early Short-C</Stat.Label>
            <Stat.ValueText fontSize="md">{earlyShortCircuits.total}</Stat.ValueText>
            <Stat.HelpText>{earlyShortCircuits.total ? ((earlyShortCircuits.total / (rowsProcessed || 1))*100).toFixed(1) : '0.0'}%</Stat.HelpText>
          </Stat.Root>
        )}
      </SimpleGrid>
      <Box>
        <Progress.Root size="xs" value={derivePct(parseMs)} colorScheme="purple" mb={1} />
        <Progress.Root size="xs" value={derivePct(processMs)} colorScheme="teal" mb={1} />
        {stages.length > 0 && (
          <Box>
            {stages.map(([label, ms, color]) => (
              <Tooltip key={label} content={`${label}: ${ms?.toFixed?.(2) || ms || 0} ms (${derivePct(ms)}%)`} showArrow>
                <Box mb={1}>
                  <Progress.Root size="xs" value={derivePct(ms)} colorScheme={color} />
                </Box>
              </Tooltip>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
