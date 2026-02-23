import { writeFileSync } from "node:fs";
import path from "node:path";

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Deterministic PRNG (LCG)
function makeRng(seed = 123456789) {
  let state = seed >>> 0;
  return () => {
    // Numerical Recipes LCG
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function fmtPostedDate(d) {
  // M/D/YYYY (matches bank export sample)
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function fmtAmountBankStyle(signed) {
  const abs = Math.abs(signed);
  const txt = abs.toFixed(2);
  if (signed < 0) return `(${txt.startsWith("$") ? txt : `$${txt}`})`.replace("($$", "($");
  return `$${txt}`;
}

function quote(s) {
  const v = String(s ?? "");
  return `"${v.replace(/"/g, '""')}"`;
}

function toHistoryCsv({
  accountNumber,
  accountType,
  rows,
  startingBalance,
}) {
  const header = [
    "AccountNumber",
    "AccountType",
    "Posted Date",
    "Amount",
    "Description",
    "Check Number",
    "Category",
    "Balance",
    "Note",
    "", // bank file has trailing comma; keep it for compatibility
  ];

  let bal = Number(startingBalance);
  if (!Number.isFinite(bal)) bal = 0;

  const lines = [];
  lines.push(header.map(quote).join(","));

  for (const r of rows) {
    bal = bal + r.signedAmount;

    const line = [
      quote(accountNumber),
      quote(accountType),
      fmtPostedDate(r.postedDate),
      fmtAmountBankStyle(r.signedAmount),
      quote(r.description),
      quote(r.checkNumber ?? ""),
      quote(r.category ?? "Uncategorized"),
      `$${bal.toFixed(2)}`,
      quote(r.note ?? ""),
      "", // trailing empty column
    ].join(",");

    lines.push(line);
  }

  return lines.join("\n") + "\n";
}

function daysInMonth(year, monthIndex0) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function jitteredDay({ year, monthIndex0, baseDay, jitterMax, rng }) {
  const dim = daysInMonth(year, monthIndex0);
  const jitter = jitterMax > 0 ? randInt(rng, -jitterMax, jitterMax) : 0;
  const day = Math.min(dim, Math.max(1, baseDay + jitter));
  return day;
}

function buildMonthRows({ year, monthIndex0, count, seed }) {
  const rng = makeRng(seed);

  // “Average American” flavored story: stable income, housing-heavy spend,
  // and a mix of predictable + noisy daily transactions.
  const recurring = [
    // Income: semi-monthly (exactly 1st + 15th)
    { day: 1, jitter: 0, description: "ACH:VISTA TECH PAYROLL", signedAmount: 3800.0, category: "Misc. Income", note: "budgeteer:rename=Primary Paycheck" },
    { day: 15, jitter: 0, description: "ACH:VISTA TECH PAYROLL", signedAmount: 3800.0, category: "Misc. Income" },

    // Housing: ~avg monthly, allow small posting jitter
    { day: 1, jitter: 1, description: "ACH:Redwood Grove RENT", signedAmount: -2189.0, category: "Mortgage / Rent" },

    // Transportation + utilities + common recurring expenses
    { day: 5, jitter: 1, description: "ACH:AUTO LOAN PAYMENT", signedAmount: -425.0, category: "Auto & Transport", note: "budgeteer:goal=Auto Loan Down-payment" },
    { day: 18, jitter: 1, description: "ACH:AUTO INSURANCE", signedAmount: -165.0, category: "Insurance" },
    { day: 6, jitter: 1, description: "ACH:ISP INTERNET BILL", signedAmount: -79.99, category: "Internet" },
    { day: 10, jitter: 1, description: "ACH:MOBILE PHONE", signedAmount: -68.0, category: "Utilities" },
    { day: 13, jitter: 2, description: "ACH:ELECTRIC BILL", signedAmount: -146.5, category: "Utilities" },
    { day: 22, jitter: 2, description: "ACH:WATER BILL", signedAmount: -42.75, category: "Utilities" },
    { day: 9, jitter: 1, description: "ACH:STREAMING SUBSCRIPTION", signedAmount: -19.99, category: "Entertainment" },
    { day: 8, jitter: 1, description: "ACH:GYM MEMBERSHIP", signedAmount: -39.99, category: "Health" },

    // Savings-ish transfer (classified as savings by importer due to TFR TO SV)
    { day: 16, jitter: 1, description: "Web Branch:TFR TO SV 0001112223", signedAmount: -350.0, category: "Transfer", note: "budgeteer:apply=savings; budgeteer:goal=Yearly Savings Goal 2026" },

    // Small recurring side income sometimes
    { day: 20, jitter: 2, description: "ACH:MOONLIGHT GIG", signedAmount: 240.0, category: "Misc. Income", note: "Side work" },
  ];

  const merchants = [
    { description: "DEBITCARD: Grocery Store", min: -185.0, max: -65.0, category: "Groceries" },
    { description: "DEBITCARD: Restaurant", min: -48.0, max: -12.0, category: "Food & Drink" },
    { description: "DEBITCARD: Coffee Shop", min: -8.25, max: -3.75, category: "Food & Drink" },
    { description: "DEBITCARD: Gas Station", min: -68.0, max: -35.0, category: "Gas / Fuel" },
    { description: "DEBITCARD: Pharmacy", min: -45.0, max: -8.0, category: "Health" },
    { description: "DEBITCARD: Clothing Store", min: -95.0, max: -28.0, category: "Shopping" },
    { description: "DEBITCARD: Movies", min: -32.0, max: -12.0, category: "Entertainment" },
  ];

  const humanNotes = [
    "Kids school event",
    "Lunch w/ coworkers",
    "Reimbursable (submit receipt)",
    "Birthday gift",
    "Over-the-counter meds",
    "",
    "",
    "",
  ];

  const rows = [];

  // Always include recurring rows
  for (const r of recurring) {
    const day = jitteredDay({ year, monthIndex0, baseDay: r.day, jitterMax: r.jitter, rng });
    rows.push({
      postedDate: new Date(year, monthIndex0, day),
      signedAmount: r.signedAmount,
      description: r.description,
      category: r.category,
      note: r.note,
    });
  }

  // Fill remaining with deterministic “daily life” transactions
  while (rows.length < count) {
    const day = randInt(rng, 1, Math.min(28, daysInMonth(year, monthIndex0)));
    const m = merchants[Math.floor(rng() * merchants.length)];
    const amt = m.min + (m.max - m.min) * rng();
    const rounded = Math.round(amt * 100) / 100;

    // Sprinkle a few strategic directive notes + mostly human notes.
    let note = humanNotes[Math.floor(rng() * humanNotes.length)];
    if (m.category === "Groceries" && rng() < 0.06) note = "budgeteer:category=Food";
    if (m.description.includes("Pharmacy") && rng() < 0.05) note = "budgeteer:category=Healthcare";
    if (m.description.includes("Gas Station") && rng() < 0.04) note = "budgeteer:category=Transportation";

    rows.push({
      postedDate: new Date(year, monthIndex0, day),
      signedAmount: rounded,
      description: m.description,
      category: m.category,
      note,
    });
  }

  // Sort oldest-first (matches our canonical samples)
  rows.sort((a, b) => a.postedDate.getTime() - b.postedDate.getTime());

  return rows;
}

function buildRowsAcrossMonths({ months, countPerMonth, seed }) {
  const rows = [];
  for (let i = 0; i < months.length; i += 1) {
    const m = months[i];
    const perMonth = Array.isArray(countPerMonth) ? countPerMonth[i] : countPerMonth;
    const monthSeed = seed + i * 1000;
    rows.push(
      ...buildMonthRows({
        year: m.year,
        monthIndex0: m.monthIndex0,
        count: perMonth,
        seed: monthSeed,
      }),
    );
  }

  rows.sort((a, b) => a.postedDate.getTime() - b.postedDate.getTime());
  return rows;
}

function main() {
  const outDir = path.resolve(process.cwd(), "samples");

  const accountNumber = "0001112223";
  const accountType = "CK";

  const tiny = buildMonthRows({ year: 2026, monthIndex0: 0, count: 28, seed: 101 });

  // Medium sample spans several months to feel like real account history.
  const months = [
    { year: 2025, monthIndex0: 7 }, // Aug
    { year: 2025, monthIndex0: 8 }, // Sep
    { year: 2025, monthIndex0: 9 }, // Oct
    { year: 2025, monthIndex0: 10 }, // Nov
    { year: 2025, monthIndex0: 11 }, // Dec
    { year: 2026, monthIndex0: 0 }, // Jan
  ];
  const medium = buildRowsAcrossMonths({ months, countPerMonth: [42, 42, 42, 42, 42, 50], seed: 202 });

  const tinyCsv = toHistoryCsv({ accountNumber, accountType, rows: tiny, startingBalance: 8500 });
  const mediumCsv = toHistoryCsv({ accountNumber, accountType, rows: medium, startingBalance: 8500 });

  writeFileSync(path.join(outDir, "History_Showcase_Tiny.csv"), tinyCsv, "utf8");
  writeFileSync(path.join(outDir, "History_Showcase_Medium.csv"), mediumCsv, "utf8");

  console.log("Wrote samples:\n- samples/History_Showcase_Tiny.csv\n- samples/History_Showcase_Medium.csv");
}

main();
