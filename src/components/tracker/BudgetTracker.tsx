import { Box } from '@chakra-ui/react';
import MonthlyPlanSummary from './MonthlyPlanSummary';
import { Suspense, lazy } from 'react';
import InlineSpinner from '../../components/ui/InlineSpinner';
const MonthlyActualSummary = lazy(() => import('./MonthlyActualSummary'));
import SavingsLog from './SavingsLog';
import RecurringManager from './RecurringManager';

export default function BudgetTracker() {

  return (
    <Box>
      <MonthlyPlanSummary />
      <Suspense fallback={<InlineSpinner />}>
        <MonthlyActualSummary />
      </Suspense>
      <RecurringManager />
      <SavingsLog />
    </Box>
  );
}