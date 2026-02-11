import { Box, Heading, Flex, Button } from "@chakra-ui/react";
import { useBudgetStore } from "../../store/budgetStore";
import RecurringPaymentsCard from "./RecurringPaymentsCard";
import { AppCollapsible } from "../ui/AppCollapsible";

export default function RecurringManager() {

  const showRecurringTXs = useBudgetStore((s) => s.showRecurringTXs);
  const setShowRecurringTXs = useBudgetStore((s) => s.setShowRecurringTXs);
  const accounts = useBudgetStore((s) => s.accounts);

  return (
    <Box mt={6} p={4} borderWidth="1px" borderRadius="lg" bg="white" boxShadow="md">
      <Flex justifyContent="space-between" alignItems="center" mb={3}>
        <Heading size="md">Recurring Payments Tracker</Heading>
        <Button size="xs" variant="plain" colorScheme="blue" ml={2} onClick={() => setShowRecurringTXs(!showRecurringTXs)}>
          {showRecurringTXs ? 'Hide All Transactions' : 'Show All Transactions'}
        </Button>
      </Flex>
      
      <AppCollapsible title="Recurring Payments" mb={4} defaultOpen={showRecurringTXs}>
        {accounts && Object.keys(accounts).length > 0 ? (
          <>
            {Object.values(accounts).map((account: any) => {
              <Box key={account.id} mt={4} color="gray.600">
                <RecurringPaymentsCard account={account} />
              </Box>
            })}
          </>
        ) : (
          <Box mt={4} color="gray.600">
            No accounts found. Please add an account to manage recurring payments.
          </Box>
        )}
      </AppCollapsible>
    </Box>
  );
}