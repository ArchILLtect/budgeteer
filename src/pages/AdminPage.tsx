import { Box, Button, Checkbox, Code, Flex, Heading, HStack, Input, Spacer, Table, Text } from "@chakra-ui/react";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { AppSelect } from "../components/ui/AppSelect";
import { fireToast } from "../hooks/useFireToast";
import { usePerfLogStore, type PerfEvent, type PerfEventKind } from "../store/perfLogStore";

type SortBy = "when" | "duration" | "kind" | "what";
type SortDir = "desc" | "asc";

const ALL_KINDS: Array<PerfEventKind> = ["route", "milestone", "auth", "api", "import", "apply"];

function rowDetails(e: PerfEvent): string {
  if (e.kind === "route") {
    const from = e.from ?? "";
    const to = e.to ?? e.destination ?? "";
    return from && to ? `${from} → ${to}` : to || from || "-";
  }

  return e.route ?? e.to ?? e.destination ?? "-";
}

function rowWhat(e: PerfEvent): string {
  return e.name ?? "-";
}

function matchesSearch(e: PerfEvent, query: string): boolean {
  if (!query) return true;
  const haystack = [
    e.kind,
    e.name,
    e.route,
    e.from,
    e.to,
    e.destination,
    e.message,
    e.ok === true ? "ok" : e.ok === false ? "fail" : "",
  ]
    .filter(Boolean)
    .join(" | ")
    .toLowerCase();

  return haystack.includes(query);
}

function matchesRouteFilter(e: PerfEvent, query: string): boolean {
  if (!query) return true;
  const haystack = [e.route, e.from, e.to, e.destination].filter(Boolean).join(" | ").toLowerCase();
  return haystack.includes(query);
}

function parseDateTimeLocal(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const ms = new Date(v).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function withinRange(occurredAtIso: string, startMs: number | null, endMs: number | null): boolean {
  if (startMs == null && endMs == null) return true;
  const t = new Date(occurredAtIso).getTime();
  if (!Number.isFinite(t)) return true;
  if (startMs != null && t < startMs) return false;
  if (endMs != null && t > endMs) return false;
  return true;
}

function compareEvents(a: PerfEvent, b: PerfEvent, sortBy: SortBy, dir: SortDir): number {
  const mult = dir === "asc" ? 1 : -1;

  if (sortBy === "duration") {
    const av = a.durationMs ?? Number.POSITIVE_INFINITY;
    const bv = b.durationMs ?? Number.POSITIVE_INFINITY;
    return mult * (av - bv);
  }

  if (sortBy === "kind") {
    return mult * String(a.kind).localeCompare(String(b.kind));
  }

  if (sortBy === "what") {
    return mult * rowWhat(a).localeCompare(rowWhat(b));
  }

  // when
  const at = new Date(a.occurredAt).getTime();
  const bt = new Date(b.occurredAt).getTime();
  return mult * (at - bt);
}

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

  const [search, setSearch] = useState("");
  const [routeFilter, setRouteFilter] = useState("");
  const [kind, setKind] = useState<PerfEventKind | "all">("all");
  const [sortBy, setSortBy] = useState<SortBy>("when");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [onlyFailures, setOnlyFailures] = useState(false);
  const [startDateTimeLocal, setStartDateTimeLocal] = useState("");
  const [endDateTimeLocal, setEndDateTimeLocal] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [pageIndex, setPageIndex] = useState(0);

  const resetFilters = () => {
    setSearch("");
    setRouteFilter("");
    setKind("all");
    setOnlyFailures(false);
    setStartDateTimeLocal("");
    setEndDateTimeLocal("");
    setSortBy("when");
    setSortDir("desc");
    setPageSize(50);
    setPageIndex(0);
  };

  const rows = useMemo(() => {
    // Normalize newest-first raw list; sort is applied later.
    return [...events].reverse();
  }, [events]);

  const normalizedSearch = useMemo(() => search.trim().toLowerCase(), [search]);
  const normalizedRouteFilter = useMemo(() => routeFilter.trim().toLowerCase(), [routeFilter]);
  const startMs = useMemo(() => parseDateTimeLocal(startDateTimeLocal), [startDateTimeLocal]);
  const endMs = useMemo(() => parseDateTimeLocal(endDateTimeLocal), [endDateTimeLocal]);

  const filteredRows = useMemo(() => {
    return rows
      .filter((e) => (kind === "all" ? true : e.kind === kind))
      .filter((e) => (onlyFailures ? e.ok === false : true))
      .filter((e) => matchesRouteFilter(e, normalizedRouteFilter))
      .filter((e) => withinRange(e.occurredAt, startMs, endMs))
      .filter((e) => matchesSearch(e, normalizedSearch));
  }, [endMs, kind, normalizedRouteFilter, normalizedSearch, onlyFailures, rows, startMs]);

  const sortedRows = useMemo(() => {
    const next = [...filteredRows];
    next.sort((a, b) => compareEvents(a, b, sortBy, sortDir));
    return next;
  }, [filteredRows, sortBy, sortDir]);

  useEffect(() => {
    setPageIndex(0);
  }, [endMs, kind, normalizedRouteFilter, normalizedSearch, onlyFailures, pageSize, sortBy, sortDir, startMs]);

  const total = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const start = safePageIndex * pageSize;
  const end = Math.min(total, start + pageSize);
  const pageRows = useMemo(() => sortedRows.slice(start, end), [end, sortedRows, start]);

  const copyCurrentView = async () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        view: {
          kind,
          onlyFailures,
          search: search.trim() || null,
          routeContains: routeFilter.trim() || null,
          start: startMs == null ? null : new Date(startMs).toISOString(),
          end: endMs == null ? null : new Date(endMs).toISOString(),
          sortBy,
          sortDir,
          pageSize,
          pageIndex: safePageIndex,
        },
        events: pageRows,
      };

      const text = JSON.stringify(payload, null, 2);
      await navigator.clipboard.writeText(text);
      fireToast("success", "Copied", `Copied ${pageRows.length} event(s)`);
    } catch (err) {
      fireToast("error", "Copy failed", "Could not copy to clipboard.");
      if (import.meta.env.DEV) console.warn("[admin] perf copy failed", err);
    }
  };

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
        <HStack wrap={"wrap"} gap={2}>
          <Button size="sm" variant="outline" colorPalette={"blue"} onClick={() => void copyCurrentView()} disabled={pageRows.length === 0}>
            Copy JSON (current view)
          </Button>
          <HStack>
          <Button size="sm" colorPalette={"blue"} onClick={exportJson} disabled={events.length === 0}>
            Export JSON
          </Button>
          <Button size="sm" variant="outline" colorPalette="red" onClick={clearAll} disabled={events.length === 0}>
            Clear
          </Button>
          </HStack>
        </HStack>
      </Flex>

      <Flex mt={4} gap={3} wrap="wrap" align="center">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search (kind, route, operation, message…)"
          bg="bg.panel"
          maxW="520px"
          size="sm"
        />

        <Input
          value={routeFilter}
          onChange={(e) => setRouteFilter(e.target.value)}
          placeholder="Route contains (e.g. /accounts)"
          bg="bg.panel"
          maxW="340px"
          size="sm"
        />

        <Checkbox.Root checked={onlyFailures} onCheckedChange={(d) => setOnlyFailures(!!d.checked)} colorPalette={"orange"}>
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label>
            <Text fontSize="sm" color={"orange.300"}>Only failures</Text>
          </Checkbox.Label>
        </Checkbox.Root>

        <Input
          type="datetime-local"
          value={startDateTimeLocal}
          onChange={(e) => setStartDateTimeLocal(e.target.value)}
          placeholder="From"
          bg="bg.panel"
          size="sm"
          maxW="220px"
          title={startMs == null ? "" : new Date(startMs).toISOString()}
        />

        <Input
          type="datetime-local"
          value={endDateTimeLocal}
          onChange={(e) => setEndDateTimeLocal(e.target.value)}
          placeholder="To"
          bg="bg.panel"
          size="sm"
          maxW="220px"
          title={endMs == null ? "" : new Date(endMs).toISOString()}
        />

        <AppSelect
          size="sm"
          value={kind}
          placeholder="Kind"
          onChange={(e) => setKind(e.target.value as PerfEventKind | "all")}
        >
          <option value="all">All kinds</option>
          {ALL_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </AppSelect>

        <AppSelect size="sm" value={sortBy} placeholder="Sort" onChange={(e) => setSortBy(e.target.value as SortBy)}>
          <option value="when">Sort: When</option>
          <option value="duration">Sort: Duration</option>
          <option value="kind">Sort: Kind</option>
          <option value="what">Sort: What</option>
        </AppSelect>

        <AppSelect size="sm" value={sortDir} placeholder="Direction" onChange={(e) => setSortDir(e.target.value as SortDir)}>
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </AppSelect>

        <AppSelect
          size="sm"
          value={String(pageSize)}
          placeholder="Page size"
          onChange={(e) => setPageSize(Number(e.target.value) || 50)}
        >
          <option value="25">25 / page</option>
          <option value="50">50 / page</option>
          <option value="100">100 / page</option>
        </AppSelect>

        <HStack>
          <Button
            size="sm"
            variant="outline"
            colorPalette={"blue"}
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={safePageIndex <= 0}
          >
            Prev
          </Button>
          <Button
            size="sm"
            variant="outline"
            colorPalette={"blue"}
            onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePageIndex >= totalPages - 1}
          >
            Next
          </Button>
        </HStack>

        <Button size="sm" variant="outline" colorPalette={"red"} onClick={resetFilters}>
          Reset filters
        </Button>

        <Text fontSize="sm" color="fg.muted">
          Showing {total === 0 ? 0 : start + 1}-{end} of {total}
        </Text>
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
            {pageRows.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={5}>
                  <Text fontSize="sm" color="fg.muted">
                    No matching events.
                  </Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              pageRows.map((e) => (
                <Table.Row key={e.id}>
                  <Table.Cell title={e.occurredAt}>
                    <Text as="span">{dayjs(e.occurredAt).fromNow?.() ?? e.occurredAt}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Code>{e.kind}</Code>
                  </Table.Cell>
                  <Table.Cell>
                    <Text as="span">{rowWhat(e)}</Text>
                  </Table.Cell>
                  <Table.Cell textAlign="end">
                    <Text as="span">{e.durationMs != null ? `${e.durationMs}ms` : "-"}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text as="span" color="fg.muted">
                      {rowDetails(e)}
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
