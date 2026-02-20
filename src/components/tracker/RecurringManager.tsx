import { Box, Heading, Flex, Button } from "@chakra-ui/react";
import { useBudgetStore } from "../../store/budgetStore";
import RecurringPaymentsCard from "./RecurringPaymentsCard";
import { AppCollapsible } from "../ui/AppCollapsible";
import type { Account } from "../../types";

export default function RecurringManager() {

  const showRecurringTXs = useBudgetStore((s) => s.showRecurringTXs);
  const setShowRecurringTXs = useBudgetStore((s) => s.setShowRecurringTXs);
  const accounts = useBudgetStore((s) => s.accounts);

  return (
    <Box mt={6} p={4} borderWidth="1px" borderColor="border" borderRadius="lg" bg="bg.panel" boxShadow="md">
      <Flex justifyContent="space-between" alignItems="center" mb={3}>
        <Heading size="md">Recurring Payments Tracker</Heading>
        <Button size="xs" variant="plain" colorScheme="blue" ml={2} onClick={() => setShowRecurringTXs(!showRecurringTXs)}>
          {showRecurringTXs ? 'Hide All Transactions' : 'Show All Transactions'}
        </Button>
      </Flex>
      
      <AppCollapsible title="Recurring Payments" mb={4} open={showRecurringTXs} onOpenChange={setShowRecurringTXs}>
        {accounts && Object.keys(accounts).length > 0 ? (
          <>
            {(Object.values(accounts) as Account[]).map((account, idx) => (
              <Box key={account.id ?? account.accountNumber ?? idx} mt={4} color="fg.muted">
                <RecurringPaymentsCard account={account} />
              </Box>
            ))}
          </>
        ) : (
          <Box mt={4} color="fg.muted">
            No accounts found. Please add an account to manage recurring payments.
          </Box>
        )}
      </AppCollapsible>
    </Box>
  );
}