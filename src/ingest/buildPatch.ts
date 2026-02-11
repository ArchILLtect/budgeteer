// Enhanced patch builder: bootstraps new account metadata safely.
export function buildPatch(accountNumber: string, existingTxns: any[], newTxns: any[]) {
    const merged = [...existingTxns, ...newTxns].sort((a, b) =>
        a.date.localeCompare(b.date)
    );

    // Try to glean metadata from the first new transaction's original row
    const firstOrig = newTxns.find((t) => t.original)?.original;
    const inferredType =
        (firstOrig?.AccountType || firstOrig?.accountType || '')
            .toString()
            .trim()
            .toLowerCase() || 'checking';

    return (state: any) => {
        const prev = state.accounts[accountNumber];

        const baseNew = {
            accountNumber,
            label: accountNumber, // default label
            type: inferredType, // crude inference; user can edit later
            transactions: [],
        };

        const nextAccount = prev
            ? {
                  ...baseNew,
                  ...prev, // keep any existing custom fields
                  transactions: merged,
              }
            : {
                  ...baseNew,
                  transactions: merged,
              };

        return {
            accounts: {
                ...state.accounts,
                [accountNumber]: nextAccount,
            },
        };
    };
}
