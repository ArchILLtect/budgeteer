import dayjs from 'dayjs';
import { Button, ButtonGroup } from '@chakra-ui/react';
import { useMemo } from 'react';
import { useBudgetStore } from '../../store/budgetStore';

type YearPillProps = {
  months: string[]; // array of "YYYY-MM" month keys available for the account
};

export function YearPill({ months }: YearPillProps) {
  const selectedMonth = useBudgetStore((s) => s.selectedMonth);
  const setSelectedMonth = useBudgetStore((s) => s.setSelectedMonth);

  // years from "YYYY-MM" month keys
  const years = useMemo(() => {
    const ys = new Set(months.map((m) => m.slice(0, 4)));
    return Array.from(ys).sort((a, b) => a.localeCompare(b)); // newest → oldest
  }, [months]);

  const handleYearClick = (y: string) => {
    const currentMonthNum = dayjs(selectedMonth).format('MM');
    const sameMonthKey = `${y}-${currentMonthNum}`;

    // Prefer same month in that year; else latest available in that year
    const fallback = months
      .filter((m) => m.startsWith(y))
      .sort()                // ascending
      .at(-1);               // latest in that year

    const target = months.includes(sameMonthKey) ? sameMonthKey : fallback;
    if (target) setSelectedMonth(target);
  };

  return (
    <ButtonGroup gap={2}>
      {years.map((y: string) => {
        const isActive = selectedMonth?.startsWith(`${y}-`);
        return (
          <Button
            key={y}
            onClick={() => handleYearClick(y)}
            colorScheme={isActive ? 'teal' : 'gray'}
            variant={isActive ? 'solid' : 'ghost'}
            fontWeight={isActive ? 'bold' : 'normal'}
            size="md"
            aria-pressed={isActive ? 'true' : 'false'}
          >
            {y}
          </Button>
        );
      })}
    </ButtonGroup>
  );
}