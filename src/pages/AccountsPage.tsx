import { Button, Heading, Box, useDisclosure, HStack, Text, VStack, useMediaQuery } from '@chakra-ui/react';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import InlineSpinner from '../components/ui/InlineSpinner';
import { useBudgetStore } from "../store/budgetStore";
import AccountCard from '../components/accounts/AccountCard';
import { usePerfMilestone } from "../hooks/usePerfMilestone";
import { Tip } from '../components/ui/Tip';
import { RouterLink } from '../components/RouterLink';
// Dev harness can still be imported manually when needed
// import IngestionDevHarness from '../../dev/IngestionDevHarness';
const SyncAccountsModal = lazy(() => import('../components/ui/SyncAccountsModal'));
const preloadSyncModal = () => import('../components/ui/SyncAccountsModal');

export default function AccountsTracker() {

  const [isPortraitWidth] = useMediaQuery(["(max-width: 450px)"]);

  const clearAllAccounts = useBudgetStore((s) => s.clearAllAccounts);
  const clearAllImportData = useBudgetStore((s) => s.clearAllImportData);
  const resetMonthlyActuals = useBudgetStore((s) => s.resetMonthlyActuals);
  const resetSavingsLogs = useBudgetStore((s) => s.resetSavingsLogs);
  const accounts = useBudgetStore((s) => s.accounts);
  const syncModal = useDisclosure();
  const isDev = import.meta.env.DEV;

  // Render the page shell immediately, then mount the accounts list on the next frame.
  // This avoids the "did my click take?" feeling when rendering is heavy.
  const [showAccountsList, setShowAccountsList] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setShowAccountsList(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const accountEntries = useMemo(() => Object.entries(accounts), [accounts]);
  const hasAccounts = accountEntries.length > 0;

  usePerfMilestone("accounts:mounted");

  const handleImportClick = () => {
    const ok = window.confirm(
      'DEV only: Clear all imported data?\n\nThis will remove accounts, transactions, and import history for your current user scope.\n\nAccount label/institution mappings will be kept.'
    );
    if (!ok) return;
    clearAllImportData?.();
    clearAllAccounts?.();
    resetMonthlyActuals?.();
    resetSavingsLogs?.();
  }
  
  return (
    <Box bg="bg.subtle" p={isPortraitWidth ? 0 : 4} minH="100%">
      <VStack
        p={4}
        maxW={isPortraitWidth ? "100%" : "80%"}
        mx={isPortraitWidth ? "none" : "auto"}
      >
        <VStack mb={4} gap={1}>
          <Heading size="xl" fontWeight={700}>
            Accounts
          </Heading>
          <Text fontSize="sm" color="fg.muted" mx={3}>
            Import a CSV in two steps: set up accounts, then import transactions.
          </Text>
          <Text fontSize="sm" color="fg.muted" mx={3}>
            This page may take a bit to load depending on the number of accounts and transactions imported.
          </Text>
        </VStack>

        <Tip
          title="Getting started"
          storageKey="tip:accounts-getting-started:v1"
          action={
            <HStack gap={2} flexWrap="wrap">
              <Button asChild size="sm" variant="outline" colorPalette="teal">
                <RouterLink to="/imports">Go to Import History (Apply/Undo)</RouterLink>
              </Button>
              <Button asChild size="sm" variant="outline" colorPalette="gray">
                <RouterLink to="/tracker">Go to Tracker</RouterLink>
              </Button>
              <Button asChild size="sm" variant="outline" colorPalette="gray">
                <RouterLink to="/planner">Go to Planner</RouterLink>
              </Button>
            </HStack>
          }
        >
          Use Accounts to import transactions without bank linking. Imports are designed to be deliberate and safe:
          preview first, then stage results so you can apply them to your budget (or undo within the window). After you
          import, click "Apply To Budget" to apply that session; then Tracker will show those transactions as “actuals”
          so you can compare against your plan. Use Import History if you need to review or undo previous imports.
          Imported transactions are kept in sync with your accounts list, so if you undo an import that added an account,
          that account and its transactions will be removed.
        </Tip>

        <HStack gap={4}>
          <Button colorPalette="teal" onClick={syncModal.onOpen} onMouseEnter={preloadSyncModal}>
            Import Account Data
          </Button>
          {isDev && (
            <Button
              colorPalette="red"
              variant="outline"
              onClick={handleImportClick}
            >
              DEV: Clear Imported Data
            </Button>
          )}
        </HStack>
      </VStack>
      <Suspense fallback={<InlineSpinner />}>
        <SyncAccountsModal isOpen={syncModal.open} onClose={syncModal.onClose} />
      </Suspense>

      {hasAccounts ? (
        <Box>
          <Heading size="md" mb={2} mx={4}>
            Synced accounts
          </Heading>

          {!showAccountsList ? (
            <Box mx={4} borderWidth="1px" borderRadius="lg" p={4} bg={"bg.panel"}>
              <HStack gap={3} align="center">
                <InlineSpinner />
                <Text fontSize="sm" color="fg.muted">
                  Loading accounts…
                </Text>
              </HStack>
            </Box>
          ) : (
            accountEntries.map(([accountNumber, acct]) => (
              <Box key={accountNumber} borderWidth="1px" borderRadius="lg" p={4} mb={6} mx={4} bg={"bg.panel"}>
                <AccountCard acct={acct} acctNumber={accountNumber} />
              </Box>
            ))
          )}
        </Box>
      ) : (
        <Box mx={4} borderWidth="1px" borderRadius="lg" p={4} bg={"bg.panel"}>
          <Text fontSize="sm" color="fg.muted">
            No accounts yet. Click “Import Account Data” to get started.
          </Text>
        </Box>
      )}
    </Box>
  );
}