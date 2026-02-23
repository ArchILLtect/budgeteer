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

  const editRecurring = (rtx: RecurringFinding) => {
    console.log("Edit recurring transaction:", rtx);
  };

  // debug: recurring analysis results available via recurring variable

  return (
    <Card.Root p={4} borderWidth="1px" borderColor="border" borderRadius="lg" bg="bg.panel" boxShadow="sm">
      <Card.Header borderTop={"1px solid"} borderRight={"1px solid"} borderLeft={"1px solid"} borderColor="border" borderTopRadius="lg" pb={2} px={5} pt={2} bg={"bg.muted"}>
        <Heading size="lg">{currentAccount.label}</Heading>
      </Card.Header>
      <Table.Root size="sm" striped borderWidth={1} borderColor="border" borderRadius="md">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader borderRightWidth="2px" borderRightColor="border" fontSize="md" fontWeight={"bold"}>Name</Table.ColumnHeader>
            <Table.ColumnHeader borderRightWidth="2px" borderRightColor="border" fontSize="md" fontWeight={"bold"}>Category</Table.ColumnHeader>
            <Table.ColumnHeader borderRightWidth="2px" borderRightColor="border" fontSize="md" fontWeight={"bold"}>Freq</Table.ColumnHeader>
            <Table.ColumnHeader borderRightWidth="2px" borderRightColor="border" fontSize="md" fontWeight={"bold"}>Day/Week</Table.ColumnHeader>
            <Table.ColumnHeader borderRightWidth="2px" borderRightColor="border" fontSize="md" fontWeight={"bold"}>Amount</Table.ColumnHeader>
            <Table.ColumnHeader borderLeftWidth="2px" borderLeftColor="border" fontSize="md" fontWeight={"bold"} width="fit-content">Actions</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {recurring
            .filter(isConfirmedRecurring)
            .map((rtx, idx) => {

              const stripedBg =
                idx % 2 === 1
                  ? ({ base: "teal.100", _dark: "teal.800" } as const)
                  : ({ base: "teal.800", _dark: "teal.50" } as const)

              return (
                <Table.Row key={`${currentAccount.accountNumber}:${rtx.description}:${rtx.dayOfMonth ?? 'n'}`} bg={stripedBg}>
                  <Table.Cell borderRightWidth="2px" borderRightColor="border">{rtx.name || rtx.description}</Table.Cell>
                  <Table.Cell borderRightWidth="2px" borderRightColor="border">{rtx.category || "—"}</Table.Cell>
                  <Table.Cell borderRightWidth="2px" borderRightColor="border" textTransform="capitalize">{rtx.frequency}</Table.Cell>
                  <Table.Cell borderRightWidth="2px" borderRightColor="border">
                    {`Day ${rtx.dayOfMonth || 1}`}
                  </Table.Cell>
                  <Table.Cell borderRightWidth="2px" borderRightColor="border">{Number(rtx.avgAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Table.Cell>
                  <Table.Cell width="fit-content">
                    <HStack gap={2} justifyContent="end">
                      <Button size="xs" colorPalette="blue" variant="outline" onClick={() => editRecurring(rtx)}>Edit</Button>
                      <Button size="xs" colorPalette="green" variant="outline" onClick={() => updateRecurring(rtx.id, { amount: Number(rtx.avgAmount) })}>Save</Button>
                      <Button size="xs" colorPalette="red" variant="outline" onClick={() => removeRecurring(rtx.id)}>Delete</Button>
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              )
            })
          }
          {recurring
             .filter((rtx) => rtx.status === 'confirmed').length === 0 ? (
            <Table.Row><Table.Cell colSpan={9}><Text color="fg.muted">No recurring transactions for this account.</Text></Table.Cell></Table.Row>
          ) : (
            <Table.Row>
              <Table.Cell><Text fontWeight={'bold'}>Total</Text></Table.Cell>
              <Table.Cell colSpan={3}></Table.Cell>
              <Table.Cell><Text fontWeight={'bold'}>{totalRecurring.toLocaleString()}</Text></Table.Cell>
              <Table.Cell borderLeftWidth="2px" borderLeftColor="border" width="fit-content"><Button size="xs" colorPalette="red" variant="outline" onClick={() => {/* TODO: implement bulk clear in store if desired */}}>Clear all transactions</Button></Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>
    </Card.Root>
  );
}