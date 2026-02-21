import {
  Box,
  Grid,
  Heading,
  HStack,
  Stack,
  Text,
  Stat,
  RadioGroup,
  useMediaQuery,
} from "@chakra-ui/react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppTable } from "../components/ui/AppTable";
import { AppSelect } from "../components/ui/AppSelect";
import { useBudgetStore } from "../store/budgetStore";
import type { PlannerSlice } from "../store/slices/plannerSlice";
import { formatUtcMonthKey } from "../services/dateTime";
import { formatCurrency } from "../utils/formatters";
import { normalizeTransactionAmount } from "../utils/storeHelpers";

type MonthlyActual = PlannerSlice["monthlyActuals"][string];

type TrendPoint = {
  month: string;
  monthLabel: string;
  netIncome: number;
  expenses: number;
  saved: number;
  leftover: number;
};

type SavingsMode = "all" | "goalOnly";

type GroupByMode = "actualName" | "importedCategory";

type ChangeRow = {
  key: string;
  current: number;
  previous: number;
  delta: number;
};

function addMonthsToMonthKey(monthKey: string, deltaMonths: number): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return monthKey;

  const d = new Date(Date.UTC(year, monthIndex, 1));
  d.setUTCMonth(d.getUTCMonth() + deltaMonths);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getLastNMonths(monthKey: string, count: number): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    out.push(addMonthsToMonthKey(monthKey, -i));
  }
  return out;
}

function sum(values: number[]): number {
  return values.reduce((s, v) => s + v, 0);
}

function coerceMonthlyActualTotals(actual?: MonthlyActual): { netIncome: number; expenses: number } {
  if (!actual) return { netIncome: 0, expenses: 0 };

  const overIncome = actual.overiddenIncomeTotal ?? 0;
  const overExpense = actual.overiddenExpenseTotal ?? 0;

  const netIncome =
    overIncome >= 1
      ? overIncome
      : Number.isFinite(actual.actualTotalNetIncome)
        ? actual.actualTotalNetIncome
        : sum(actual.actualFixedIncomeSources.map((s) => Number(s.amount) || 0));

  const expenses =
    overExpense >= 1 ? overExpense : sum(actual.actualExpenses.map((e) => Number(e.amount) || 0));

  return {
    netIncome: Number.isFinite(netIncome) ? netIncome : 0,
    expenses: Number.isFinite(expenses) ? expenses : 0,
  };
}

function getMonthLabel(monthKey: string): string {
  try {
    return formatUtcMonthKey(monthKey, { month: "short" });
  } catch {
    return monthKey;
  }
}

function formatDeltaCurrency(value: number): string {
  const abs = Math.abs(value);
  const formatted = formatCurrency(abs);
  return value < 0 ? `-${formatted}` : formatted;
}

function clampLabel(value: string, maxChars: number): string {
  const s = value ?? "";
  if (s.length <= maxChars) return s;
  if (maxChars <= 1) return "…";
  return `${s.slice(0, Math.max(0, maxChars - 1))}…`;
}

export function InsightsPage() {
  const selectedMonth = useBudgetStore((s) => s.selectedMonth);
  const monthlyActuals = useBudgetStore((s) => s.monthlyActuals);
  const savingsLogs = useBudgetStore((s) => s.savingsLogs);
  const accounts = useBudgetStore((s) => s.accounts);

  const [savingsMode, setSavingsMode] = useState<SavingsMode>("all");
  const [groupByMode, setGroupByMode] = useState<GroupByMode>("actualName");

  const months = useMemo(() => getLastNMonths(selectedMonth, 6), [selectedMonth]);

  const [compareMonth, setCompareMonth] = useState(() => months[months.length - 1] ?? selectedMonth);

  const trend = useMemo<TrendPoint[]>(() => {
    return months.map((month) => {
      const actual = monthlyActuals?.[month];
      const { netIncome, expenses } = coerceMonthlyActualTotals(actual);

      const logs = savingsLogs?.[month] ?? [];
      const saved = sum(
        logs
          .filter((l) => {
            if (savingsMode === "all") return true;
            return l?.goalId != null;
          })
          .map((l) => Number(l?.amount) || 0),
      );

      const leftover = netIncome - expenses - saved;
      return {
        month,
        monthLabel: getMonthLabel(month),
        netIncome,
        expenses,
        saved,
        leftover,
      };
    });
  }, [months, monthlyActuals, savingsLogs, savingsMode]);

  const latest = trend[trend.length - 1] ?? {
    month: selectedMonth,
    monthLabel: getMonthLabel(selectedMonth),
    netIncome: 0,
    expenses: 0,
    saved: 0,
    leftover: 0,
  };

  const prevLatest = trend.length >= 2 ? trend[trend.length - 2] : null;

  const changeRows = useMemo<ChangeRow[]>(() => {
    const currentMonthKey = compareMonth;
    const previousMonthKey = addMonthsToMonthKey(compareMonth, -1);

    if (groupByMode === "actualName") {
      const cur = monthlyActuals?.[currentMonthKey];
      const prev = monthlyActuals?.[previousMonthKey];

      const curExpenses = Array.isArray((cur as Record<string, unknown> | undefined)?.actualExpenses)
        ? ((cur as Record<string, unknown>).actualExpenses as Array<Record<string, unknown>>)
        : [];

      const prevExpenses = Array.isArray((prev as Record<string, unknown> | undefined)?.actualExpenses)
        ? ((prev as Record<string, unknown>).actualExpenses as Array<Record<string, unknown>>)
        : [];

      const sumByName = (items: Array<Record<string, unknown>>): Record<string, number> => {
        const out: Record<string, number> = {};
        for (const e of items) {
          const name = typeof e?.name === "string" && e.name.trim() ? e.name.trim() : "(unnamed)";
          const amount = Number(e?.amount) || 0;
          out[name] = (out[name] || 0) + amount;
        }
        return out;
      };

      const curMap = sumByName(curExpenses);
      const prevMap = sumByName(prevExpenses);

      const keys = new Set([...Object.keys(curMap), ...Object.keys(prevMap)]);
      return Array.from(keys)
        .map((k) => ({
          key: k,
          current: curMap[k] || 0,
          previous: prevMap[k] || 0,
          delta: (curMap[k] || 0) - (prevMap[k] || 0),
        }))
        .filter((r) => Math.abs(r.delta) >= 0.01);
    }

    // importedCategory
    type TxLike = {
      date?: string;
      type?: string;
      category?: string | null;
      amount?: number | string;
      staged?: boolean;
      budgetApplied?: boolean;
    };

    const allTxns: TxLike[] = [];
    for (const acct of Object.values(accounts ?? {})) {
      const txns = (acct as { transactions?: TxLike[] })?.transactions;
      if (Array.isArray(txns)) allTxns.push(...txns);
    }

    const sumByCategory = (monthKey: string): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const t of allTxns) {
        if (!t?.date?.startsWith(monthKey)) continue;
        if (t.type !== "expense") continue;
        if (t.budgetApplied !== true) continue;

        const category = typeof t.category === "string" && t.category.trim() ? t.category.trim() : "(uncategorized)";
        const amount = normalizeTransactionAmount(t);
        out[category] = (out[category] || 0) + amount;
      }
      return out;
    };

    const curMap = sumByCategory(currentMonthKey);
    const prevMap = sumByCategory(previousMonthKey);
    const keys = new Set([...Object.keys(curMap), ...Object.keys(prevMap)]);
    return Array.from(keys)
      .map((k) => ({
        key: k,
        current: curMap[k] || 0,
        previous: prevMap[k] || 0,
        delta: (curMap[k] || 0) - (prevMap[k] || 0),
      }))
      .filter((r) => Math.abs(r.delta) >= 0.01);
  }, [accounts, compareMonth, groupByMode, monthlyActuals]);

  const increased = useMemo(() => {
    return [...changeRows]
      .filter((r) => r.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 5);
  }, [changeRows]);

  const decreased = useMemo(() => {
    return [...changeRows]
      .filter((r) => r.delta < 0)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 5);
  }, [changeRows]);

  const increaseChartData = increased.map((r) => ({ name: r.key, delta: r.delta }));
  const decreaseChartData = decreased.map((r) => ({ name: r.key, delta: Math.abs(r.delta) }));

  const monthOptions = months;

  const [isPortraitWidth] = useMediaQuery(["(max-width: 450px)"]);

  return (
    <Stack gap={6} p={4}>
      <Box>
        <Heading size="xl">Insights</Heading>
        <Text color="fg.muted" fontSize="sm">
          Trends and month-over-month drivers to make Tracker data easier to understand.
        </Text>
      </Box>

      {/* Trend Overview */}
      <Box borderWidth={1} borderColor="border" rounded="md" bg="bg" p={4}>
        <HStack justify="space-between" align="start" wrap="wrap" gap={3} mb={3}>
          <Box>
            <Heading size="md">Trend Overview (last 6 months)</Heading>
            <Text fontSize="sm" color="fg.muted">
              Savings includes {savingsMode === "all" ? "all savings logs" : "goal-linked savings only"}.
            </Text>
          </Box>

          <RadioGroup.Root
            value={savingsMode}
            onValueChange={(e) => setSavingsMode((e.value as SavingsMode) ?? "all")}
          >
            <RadioGroup.Label fontSize="sm">Savings</RadioGroup.Label>
            <HStack gap={3}>
              <RadioGroup.Item value="all">
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemControl>
                  <RadioGroup.ItemIndicator borderColor="fg" _checked={{ borderColor: "fg.inverted" }} />
                </RadioGroup.ItemControl>
                <RadioGroup.ItemText>All logs</RadioGroup.ItemText>
              </RadioGroup.Item>
              <RadioGroup.Item value="goalOnly">
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemControl>
                  <RadioGroup.ItemIndicator borderColor="fg" _checked={{ borderColor: "fg.inverted" }} />
                </RadioGroup.ItemControl>
                <RadioGroup.ItemText>Goal-linked only</RadioGroup.ItemText>
              </RadioGroup.Item>
            </HStack>
          </RadioGroup.Root>
        </HStack>

        <Box px={4} py={3} borderWidth={1} borderColor="border" borderRadius="md" bg="bg.panel" mb={4}>
          <Grid
            gap={3}
            gridTemplateColumns="repeat(4, minmax(0, 1fr))"
            css={{
              "@media (max-width: 600px)": { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
              "@media (max-width: 320px)": { gridTemplateColumns: "repeat(1, minmax(0, 1fr))" },
            }}
          >
            <Stat.Root textAlign="center">
              <Stat.Label>Net Income</Stat.Label>
              <Stat.ValueText>{formatCurrency(latest.netIncome)}</Stat.ValueText>
              {prevLatest ? (
                <Stat.HelpText>{formatDeltaCurrency(latest.netIncome - prevLatest.netIncome)} vs prior</Stat.HelpText>
              ) : null}
            </Stat.Root>
            <Stat.Root textAlign="center">
              <Stat.Label>Expenses</Stat.Label>
              <Stat.ValueText>{formatCurrency(latest.expenses)}</Stat.ValueText>
              {prevLatest ? (
                <Stat.HelpText>{formatDeltaCurrency(latest.expenses - prevLatest.expenses)} vs prior</Stat.HelpText>
              ) : null}
            </Stat.Root>
            <Stat.Root textAlign="center">
              <Stat.Label>Saved</Stat.Label>
              <Stat.ValueText>{formatCurrency(latest.saved)}</Stat.ValueText>
              {prevLatest ? (
                <Stat.HelpText>{formatDeltaCurrency(latest.saved - prevLatest.saved)} vs prior</Stat.HelpText>
              ) : null}
            </Stat.Root>
            <Stat.Root textAlign="center">
              <Stat.Label>Leftover</Stat.Label>
              <Stat.ValueText>{formatCurrency(latest.leftover)}</Stat.ValueText>
              {prevLatest ? (
                <Stat.HelpText>{formatDeltaCurrency(latest.leftover - prevLatest.leftover)} vs prior</Stat.HelpText>
              ) : null}
            </Stat.Root>
          </Grid>
        </Box>

        <Box height="300px" borderWidth={1} borderColor="border" rounded="md" bg="bg.panel" p={2} minW={0} overflow="hidden">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            initialDimension={{ width: 800, height: 260 }}
          >
            <LineChart data={trend} margin={{ top: 24, right: 12, left: 0, bottom: isPortraitWidth ? 28 : 18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chakra-colors-border)" />
              <XAxis dataKey="monthLabel" />
              <YAxis tickFormatter={(v) => (typeof v === "number" ? `$${Math.round(v)}` : "")} />
              <RechartsTooltip
                formatter={(value: unknown) =>
                  typeof value === "number" ? formatCurrency(value) : String(value ?? "")
                }
              />
              <Legend verticalAlign="bottom" height={22} wrapperStyle={{ paddingTop: 2 }} />
              <Line
                type="monotone"
                dataKey="netIncome"
                name="Net Income"
                stroke="var(--chakra-colors-teal-500)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="var(--chakra-colors-orange-500)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="saved"
                name="Saved"
                stroke="var(--chakra-colors-blue-500)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="leftover"
                name="Leftover"
                stroke="var(--chakra-colors-green-500)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>

        <Box mt={4} p={2} border="2px solid" borderRadius="md" borderColor="border" bg="bg.panel" overflowX="auto" minW={0} width="100%" maxW="100%">
          <Box minW="700px">
            <AppTable
              width="100%"
              columns={[
                { key: "metric", header: "Metric", width: "140px" },
                ...months.map((m) => ({ key: m, header: getMonthLabel(m), textAlign: "end" as const, width: "150px" })),
                { key: "delta", header: "Δ vs prior", textAlign: "end", width: "120px" },
              ]}
              rows={["netIncome", "expenses", "saved", "leftover"] as const}
              renderRow={(row) => {
                const metricLabel =
                  row === "netIncome"
                    ? "Net Income"
                    : row === "expenses"
                      ? "Expenses"
                      : row === "saved"
                        ? "Saved"
                        : "Leftover";

                const values = months.map((m) => trend.find((t) => t.month === m)?.[row] ?? 0);
                const last = values[values.length - 1] ?? 0;
                const prior = values.length >= 2 ? values[values.length - 2] ?? 0 : 0;
                const delta = last - prior;

                return (
                  <>
                    <Box as={"td"} px={2} py={1} bg={row === "netIncome" ? "teal.50" : row === "expenses" ? "orange.50" : row === "saved" ? "blue.50" : "green.50"} fontWeight="bold">
                      <Text fontSize="sm" color="gray.900">{metricLabel}</Text>
                    </Box>
                    {values.map((v, idx) => (
                      <Box as={"td"} key={`${row}-${idx}`} textAlign="end" bg={row === "netIncome" ? "teal.50" : row === "expenses" ? "orange.50" : row === "saved" ? "blue.50" : "green.50"}>
                        <Text fontSize="sm" color="gray.900">{formatCurrency(v)}</Text>
                      </Box>
                    ))}
                    <Box as={"td"} textAlign="end" bg={row === "netIncome" ? "teal.50" : row === "expenses" ? "orange.50" : row === "saved" ? "blue.50" : "green.50"}>
                      <Text fontSize="sm" color={delta > 0 ? "green.500" : delta < 0 ? "red.500" : "gray.500"}>{formatDeltaCurrency(delta)}</Text>
                    </Box>
                  </>
                );
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Biggest Changes */}
      <Box borderWidth={1} borderColor="border" rounded="md" bg="bg" p={4}>
        <HStack justify="space-between" align="start" wrap="wrap" gap={3} mb={3}>
          <Box>
            <Heading size="md">Biggest Changes (month over month)</Heading>
            <Text fontSize="sm" color="fg.muted">
              Compares {getMonthLabel(compareMonth)} vs {getMonthLabel(addMonthsToMonthKey(compareMonth, -1))}.
            </Text>
          </Box>

          <HStack gap={6} wrap="wrap">
            <Box>
              <Text fontSize="sm" color="fg.muted" mb={1}>
                Month
              </Text>
              <AppSelect value={compareMonth} onChange={(e) => setCompareMonth(e.target.value)} width="180px">
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {formatUtcMonthKey(m, { month: "long" })}
                  </option>
                ))}
              </AppSelect>
            </Box>

            <RadioGroup.Root
              value={groupByMode}
              onValueChange={(e) => setGroupByMode((e.value as GroupByMode) ?? "actualName")}
            >
              <RadioGroup.Label fontSize="sm">Group by</RadioGroup.Label>
              <HStack gap={3}>
                <RadioGroup.Item value="actualName">
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemControl>
                    <RadioGroup.ItemIndicator borderColor="fg" _checked={{ borderColor: "fg.inverted" }} />
                  </RadioGroup.ItemControl>
                  <RadioGroup.ItemText>Actual entries (name)</RadioGroup.ItemText>
                </RadioGroup.Item>
                <RadioGroup.Item value="importedCategory">
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemControl>
                    <RadioGroup.ItemIndicator borderColor="fg" _checked={{ borderColor: "fg.inverted" }} />
                  </RadioGroup.ItemControl>
                  <RadioGroup.ItemText>Imported category</RadioGroup.ItemText>
                </RadioGroup.Item>
              </HStack>
            </RadioGroup.Root>
          </HStack>
        </HStack>

        <HStack
          gap={4}
          wrap="wrap"
          css={{
            "@media (max-width: 1440px)": {
              flexDirection: "column",
              alignItems: "stretch",
            },
            "@media (min-width: 1441px)": {
              flexDirection: "row",
              alignItems: "flex-start",
            },
          }}
        >
          <Box flex="1" minW={{ base: "100%", md: "340px" }}>
            <Heading size="sm" mb={2}>
              Increased spending
            </Heading>

            <Box height="220px" borderWidth={1} borderColor="border" rounded="md" bg="bg.panel" p={2}>
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                initialDimension={{ width: 600, height: 220 }}
              >
                <BarChart
                  data={increaseChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 12, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chakra-colors-border)" />
                  <XAxis type="number" tickFormatter={(v) => (typeof v === "number" ? `$${Math.round(v)}` : "")} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={90}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => clampLabel(String(v ?? ""), 14)}
                  />
                  <RechartsTooltip
                    formatter={(value: unknown) =>
                      typeof value === "number" ? formatCurrency(value) : String(value ?? "")
                    }
                  />
                  <Bar dataKey="delta" name="Δ" fill="var(--chakra-colors-orange-500)" />
                </BarChart>
              </ResponsiveContainer>
            </Box>

            <Box mt={3} p={2} border="2px solid" borderRadius="md" borderColor="border" bg="bg.panel" overflowX="auto">
              <AppTable
                width="100%"
                columns={[
                  { key: "name", header: "Name", bg: "gray.50", color: "gray.900" },
                  { key: "delta", header: "Δ", textAlign: "end" },
                  { key: "current", header: "Current", textAlign: "end", bg: "gray.50", color: "gray.900" },
                  { key: "previous", header: "Previous", textAlign: "end" },
                ]}
                rows={increased}
                emptyText="No increases found."
                renderRow={(r) => (
                  <>
                    <Box as={"td"} px={2} py={1} bg={r.key === "netIncome" ? "teal.50" : r.key === "expenses" ? "orange.50" : r.key === "saved" ? "blue.50" : "gray.50"} fontWeight="bold">
                      <Text fontSize="sm" color="gray.900">{r.key}</Text>
                    </Box>
                    <Box as={"td"} textAlign="end" py={1} px={2} bg="bg.panel">
                      <Text fontSize="sm" color={r.delta > 0 ? "green.500" : r.delta < 0 ? "red.500" : "gray.500"}>{formatDeltaCurrency(r.delta)}</Text>
                    </Box>
                    <Box as={"td"} textAlign="end" py={1} px={2} bg="gray.50">
                      <Text fontSize="sm" color="gray.900">{formatCurrency(r.current)}</Text>
                    </Box>
                    <Box as={"td"} textAlign="end" py={1} px={2} bg="bg.panel">
                      <Text fontSize="sm" color="fg">{formatCurrency(r.previous)}</Text>
                    </Box>
                  </>
                )}
              />
            </Box>
          </Box>

          <Box flex="1" minW={{ base: "100%", md: "340px" }}>
            <Heading size="sm" mb={2}>
              Decreased spending
            </Heading>
            <Box height="220px" borderWidth={1} borderColor="border" rounded="md" bg="bg.panel" p={2}>
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                initialDimension={{ width: 600, height: 220 }}
              >
                <BarChart
                  data={decreaseChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 12, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chakra-colors-border)" />
                  <XAxis type="number" tickFormatter={(v) => (typeof v === "number" ? `$${Math.round(v)}` : "")} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={90}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => clampLabel(String(v ?? ""), 14)}
                  />
                  <RechartsTooltip
                    formatter={(value: unknown) =>
                      typeof value === "number" ? formatCurrency(value) : String(value ?? "")
                    }
                  />
                  <Bar dataKey="delta" name="Δ" fill="var(--chakra-colors-green-500)" />
                </BarChart>
              </ResponsiveContainer>
            </Box>

            <Box mt={3} p={2} border="2px solid" borderRadius="md" borderColor="border" bg="bg.panel" overflowX="auto">
              <AppTable
                width="100%"
                columns={[
                  { key: "name", header: "Name", bg: "gray.50", color: "gray.900" },
                  { key: "delta", header: "Δ", textAlign: "end", color: "fg" },
                  { key: "current", header: "Current", textAlign: "end", bg: "gray.50", color: "gray.900" },
                  { key: "previous", header: "Previous", textAlign: "end", color: "fg" },
                ]}
                rows={decreased}
                emptyText="No decreases found."
                renderRow={(r) => (
                  <>
                    <Box as={"td"} px={2} py={1} bg={r.key === "netIncome" ? "teal.50" : r.key === "expenses" ? "orange.50" : r.key === "saved" ? "blue.50" : "gray.50"} fontWeight="bold">
                      <Text fontSize="sm" color="gray.900">{r.key}</Text>
                    </Box>
                    <Box as={"td"} textAlign="end" py={1} px={2} bg="bg.panel">
                      <Text fontSize="sm" color={r.delta > 0 ? "green.500" : r.delta < 0 ? "red.500" : "gray.500"}>{formatDeltaCurrency(r.delta)}</Text>
                    </Box>
                    <Box as={"td"} textAlign="end" py={1} px={2} bg="gray.50">
                      <Text fontSize="sm" color="gray.900">{formatCurrency(r.current)}</Text>
                    </Box>
                    <Box as={"td"} textAlign="end" py={1} px={2} bg="bg.panel">
                      <Text fontSize="sm" color="fg">{formatCurrency(r.previous)}</Text>
                    </Box>
                  </>
                )}
              />
            </Box>
          </Box>
        </HStack>

        {groupByMode === "importedCategory" ? (
          <Text mt={3} fontSize="xs" color="fg.muted">
            Imported category view uses applied (budgetApplied) expense transactions from accounts. Manual tracker edits may not be reflected.
          </Text>
        ) : null}
      </Box>
    </Stack>
  );
}

export default InsightsPage;
