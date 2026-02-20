// Enhanced patch builder: bootstraps new account metadata safely.
import type { Transaction } from "../types";

// Enhanced patch builder: bootstraps new account metadata safely.
export function buildPatch(accountNumber: string, existingTxns: Transaction[], newTxns: Transaction[]) {
    const merged = [...existingTxns, ...newTxns].sort((a, b) =>
        (a.date ?? "").localeCompare(b.date ?? "")
    );

    // Try to glean metadata from the first new transaction's original row
    const firstOrig = newTxns.find((t) => t.original)?.original as Record<string, unknown> | undefined;
    const inferredType =
        (firstOrig?.AccountType || firstOrig?.accountType || '')
            .toString()
            .trim()
            .toLowerCase() || 'checking';

    return (state: unknown) => {
        const prev = (state as { accounts?: Record<string, unknown> })?.accounts?.[accountNumber] as
            | Record<string, unknown>
            | undefined;

        const baseNew = {
            accountNumber,
            label: accountNumber, // default label
            type: inferredType, // crude inference; user can edit later
            transactions: [],
        };

        const nextAccount = prev
            ? {
                  ...baseNew,
                  ...prev, // keep all existing custom fields
                  transactions: merged,
              }
            : {
                  ...baseNew,
                  transactions: merged,
              };

        const accounts = (state as { accounts?: Record<string, unknown> })?.accounts || {};

        return {
            accounts: {
                ...accounts,
                [accountNumber]: nextAccount,
            },
        };
    };
}
