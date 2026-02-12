import { useMemo } from "react";
import { Heading, Table, Button, HStack, Text, Card  } from "@chakra-ui/react";
import { findRecurringTransactions } from "../../utils/analysisUtils";
import { useBudgetStore } from "../../store/budgetStore";

type RecurringPaymentsCardProps = {
  account: {
    accountNumber: string;
    label: string;
    transactions?: {
      id: string;
      description: string;
      category?: string;
      frequency: 'weekly' | 'biweekly' | 'monthly' | 'other';
      dayOfMonth?: number;
      weekday?: number;
      start?: string;
      avgAmount: number;
      status: 'confirmed' | 'possible';
    }[];
  };
};

export default function RecurringPaymentsCard({ account }: RecurringPaymentsCardProps) {
  const updateRecurring = useBudgetStore((s: any) => s.updateRecurring ?? (() => {}));
  const removeRecurring = useBudgetStore((s: any) => s.removeRecurring ?? (() => {}));

  const currentAccount = account;
  const currentTransactions = useMemo(() => currentAccount.transactions ?? [], [currentAccount]);
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
    <Card.Root p={4} borderWidth="1px" borderRadius="lg" bg="white" boxShadow="sm">
      <Card.Header><Heading size="md">{currentAccount.label}</Heading></Card.Header>
      <Table.Root size="sm" variant="line">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader borderRightWidth="2px" borderRightColor="gray.200">Name</Table.ColumnHeader>
            <Table.ColumnHeader>Category</Table.ColumnHeader>
            <Table.ColumnHeader>Freq</Table.ColumnHeader>
            <Table.ColumnHeader>Day/Week</Table.ColumnHeader>
            <Table.ColumnHeader>Amount</Table.ColumnHeader>
            <Table.ColumnHeader>Actions</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {recurring
             .filter((r) => r.status === 'confirmed')
             .map((r: any) => (
            <Table.Row key={`${currentAccount.accountNumber}:${r.description}:${r.dayOfMonth ?? r.weekday ?? r.start ?? 'n'}`}>
            <Table.Cell borderRightWidth="2px" borderRightColor="gray.200">{r.description}</Table.Cell>
            <Table.Cell>{r.category || "—"}</Table.Cell>
            <Table.Cell textTransform="capitalize">{r.frequency}</Table.Cell>
            <Table.Cell>
              {r.frequency === 'monthly' ? `Day ${r.dayOfMonth || 1}`
                : r.frequency === 'weekly' ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][r.weekday ?? 0]
                : r.frequency === 'biweekly' ? `Every 14d from ${r.start}` : '—'}
            </Table.Cell>
            <Table.Cell borderRightWidth="2px" borderRightColor="gray.200">{Number(r.avgAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Table.Cell>
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
            <Table.Row><Table.Cell colSpan={9}><Text color="gray.500">No recurring transactions for this account.</Text></Table.Cell></Table.Row>
          ) : (
            <Table.Row>
              <Table.Cell borderRightWidth="2px" borderRightColor="gray.200"><Text color="gray.700" fontWeight={'bold'}>Total</Text></Table.Cell>
              <Table.Cell colSpan={3}></Table.Cell>
              <Table.Cell borderRightWidth="2px" borderRightColor="gray.200"><Text color="gray.700" fontWeight={'bold'}>{totalRecurring.toLocaleString()}</Text></Table.Cell>
              <Table.Cell><Button size="xs" colorScheme="red" variant="outline" onClick={() => {/* TODO: implement bulk clear in store if desired */}}>Clear all transactions</Button></Table.Cell>
            </Table.Row>
          )
        }
        </Table.Body>
      </Table.Root>
    </Card.Root>
  );
}