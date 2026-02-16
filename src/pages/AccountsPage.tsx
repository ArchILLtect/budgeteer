import { Button, Center, Heading, Box, useDisclosure, HStack, Text, VStack } from '@chakra-ui/react';
import { Suspense, lazy } from 'react';
import InlineSpinner from '../components/ui/InlineSpinner';
import { useBudgetStore } from "../store/budgetStore";
import AccountCard from '../components/accounts/AccountCard';
// Dev harness can still be imported manually when needed
// import IngestionDevHarness from '../../dev/IngestionDevHarness';
const SyncAccountsModal = lazy(() => import('../components/ui/SyncAccountsModal'));
const preloadSyncModal = () => import('../components/ui/SyncAccountsModal');

export default function AccountsTracker() {

  const accounts = useBudgetStore((s) => s.accounts);
  const clearAllAccounts = useBudgetStore((s: any) => s.clearAllAccounts);
  const clearAllAccountMappings = useBudgetStore((s: any) => s.clearAllAccountMappings);
  const clearAllImportData = useBudgetStore((s: any) => s.clearAllImportData);
  const resetMonthlyActuals = useBudgetStore((s: any) => s.resetMonthlyActuals);
  const resetSavingsLogs = useBudgetStore((s: any) => s.resetSavingsLogs);
  const syncModal = useDisclosure();
  const bg = "bg";
  const isDev = import.meta.env.DEV;
  

  return (
    <>
      <VStack gap={2} mb={4}>
        <Heading size="lg">Accounts</Heading>
        <Text fontSize="sm" color="fg.muted">
          Import a CSV in two steps: set up accounts, then import transactions.
        </Text>
        <Center>
          <HStack gap={4}>
            <Button colorScheme="teal" onClick={syncModal.onOpen} onMouseEnter={preloadSyncModal}>
              Import CSV
            </Button>
            {isDev && (
              <Button
                colorScheme="red"
                variant="outline"
                onClick={() => {
                  const ok = window.confirm(
                    'DEV only: Clear all imported data?\n\nThis will remove accounts, account mappings, and import history for your current user scope.'
                  );
                  if (!ok) return;
                  clearAllImportData?.();
                  clearAllAccounts?.();
                  clearAllAccountMappings?.();
                  resetMonthlyActuals?.();
                  resetSavingsLogs?.();
                }}
              >
                DEV: Clear Imported Data
              </Button>
            )}
          </HStack>
        </Center>
      </VStack>
      <Suspense fallback={<InlineSpinner />}>
        <SyncAccountsModal isOpen={syncModal.open} onClose={syncModal.onClose} />
      </Suspense>
      {/* ...rest of the AccountsTracker UI */}
      {Object.entries(accounts).length > 0 ? (
        <Box>
          <Heading size="md" mb={2} mx={4}>
            Synced accounts
          </Heading>

          {Object.entries(accounts).map(([accountNumber, acct]) => (
            <Box key={accountNumber} borderWidth="1px" borderRadius="lg" p={4} mb={6} mx={4} bg={bg}>
              <AccountCard acct={acct} acctNumber={accountNumber} />
            </Box>
          ))}
        </Box>
      ) : (
        <Box mx={4} borderWidth="1px" borderRadius="lg" p={4}>
          <Text fontSize="sm" color="fg.muted">
            No accounts yet. Click “Import CSV” to get started.
          </Text>
        </Box>
      )}
    </>
  );
}