import { Table, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

type Column = {
  key: string;
  header: ReactNode;
  bg?: string;
  color?: string;
  textAlign?: "start" | "center" | "end";
  width?: string;
};

type AppTableProps<T> = {
  size?: "sm" | "md" | "lg";
  width?: string;
  variant?: "line" | "outline"; // whatever your theme supports
  striped?: boolean;
  columns: Column[];
  rows: T[];
  renderRow: (row: T) => ReactNode; // should return <Table.Cell>...</Table.Cell>...
  emptyText?: string;
};

export function AppTable<T>({
  size = "sm",
  width,
  variant = "line",
  striped = false,
  columns,
  rows,
  renderRow,
  emptyText = "No results.",
}: AppTableProps<T>) {
  return (
    <Table.Root size={size} width={width} variant={variant} striped={striped}>
      <Table.Header>
        <Table.Row bg="bg.panel">
          {columns.map((c) => (
            <Table.ColumnHeader key={c.key} textAlign={c.textAlign} width={c.width} bg={c.bg} color={c.color}>
              {c.header}
            </Table.ColumnHeader>
          ))}
        </Table.Row>
      </Table.Header>

      <Table.Body>
        {rows.map((row, idx) => (
          <Table.Row
            key={
              (typeof row === "object" && row !== null && "id" in row
                ? (row as { id?: string | number }).id
                : undefined) ?? idx
            }
          >
            {renderRow(row)}
          </Table.Row>
        ))}

        {rows.length === 0 && (
          <Table.Row>
            <Table.Cell colSpan={columns.length}>
              <Text fontSize="sm" color="fg.muted" textAlign="center" py={6}>
                {emptyText}
              </Text>
            </Table.Cell>
          </Table.Row>
        )}
      </Table.Body>
    </Table.Root>
  );
}
