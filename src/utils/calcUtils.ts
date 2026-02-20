// Federal brackets – 2025 Single Filer
type Bracket = { min: number; max: number; rate: number };

type FederalFilingStatus = "single" | "marriedJoint" | "marriedSeparate" | "headOfHousehold";
type FederalBracketsYear = Record<FederalFilingStatus, Bracket[]>;
type FederalBracketsTable = Record<number, FederalBracketsYear>;

const FEDERAL_FILING_STATUSES: readonly FederalFilingStatus[] = [
    "single",
    "marriedJoint",
    "marriedSeparate",
    "headOfHousehold",
];

function isFederalFilingStatus(value: string): value is FederalFilingStatus {
    return (FEDERAL_FILING_STATUSES as readonly string[]).includes(value);
}

export const FEDERAL_BRACKETS: FederalBracketsTable = {
    2024: {
        single: [
            { min: 0, max: 11600, rate: 0.1 },
            { min: 11601, max: 47150, rate: 0.12 },
            { min: 47151, max: 100525, rate: 0.22 },
            { min: 100526, max: 191950, rate: 0.24 },
            { min: 191951, max: 243725, rate: 0.32 },
            { min: 243726, max: 609350, rate: 0.35 },
            { min: 609351, max: Infinity, rate: 0.37 },
        ],
        marriedJoint: [
            { min: 0, max: 23200, rate: 0.1 },
            { min: 23201, max: 94300, rate: 0.12 },
            { min: 94301, max: 201050, rate: 0.22 },
            { min: 201051, max: 383900, rate: 0.24 },
            { min: 383901, max: 487450, rate: 0.32 },
            { min: 487451, max: 731200, rate: 0.35 },
            { min: 731201, max: Infinity, rate: 0.37 },
        ],
        marriedSeparate: [
            { min: 0, max: 11600, rate: 0.1 },
            { min: 11601, max: 47150, rate: 0.12 },
            { min: 47151, max: 100525, rate: 0.22 },
            { min: 100526, max: 191950, rate: 0.24 },
            { min: 191951, max: 243725, rate: 0.32 },
            { min: 243726, max: 365600, rate: 0.35 },
            { min: 365601, max: Infinity, rate: 0.37 },
        ],
        headOfHousehold: [
            { min: 0, max: 16550, rate: 0.1 },
            { min: 16551, max: 63100, rate: 0.12 },
            { min: 63101, max: 100500, rate: 0.22 },
            { min: 100501, max: 191950, rate: 0.24 },
            { min: 191951, max: 243700, rate: 0.32 },
            { min: 243701, max: 609350, rate: 0.35 },
            { min: 609351, max: Infinity, rate: 0.37 },
        ],
    },
    2025: {
        single: [
            { min: 0, max: 11925, rate: 0.1 },
            { min: 11926, max: 48475, rate: 0.12 },
            { min: 48476, max: 103350, rate: 0.22 },
            { min: 103351, max: 197300, rate: 0.24 },
            { min: 197301, max: 250525, rate: 0.32 },
            { min: 250526, max: 626350, rate: 0.35 },
            { min: 626351, max: Infinity, rate: 0.37 },
        ],
        marriedJoint: [
            { min: 0, max: 23850, rate: 0.1 },
            { min: 23851, max: 96950, rate: 0.12 },
            { min: 96951, max: 206700, rate: 0.22 },
            { min: 206701, max: 394600, rate: 0.24 },
            { min: 394601, max: 501050, rate: 0.32 },
            { min: 501051, max: 751600, rate: 0.35 },
            { min: 751601, max: Infinity, rate: 0.37 },
        ],
        marriedSeparate: [
            { min: 0, max: 11925, rate: 0.1 },
            { min: 11926, max: 48475, rate: 0.12 },
            { min: 48476, max: 103350, rate: 0.22 },
            { min: 103351, max: 197300, rate: 0.24 },
            { min: 197301, max: 250525, rate: 0.32 },
            { min: 250526, max: 375800, rate: 0.35 },
            { min: 375800, max: Infinity, rate: 0.37 },
        ],
        headOfHousehold: [
            { min: 0, max: 17000, rate: 0.1 },
            { min: 17001, max: 64850, rate: 0.12 },
            { min: 64851, max: 103350, rate: 0.22 },
            { min: 103351, max: 197300, rate: 0.24 },
            { min: 197301, max: 250500, rate: 0.32 },
            { min: 250501, max: 626350, rate: 0.35 },
            { min: 626351, max: Infinity, rate: 0.37 },
        ],
    },
};

// Wisconsin brackets – 2024
type StateFilingStatus = "single" | "marriedJoint" | "marriedSeparate";
type StateMeta = {
    standardDeduction: number;
    stateName: string;
    filingStatuses: StateFilingStatus[];
};
type StateBracketsConfig = { meta: StateMeta } & Record<StateFilingStatus, Bracket[]>;
type StateBracketsTable = Record<number, Record<string, StateBracketsConfig>>;

const STATE_FILING_STATUSES: readonly StateFilingStatus[] = ["single", "marriedJoint", "marriedSeparate"];

function isStateFilingStatus(value: string): value is StateFilingStatus {
    return (STATE_FILING_STATUSES as readonly string[]).includes(value);
}

export const STATE_BRACKETS: StateBracketsTable = {
    2024: {
        WI: {
            meta: {
                standardDeduction: 11800,
                stateName: 'Wisconsin',
                filingStatuses: ['single', 'marriedJoint', 'marriedSeparate'],
            },
            single: [
                { min: 0, max: 14320, rate: 0.035 },
                { min: 14321, max: 28640, rate: 0.044 },
                { min: 28641, max: 315310, rate: 0.053 },
                { min: 315311, max: Infinity, rate: 0.0765 },
            ],
            marriedJoint: [
                { min: 0, max: 28640, rate: 0.035 },
                { min: 28641, max: 57280, rate: 0.044 },
                { min: 57281, max: 630620, rate: 0.053 },
                { min: 630621, max: Infinity, rate: 0.0765 },
            ],
            marriedSeparate: [
                { min: 0, max: 14320, rate: 0.035 },
                { min: 14321, max: 28640, rate: 0.044 },
                { min: 28641, max: 315310, rate: 0.053 },
                { min: 315311, max: Infinity, rate: 0.0765 },
            ],
        },
        IL: {
            meta: {
                standardDeduction: 11800,
                stateName: 'Illinois',
                filingStatuses: ['single', 'marriedJoint', 'marriedSeparate'],
            },
            single: [
                { min: 0, max: 10000, rate: 0.04 },
                { min: 10001, max: 20000, rate: 0.05 },
                { min: 20001, max: 50000, rate: 0.06 },
                { min: 50001, max: Infinity, rate: 0.07 },
            ],
            marriedJoint: [
                { min: 0, max: 20000, rate: 0.04 },
                { min: 20001, max: 40000, rate: 0.05 },
                { min: 40001, max: 100000, rate: 0.06 },
                { min: 100001, max: Infinity, rate: 0.07 },
            ],
            marriedSeparate: [
                { min: 0, max: 10000, rate: 0.04 },
                { min: 10001, max: 20000, rate: 0.05 },
                { min: 20001, max: 50000, rate: 0.06 },
                { min: 50001, max: Infinity, rate: 0.07 },
            ],
        },
    },
};

export function calculateBracketTax(gross: number, brackets: Bracket[]): number {
    let tax = 0;
    for (const bracket of brackets) {
        const taxable = Math.min(gross, bracket.max) - bracket.min;
        if (taxable > 0) {
            tax += taxable * bracket.rate;
        }
        if (gross < bracket.max) break;
    }
    return tax;
}

export function calculateSSTaxes(gross: number) {
    // This function calculates Social Security taxes based on the gross income.
    const SOCIAL_SECURITY_RATE = 0.062;
    const SOCIAL_SECURITY_WAGE_CAP = 168600;
    const ssTax = Math.min(gross, SOCIAL_SECURITY_WAGE_CAP) * SOCIAL_SECURITY_RATE;
    return ssTax as number;
}

export function calculateMedicareTaxes(gross: number) {
    // This function calculates Social Security taxes based on the gross income.
    const MEDICARE_RATE = 0.0145;
    const medicareTax = gross * MEDICARE_RATE;
    return medicareTax as number;
}

export function calculateTotalTaxes(gross: number, filingStatus: string, year: number = 2025, state = 'WI') {
    // This function calculates total taxes based on gross income and state.

    const federalYear = FEDERAL_BRACKETS[year] ?? FEDERAL_BRACKETS[2024];
    const federalBrackets = isFederalFilingStatus(filingStatus) ? federalYear[filingStatus] : federalYear.single;

    const stateYear = STATE_BRACKETS[year] ?? STATE_BRACKETS[2024];
    const stateConfig = stateYear?.[state];
    const stateBrackets = stateConfig
      ? (isStateFilingStatus(filingStatus) ? stateConfig[filingStatus] : stateConfig.single)
      : [];

    const federalTax = calculateBracketTax(gross, federalBrackets);
    const stateTax = calculateBracketTax(gross, stateBrackets);
    const ssTax = calculateSSTaxes(gross);
    const medicareTax = calculateMedicareTaxes(gross);

    return {
        federalTax: federalTax as number,
        stateTax: stateTax as number,
        ssTax: ssTax as number,
        medicareTax: medicareTax as number,
        total: (federalTax + stateTax + ssTax + medicareTax) as number,
    };
}

// Helper module for calculating financial values
type IncomeSourceLike = { type?: unknown; [key: string]: unknown };

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function calculateNetIncome(incomeSources: IncomeSourceLike[]) {
    const OT_THRESHOLD = 40;
    const WEEKS_PER_YEAR = 52;
    const BIWEEKLY_PERIODS_PER_YEAR = 26;

    if (!incomeSources || incomeSources.length === 0) return 0;

    return incomeSources.reduce((sum, src) => {
        const type = typeof src.type === "string" ? src.type : "";
        if (type === 'hourly') {
            const hoursPerWeek = asNumber(src.hoursPerWeek);
            const hourlyRate = asNumber(src.hourlyRate);
            const base = Math.min(hoursPerWeek, OT_THRESHOLD);
            const ot = Math.max(hoursPerWeek - OT_THRESHOLD, 0);
            return sum + (base * hourlyRate + ot * hourlyRate * 1.5) * WEEKS_PER_YEAR;
        } else if (type === 'weekly') {
            return sum + asNumber(src.weeklySalary) * WEEKS_PER_YEAR;
        } else if (type === 'bi-weekly') {
            return sum + asNumber(src.biWeeklySalary) * BIWEEKLY_PERIODS_PER_YEAR;
        } else if (type === 'salary') {
            return sum + asNumber(src.grossSalary);
        } else if (type === 'fixed') {
            return sum + asNumber(src.amount);
        }
        return sum;
    }, 0);
}
