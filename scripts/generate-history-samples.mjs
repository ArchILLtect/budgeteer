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

function randFloat(rng, min, max) {
  return min + (max - min) * rng();
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function pickOne(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
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

function buildLargeMonthRows({ year, monthIndex0, count, seed, monthIndexFromStart }) {
  const rng = makeRng(seed);

  // Goal: keep the “primary” picture steady, but add controlled variability so
  // Insights charts are interesting (not flat lines) while still feeling plausible.
  const seasonalElectricBump = (() => {
    // Summer AC (Jun–Sep) + winter heating (Dec–Feb)
    if ([5, 6, 7, 8].includes(monthIndex0)) return 55;
    if ([11, 0, 1].includes(monthIndex0)) return 35;
    return 0;
  })();

  const recurring = [
    // Income: semi-monthly, mostly stable (tiny deterministic wobble)
    {
      day: 1,
      jitter: 0,
      description: "ACH:VISTA TECH PAYROLL",
      signedAmount: 3800.0,
      category: "Misc. Income",
      note: monthIndexFromStart === 0 ? "budgeteer:rename=Primary Paycheck" : "",
    },
    { day: 15, jitter: 0, description: "ACH:VISTA TECH PAYROLL", signedAmount: 3800, category: "Misc. Income" },

    // Housing: steady
    { day: 1, jitter: 1, description: "ACH:Redwood Grove RENT", signedAmount: -2189.0, category: "Mortgage / Rent" },

    // Common fixed bills
    { day: 2, jitter: 1, description: "ACH:HEALTH INSURANCE", signedAmount: -245.0, category: "Insurance" },
    { day: 5, jitter: 1, description: "ACH:AUTO LOAN PAYMENT", signedAmount: -425.0, category: "Auto & Transport", note: "budgeteer:goal=Auto Loan Down-payment" },
    { day: 6, jitter: 1, description: "ACH:ISP INTERNET BILL", signedAmount: -79.99, category: "Internet" },
    { day: 8, jitter: 1, description: "ACH:GYM MEMBERSHIP", signedAmount: -39.99, category: "Health" },
    { day: 9, jitter: 1, description: "ACH:STREAMING SUBSCRIPTION", signedAmount: -19.99, category: "Entertainment" },
    { day: 10, jitter: 1, description: "ACH:MOBILE PHONE", signedAmount: -68.0, category: "Utilities" },
    { day: 12, jitter: 1, description: "ACH:STUDENT LOAN SERVICER", signedAmount: -210.0, category: "Loans" },
    {
      day: 13,
      jitter: 2,
      description: "ACH:ELECTRIC BILL",
      signedAmount: round2(-(135 + seasonalElectricBump + randFloat(rng, -18, 22))),
      category: "Utilities",
    },
    {
      day: 22,
      jitter: 2,
      description: "ACH:WATER BILL",
      signedAmount: round2(-(44 + randFloat(rng, -6, 7))),
      category: "Utilities",
    },

    // Savings transfer (keeps balances sane over 5 years)
    { day: 16, jitter: 1, description: "Web Branch:TFR TO SV 0001112223", signedAmount: -750.0, category: "Transfer", note: "budgeteer:apply=savings" },

    // Monthly card payment (variable, drives non-flat month totals)
    {
      day: 25,
      jitter: 2,
      description: "ACH:CREDIT CARD PAYMENT",
      signedAmount: round2(-randFloat(rng, 650, 1850)),
      category: "Credit Card",
    },
  ];

  const merchants = [
    { description: "DEBITCARD: Grocery Store", min: -210.0, max: -55.0, category: "Groceries" },
    { description: "DEBITCARD: Restaurant", min: -64.0, max: -12.0, category: "Food & Drink" },
    { description: "DEBITCARD: Coffee Shop", min: -10.25, max: -3.25, category: "Food & Drink" },
    { description: "DEBITCARD: Gas Station", min: -78.0, max: -30.0, category: "Gas / Fuel" },
    { description: "DEBITCARD: Pharmacy", min: -65.0, max: -7.0, category: "Health" },
    { description: "DEBITCARD: Clothing Store", min: -140.0, max: -22.0, category: "Shopping" },
    { description: "DEBITCARD: Hardware Store", min: -85.0, max: -18.0, category: "Home" },
    { description: "DEBITCARD: Pet Supplies", min: -55.0, max: -12.0, category: "Pets" },
    { description: "DEBITCARD: Ride Share", min: -28.0, max: -7.0, category: "Auto & Transport" },
    { description: "DEBITCARD: Streaming Add-on", min: -11.99, max: -4.99, category: "Entertainment" },
    { description: "DEBITCARD: Books", min: -34.0, max: -8.0, category: "Shopping" },
    { description: "DEBITCARD: Event Tickets", min: -220.0, max: -35.0, category: "Entertainment" },
  ];

  const rows = [];

  for (const r of recurring) {
    const day = jitteredDay({ year, monthIndex0, baseDay: r.day, jitterMax: r.jitter, rng });
    rows.push({
      postedDate: new Date(year, monthIndex0, day),
      signedAmount: round2(r.signedAmount),
      description: r.description,
      category: r.category,
      note: r.note,
    });
  }

  // Secondary / tertiary income (inconsistent) to spice up Insights.
  if (rng() < 0.62) {
    const side1 = { day: randInt(rng, 6, 12), jitter: 0, description: "ACH:MOONLIGHT GIG", signedAmount: round2(randFloat(rng, 160, 980)), category: "Misc. Income", note: "Side work" };
    rows.push({ postedDate: new Date(year, monthIndex0, side1.day), signedAmount: side1.signedAmount, description: side1.description, category: side1.category, note: side1.note });

    if (rng() < 0.28) {
      const side2Day = randInt(rng, 18, Math.min(27, daysInMonth(year, monthIndex0)));
      rows.push({ postedDate: new Date(year, monthIndex0, side2Day), signedAmount: round2(randFloat(rng, 120, 650)), description: "ACH:MOONLIGHT GIG", category: "Misc. Income", note: "Side work" });
    }
  }

  if (rng() < 0.45) {
    rows.push({
      postedDate: new Date(year, monthIndex0, randInt(rng, 20, Math.min(28, daysInMonth(year, monthIndex0)))),
      signedAmount: round2(randFloat(rng, 2.5, 14.5)),
      description: "DIVIDEND PAYMENT",
      category: "Misc. Income",
      note: "",
    });
  }

  // Yearly-ish spikes
  if (monthIndex0 === 3 && rng() < 0.9) {
    // Tax refund in April
    rows.push({
      postedDate: new Date(year, monthIndex0, randInt(rng, 10, 22)),
      signedAmount: round2(randFloat(rng, 900, 3400)),
      description: "US TREASURY TAX REFUND",
      category: "Misc. Income",
      note: "",
    });
  }

  if (monthIndex0 === 10 && rng() < 0.55) {
    // Bonus in Nov
    rows.push({
      postedDate: new Date(year, monthIndex0, randInt(rng, 15, 25)),
      signedAmount: round2(randFloat(rng, 700, 2600)),
      description: "ACH:ANNUAL BONUS",
      category: "Misc. Income",
      note: "",
    });
  }

  // Occasional spiky expenses
  const holidayGiftBias = monthIndex0 === 11 ? 0.18 : 0.06;
  if (rng() < holidayGiftBias) {
    rows.push({
      postedDate: new Date(year, monthIndex0, randInt(rng, 8, Math.min(27, daysInMonth(year, monthIndex0)))),
      signedAmount: round2(-randFloat(rng, 120, 950)),
      description: "DEBITCARD: Gifts",
      category: "Gifts",
      note: "",
    });
  }

  if (rng() < 0.085) {
    rows.push({
      postedDate: new Date(year, monthIndex0, randInt(rng, 2, Math.min(26, daysInMonth(year, monthIndex0)))),
      signedAmount: round2(-randFloat(rng, 320, 2200)),
      description: pickOne(rng, ["DEBITCARD: Airline", "DEBITCARD: Hotel", "DEBITCARD: Travel Booking"]),
      category: "Travel",
      note: "",
    });
  }

  if (rng() < 0.06) {
    rows.push({
      postedDate: new Date(year, monthIndex0, randInt(rng, 5, Math.min(27, daysInMonth(year, monthIndex0)))),
      signedAmount: round2(-randFloat(rng, 95, 880)),
      description: "DEBITCARD: Medical Bill",
      category: "Health",
      note: "",
    });
  }

  // Fill remaining with daily-life purchases.
  while (rows.length < count) {
    const day = randInt(rng, 1, daysInMonth(year, monthIndex0));
    const m = pickOne(rng, merchants);
    const amt = randFloat(rng, m.min, m.max);

    // Very occasional note directives (keeps directive feature exercised)
    let note = "";
    if (m.category === "Groceries" && rng() < 0.012) note = "budgeteer:category=Food";
    if (m.category === "Travel" && rng() < 0.01) note = "budgeteer:category=Travel";
    if (m.category === "Gas / Fuel" && rng() < 0.01) note = "budgeteer:category=Transportation";

    rows.push({
      postedDate: new Date(year, monthIndex0, day),
      signedAmount: round2(amt),
      description: m.description,
      category: m.category,
      note,
    });
  }

  rows.sort((a, b) => a.postedDate.getTime() - b.postedDate.getTime());
  return rows;
}

function buildRowsAcrossMonths({ months, countPerMonth, seed, buildMonthRowsFn = buildMonthRows }) {
  const rows = [];
  for (let i = 0; i < months.length; i += 1) {
    const m = months[i];
    const perMonth = Array.isArray(countPerMonth) ? countPerMonth[i] : countPerMonth;
    const monthSeed = seed + i * 1000;
    rows.push(
      ...buildMonthRowsFn({
        year: m.year,
        monthIndex0: m.monthIndex0,
        count: perMonth,
        seed: monthSeed,
        monthIndexFromStart: i,
      }),
    );
  }

  rows.sort((a, b) => a.postedDate.getTime() - b.postedDate.getTime());
  return rows;
}

function main() {
  const samplesDir = path.resolve(process.cwd(), "samples");
  const demoDir = path.resolve(process.cwd(), "public", "demo");

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

  // Large demo sample: ~5 years, ~3k transactions, ending near end of 2026.
  // Jan 2022 .. Dec 2026 inclusive = 60 months. 50 tx/month => 3000 tx.
  const largeMonths = [];
  for (let y = 2022; y <= 2026; y += 1) {
    for (let m = 0; m < 12; m += 1) {
      largeMonths.push({ year: y, monthIndex0: m });
    }
  }

  const large = buildRowsAcrossMonths({ months: largeMonths, countPerMonth: 50, seed: 909, buildMonthRowsFn: buildLargeMonthRows });

  const tinyCsv = toHistoryCsv({ accountNumber, accountType, rows: tiny, startingBalance: 8500 });
  const mediumCsv = toHistoryCsv({ accountNumber, accountType, rows: medium, startingBalance: 8500 });
  const largeCsv = toHistoryCsv({ accountNumber, accountType, rows: large, startingBalance: 8500 });

  writeFileSync(path.join(samplesDir, "History_Showcase_Tiny.csv"), tinyCsv, "utf8");
  writeFileSync(path.join(samplesDir, "History_Showcase_Medium.csv"), mediumCsv, "utf8");
  writeFileSync(path.join(samplesDir, "History_Showcase_Large.csv"), largeCsv, "utf8");

  // Demo mode files served from /public/demo
  writeFileSync(path.join(demoDir, "demo-tiny.csv"), tinyCsv, "utf8");
  writeFileSync(path.join(demoDir, "demo-medium.csv"), mediumCsv, "utf8");
  writeFileSync(path.join(demoDir, "demo-large.csv"), largeCsv, "utf8");

  console.log("Wrote samples:\n- samples/History_Showcase_Tiny.csv\n- samples/History_Showcase_Medium.csv");
  console.log("- samples/History_Showcase_Large.csv\n- public/demo/demo-tiny.csv\n- public/demo/demo-medium.csv\n- public/demo/demo-large.csv");
}

main();
