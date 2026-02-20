import { useMemo } from "react";
import { Heading, Table, Button, HStack, Text, Card  } from "@chakra-ui/react";
import { findRecurringTransactions, type RecurringFinding } from "../../utils/analysisUtils";
import { useBudgetStore } from "../../store/budgetStore";
import type { Account, Transaction } from "../../types";

/* Note: this component is focused on displaying recurring transactions
// identified in the system, and providing basic management (save/delete).
// It does not currently support creating new recurring transactions or
// editing details beyond amount - these would require additional inputs
// and complexity around scheduling, which can be considered for future
// iterations if desired by users. */
const noop = () => {};

type RecurringPaymentsCardProps = {
  account: Account;
};

type MonthlyRecurring = Extract<RecurringFinding, { frequency: "monthly" }>;
type ConfirmedRecurring = MonthlyRecurring & { status: "confirmed" };

function isConfirmedRecurring(r: RecurringFinding): r is ConfirmedRecurring {
  return r.frequency === "monthly" && r.status === "confirmed";
}

export default function RecurringPaymentsCard({ account }: RecurringPaymentsCardProps) {
  const updateRecurring = useBudgetStore((s) => s.updateRecurring ?? noop);
  const removeRecurring = useBudgetStore((s) => s.removeRecurring ?? noop);

  const currentAccount = account;
  const currentTransactions = useMemo(() => (currentAccount.transactions ?? []) as Transaction[], [currentAccount]);
  const recurring = useMemo(
    () => findRecurringTransactions(currentTransactions),
    [currentTransactions]
  );
  const totalRecurring = useMemo(
    () => recurring.reduce((sum, r) => sum + (r.status === 'confirmed' ? Number(r.avgAmount) : 0), 0),
    [recurring]
  );

  // debug: recurring analysis results available via recurring variable

  return (
    <Card.Root p={4} borderWidth="1px" borderColor="border" borderRadius="lg" bg="bg.panel" boxShadow="sm">
      <Card.Header><Heading size="md">{currentAccount.label}</Heading></Card.Header>
      <Table.Root size="sm" variant="line">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader borderRightWidth="2px" borderRightColor="border">Name</Table.ColumnHeader>
            <Table.ColumnHeader>Category</Table.ColumnHeader>
            <Table.ColumnHeader>Freq</Table.ColumnHeader>
            <Table.ColumnHeader>Day/Week</Table.ColumnHeader>
            <Table.ColumnHeader>Amount</Table.ColumnHeader>
            <Table.ColumnHeader>Actions</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {recurring
             .filter(isConfirmedRecurring)
             .map((r) => (
            <Table.Row key={`${currentAccount.accountNumber}:${r.description}:${r.dayOfMonth ?? 'n'}`}>
            <Table.Cell borderRightWidth="2px" borderRightColor="border">{r.description}</Table.Cell>
            <Table.Cell>{r.category || "—"}</Table.Cell>
            <Table.Cell textTransform="capitalize">{r.frequency}</Table.Cell>
            <Table.Cell>
              {`Day ${r.dayOfMonth || 1}`}
            </Table.Cell>
            <Table.Cell borderRightWidth="2px" borderRightColor="border">{Number(r.avgAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Table.Cell>
            <Table.Cell>
              <HStack gap={2}>
                <Button size="xs" colorScheme="blackAlpha" variant="solid" onClick={() => updateRecurring(r.id, { amount: Number(r.avgAmount) })}>Save</Button>
                <Button size="xs" colorScheme="red" variant="outline" onClick={() => removeRecurring(r.id)}>Delete</Button>
              </HStack>
            </Table.Cell>
          </Table.Row>
          ))}
          {recurring
             .filter((r) => r.status === 'confirmed').length === 0 ? (
            <Table.Row><Table.Cell colSpan={9}><Text color="fg.muted">No recurring transactions for this account.</Text></Table.Cell></Table.Row>
          ) : (
            <Table.Row>
              <Table.Cell borderRightWidth="2px" borderRightColor="border"><Text fontWeight={'bold'}>Total</Text></Table.Cell>
              <Table.Cell colSpan={3}></Table.Cell>
              <Table.Cell borderRightWidth="2px" borderRightColor="border"><Text fontWeight={'bold'}>{totalRecurring.toLocaleString()}</Text></Table.Cell>
              <Table.Cell><Button size="xs" colorScheme="red" variant="outline" onClick={() => {/* TODO: implement bulk clear in store if desired */}}>Clear all transactions</Button></Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>
    </Card.Root>
  );
}