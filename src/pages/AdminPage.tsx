import { Box, Button, Code, Flex, Heading, HStack, Spacer, Table, Text } from "@chakra-ui/react";
import dayjs from "dayjs";
import { useMemo } from "react";
import { fireToast } from "../hooks/useFireToast";
import { usePerfLogStore } from "../store/perfLogStore";

function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const events = usePerfLogStore((s) => s.events);
  const clear = usePerfLogStore((s) => s.clear);

  const rows = useMemo(() => {
    // Newest first for quick scanning
    return [...events].reverse();
  }, [events]);

  const exportJson = () => {
    try {
      const json = JSON.stringify({ exportedAt: new Date().toISOString(), events }, null, 2);
      downloadTextFile(`budgeteer-perf-log-${dayjs().format("YYYY-MM-DD-HHmm")}.json`, json, "application/json");
      fireToast("success", "Exported", `Exported ${events.length} event(s)`);
    } catch (err) {
      fireToast("error", "Export failed", "Could not export perf log.");
      if (import.meta.env.DEV) console.warn("[admin] perf export failed", err);
    }
  };

  const clearAll = () => {
    const ok = window.confirm("Clear perf log for this user scope? This cannot be undone.");
    if (!ok) return;
    clear();
    fireToast("success", "Cleared", "Perf log cleared.");
  };

  return (
    <Box p={6}>
      <Flex align="center" gap={4} wrap="wrap">
        <Heading size="lg">Admin</Heading>
        <Text fontSize="sm" color="fg.muted">
          Local-first telemetry (stored in your browser for this user scope).
        </Text>
        <Spacer />
        <HStack>
          <Button size="sm" onClick={exportJson} disabled={events.length === 0}>
            Export JSON
          </Button>
          <Button size="sm" variant="outline" colorPalette="red" onClick={clearAll} disabled={events.length === 0}>
            Clear
          </Button>
        </HStack>
      </Flex>

      <Box mt={4} borderWidth={1} borderRadius="md" overflowX="auto" bg="bg.panel">
        <Table.Root size="sm" variant="line" striped>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>When</Table.ColumnHeader>
              <Table.ColumnHeader>Kind</Table.ColumnHeader>
              <Table.ColumnHeader>What</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Duration</Table.ColumnHeader>
              <Table.ColumnHeader>Route / Details</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={5}>
                  <Text fontSize="sm" color="fg.muted">
                    No events yet.
                  </Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              rows.map((e) => (
                <Table.Row key={e.id}>
                  <Table.Cell title={e.occurredAt}>
                    <Text as="span">{dayjs(e.occurredAt).fromNow?.() ?? e.occurredAt}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Code>{e.kind}</Code>
                  </Table.Cell>
                  <Table.Cell>
                    <Text as="span">{e.name ?? "-"}</Text>
                  </Table.Cell>
                  <Table.Cell textAlign="end">
                    <Text as="span">{e.durationMs != null ? `${e.durationMs}ms` : "-"}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text as="span" color="fg.muted">
                      {e.route ?? e.to ?? e.destination ?? "-"}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>
      </Box>
    </Box>
  );
}
