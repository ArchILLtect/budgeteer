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
      r.signedAmount < 0 ? `(${Math.abs(r.signedAmount).toFixed(2)})` : Math.abs(r.signedAmount).toFixed(2),
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

function buildShowcaseRows({ year, monthIndex0, count, seed }) {
  const rng = makeRng(seed);

  // Hand-curated recurring items (clean, recognizable)
  const recurring = [
    { day: 1, description: "ACH:Sunrise Apartments RENT", signedAmount: -1500.0, category: "Mortgage / Rent" },
    { day: 2, description: "ACH:ACME PAYROLL", signedAmount: 2500.0, category: "Misc. Income" },
    { day: 16, description: "ACH:ACME PAYROLL", signedAmount: 2500.0, category: "Misc. Income" },
    { day: 5, description: "ACH:ISP INTERNET BILL", signedAmount: -65.0, category: "Internet" },
    { day: 7, description: "ACH:MOBILE PHONE", signedAmount: -55.0, category: "Utilities" },
    { day: 12, description: "ACH:ELECTRIC BILL", signedAmount: -92.14, category: "Utilities" },
    { day: 18, description: "ACH:CAR INSURANCE", signedAmount: -110.0, category: "Insurance" },
    { day: 20, description: "Web Branch:TFR TO SV 0001112223", signedAmount: -300.0, category: "Transfer" },
    { day: 22, description: "ACH:WATER BILL", signedAmount: -28.33, category: "Utilities" },
    { day: 25, description: "REFUND: Grocery Store", signedAmount: 18.42, category: "Misc. Income" },
  ];

  const merchants = [
    { description: "DEBITCARD: Coffee Shop", min: -6.25, max: -3.75, category: "Food & Drink" },
    { description: "DEBITCARD: Lunch Spot", min: -18.5, max: -10.75, category: "Food & Drink" },
    { description: "DEBITCARD: Grocery Store", min: -165.0, max: -85.0, category: "Groceries" },
    { description: "DEBITCARD: Gas Station", min: -58.0, max: -35.0, category: "Gas / Fuel" },
    { description: "DEBITCARD: Pharmacy", min: -22.0, max: -8.0, category: "Health" },
  ];

  const rows = [];

  // Always include recurring rows
  for (const r of recurring) {
    rows.push({
      postedDate: new Date(year, monthIndex0, r.day),
      signedAmount: r.signedAmount,
      description: r.description,
      category: r.category,
    });
  }

  // Fill remaining with deterministic "daily life" transactions
  while (rows.length < count) {
    const day = 1 + Math.floor(rng() * 28);
    const m = merchants[Math.floor(rng() * merchants.length)];
    const amt = m.min + (m.max - m.min) * rng();
    const rounded = Math.round(amt * 100) / 100;
    rows.push({
      postedDate: new Date(year, monthIndex0, day),
      signedAmount: rounded,
      description: m.description,
      category: m.category,
    });
  }

  // Sort newest-first like many bank exports
  rows.sort((a, b) => b.postedDate.getTime() - a.postedDate.getTime());

  return rows;
}

function main() {
  const outDir = path.resolve(process.cwd(), "samples");

  const accountNumber = "0001112223";
  const accountType = "CK";

  const tiny = buildShowcaseRows({ year: 2026, monthIndex0: 0, count: 18, seed: 101 });
  const medium = buildShowcaseRows({ year: 2026, monthIndex0: 0, count: 260, seed: 202 });

  const tinyCsv = toHistoryCsv({ accountNumber, accountType, rows: tiny, startingBalance: 6500 });
  const mediumCsv = toHistoryCsv({ accountNumber, accountType, rows: medium, startingBalance: 6500 });

  writeFileSync(path.join(outDir, "History_Showcase_Tiny.csv"), tinyCsv, "utf8");
  writeFileSync(path.join(outDir, "History_Showcase_Medium.csv"), mediumCsv, "utf8");

  console.log("Wrote samples:\n- samples/History_Showcase_Tiny.csv\n- samples/History_Showcase_Medium.csv");
}

main();
