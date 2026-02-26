import { Button, Heading, Box, useDisclosure, HStack, Text, VStack, useMediaQuery } from '@chakra-ui/react';
import { Suspense, lazy } from 'react';
import InlineSpinner from '../components/ui/InlineSpinner';
import { useBudgetStore } from "../store/budgetStore";
import AccountCard from '../components/accounts/AccountCard';
import { usePerfMilestone } from "../hooks/usePerfMilestone";
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
        </VStack>

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

      {Object.entries(accounts).length > 0 ? (
        <Box>
          <Heading size="md" mb={2} mx={4}>
            Synced accounts
          </Heading>

          {Object.entries(accounts).map(([accountNumber, acct]) => (
            <Box key={accountNumber} borderWidth="1px" borderRadius="lg" p={4} mb={6} mx={4} bg={"bg.panel"}>
              <AccountCard acct={acct} acctNumber={accountNumber} />
            </Box>
          ))}
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