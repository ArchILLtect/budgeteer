import { Box, Checkbox, Code, Heading, Link, List, Separator, Text } from "@chakra-ui/react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { idbGetItem, idbSetItem } from "../services/indexedDbKeyValue";

type ChecklistState = Record<string, boolean>;

const TESTER_CHECKLIST_STORAGE_KEY = "budgeteer:testerScriptChecklist:v1" as const;

function safeParseChecklistState(raw: string | null): ChecklistState {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as ChecklistState;
  } catch {
    return {};
  }
}

function safeParseChecklistStateOrEmpty(raw: string | null): ChecklistState {
  return safeParseChecklistState(raw);
}

function ChecklistItem({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (id: string, checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <List.Item as="li">
      <Checkbox.Root
        checked={checked}
        onCheckedChange={(d) => onChange(id, d.checked === true)}
        colorPalette="teal"
      >
        <Checkbox.HiddenInput />
        <Checkbox.Control borderColor="border.emphasized" bg="bg.panel" />
        <Checkbox.Label>
          <Text color="fg.muted">{children}</Text>
        </Checkbox.Label>
      </Checkbox.Root>
    </List.Item>
  );
}

export function TesterScriptPage() {
  const [checks, setChecks] = useState<ChecklistState>({});
  const [hasLoaded, setHasLoaded] = useState(false);

  const setCheck = useCallback((id: string, checked: boolean) => {
    setChecks((prev) => ({ ...prev, [id]: checked }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let nextState: ChecklistState = {};
      try {
        const raw = await idbGetItem(TESTER_CHECKLIST_STORAGE_KEY);
        nextState = safeParseChecklistStateOrEmpty(raw);
      } catch {
        nextState = {};
      }

      if (!cancelled) {
        setChecks(nextState);
        setHasLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;

    const serialized = JSON.stringify(checks);
    void idbSetItem(TESTER_CHECKLIST_STORAGE_KEY, serialized);
  }, [checks, hasLoaded]);

  const inviteText = useMemo(() => {
    return [
      "Hey! Can you help me test my budgeting app?",
      "",
      "- Site: https://budgeteer.nickhanson.me/",
      "- Time: 10–15 minutes (quick), or 30–60 minutes (full)",
      "- Please don’t use real bank data — use Demo Mode / sample CSVs in the script.",
      "",
      "If you find anything confusing or broken, please send me:",
      "- What you were trying to do",
      "- What happened vs what you expected",
      "- Your device + browser",
      "- Screenshot/screen recording",
      "- The page URL",
      "",
      "Thank you!",
    ].join("\n");
  }, []);

  return (
    <Box minH="100%" p={4} rounded="md" boxShadow="sm" bg="bg" mx={10} my={2}>
      <Heading size="2xl" mb={4}>
        Budgeteer — Volunteer Tester Script (Non-Technical)
      </Heading>

      <Text color="fg.muted" mb={3}>
        Thank you for helping test Budgeteer. You do <Text as="span" fontWeight="semibold">not</Text> need to
        be technical.
      </Text>
      <Text color="fg.muted" mb={3}>
        Goal: try normal usage <Text as="span" fontWeight="semibold">and</Text> “weird” usage to spot confusing UX,
        bugs, and edge cases.
      </Text>
      <Text color="fg.muted" mb={4}>
        This page includes checkboxes you can tick as you go — they save automatically in your browser on this device.
      </Text>

      <Separator my={6} />

      <Heading size="xl" mt={2} mb={3}>
        Copy/paste invite (send to testers)
      </Heading>
      <Box
        as="pre"
        bg="bg.muted"
        borderWidth="1px"
        borderColor="border"
        rounded="md"
        p={3}
        mb={4}
        overflowX="auto"
        whiteSpace="pre-wrap"
      >
        <Code>{inviteText}</Code>
      </Box>

      <Heading size="xl" mt={8} mb={3}>
        What to send me (so I can fix things)
      </Heading>
      <Text color="fg.muted" mb={3}>
        When you report something, please include:
      </Text>
      <List.Root as="ol" gap={1} ps={6} mb={3} color="fg.muted">
        <List.Item as="li">What were you trying to do?</List.Item>
        <List.Item as="li">What happened (what you saw)?</List.Item>
        <List.Item as="li">What did you expect to happen?</List.Item>
        <List.Item as="li">Your device + browser (example: “iPhone Safari”, “Windows Chrome”, “Mac Chrome”)</List.Item>
        <List.Item as="li">A screenshot (or screen recording if possible)</List.Item>
        <List.Item as="li">The page URL (copy/paste from the address bar)</List.Item>
      </List.Root>
      <Text color="fg.muted" mb={4}>
        If the app shows an error message, include the exact words.
      </Text>

      <Heading size="xl" mt={8} mb={3}>
        Important privacy note
      </Heading>
      <Text color="fg.muted" mb={3}>
        Please <Text as="span" fontWeight="semibold">do not</Text> upload real bank exports or sensitive personal data.
      </Text>
      <Text color="fg.muted" mb={3}>
        Use <Text as="span" fontWeight="semibold">Demo Mode</Text> and/or the <Text as="span" fontWeight="semibold">sample CSV files</Text> linked below.
      </Text>
      <Text color="fg.muted" mb={2}>
        Sample CSV downloads (safe):
      </Text>
      <List.Root as="ul" gap={1} ps={6} mb={3} color="fg.muted">
        <List.Item as="li">
          <Link href="https://budgeteer.nickhanson.me/demo/demo-tiny.csv" color="fg.info" textDecoration="underline" target="_blank" rel="noreferrer">
            https://budgeteer.nickhanson.me/demo/demo-tiny.csv
          </Link>
        </List.Item>
        <List.Item as="li">
          <Link href="https://budgeteer.nickhanson.me/demo/demo-medium.csv" color="fg.info" textDecoration="underline" target="_blank" rel="noreferrer">
            https://budgeteer.nickhanson.me/demo/demo-medium.csv
          </Link>
        </List.Item>
        <List.Item as="li">
          <Link href="https://budgeteer.nickhanson.me/demo/demo-large.csv" color="fg.info" textDecoration="underline" target="_blank" rel="noreferrer">
            https://budgeteer.nickhanson.me/demo/demo-large.csv
          </Link>
        </List.Item>
      </List.Root>
      <Text color="fg.muted" mb={4}>
        (If a link 404s, tell me — that’s a bug.)
      </Text>

      <Separator my={6} />

      <Heading size="xl" mt={2} mb={3}>
        Quick test (10–15 minutes)
      </Heading>

      <Heading size="lg" mt={6} mb={2}>
        1) Load the app
      </Heading>
      <List.Root as="ul" gap={2} ps={6} mb={3} color="fg.muted">
        <ChecklistItem id="quick.load.open" checked={Boolean(checks["quick.load.open"])} onChange={setCheck}>
          Open: {" "}
          <Link href="https://budgeteer.nickhanson.me/" color="fg.info" textDecoration="underline" target="_blank" rel="noreferrer">
            https://budgeteer.nickhanson.me/
          </Link>
        </ChecklistItem>
        <ChecklistItem id="quick.load.firstImpression" checked={Boolean(checks["quick.load.firstImpression"])} onChange={setCheck}>
          First impression: is it clear what the app is and what you should click?
        </ChecklistItem>
      </List.Root>

      <Heading size="lg" mt={6} mb={2}>
        2) Basic navigation
      </Heading>
      <Text color="fg.muted" mb={2}>
        Click each of these and make sure the page loads and looks “normal”:
      </Text>
      <List.Root as="ul" gap={2} ps={6} mb={3} color="fg.muted">
        <ChecklistItem id="quick.nav.home" checked={Boolean(checks["quick.nav.home"])} onChange={setCheck}>
          Home
        </ChecklistItem>
        <ChecklistItem id="quick.nav.about" checked={Boolean(checks["quick.nav.about"])} onChange={setCheck}>
          About
        </ChecklistItem>
        <ChecklistItem id="quick.nav.planner" checked={Boolean(checks["quick.nav.planner"])} onChange={setCheck}>
          Planner
        </ChecklistItem>
        <ChecklistItem id="quick.nav.tracker" checked={Boolean(checks["quick.nav.tracker"])} onChange={setCheck}>
          Tracker
        </ChecklistItem>
        <ChecklistItem id="quick.nav.settings" checked={Boolean(checks["quick.nav.settings"])} onChange={setCheck}>
          Settings
        </ChecklistItem>
      </List.Root>
      <Text color="fg.muted" mb={2}>
        Try:
      </Text>
      <List.Root as="ul" gap={2} ps={6} mb={3} color="fg.muted">
        <ChecklistItem id="quick.nav.back" checked={Boolean(checks["quick.nav.back"])} onChange={setCheck}>
          The browser Back button
        </ChecklistItem>
        <ChecklistItem id="quick.nav.refresh" checked={Boolean(checks["quick.nav.refresh"])} onChange={setCheck}>
          Refresh (reload the page) on at least one page
        </ChecklistItem>
      </List.Root>

      <Heading size="lg" mt={6} mb={2}>
        3) Demo Mode (no login)
      </Heading>
      <Text color="fg.muted" mb={2}>
        On the Home page, click <Text as="span" fontWeight="semibold">Try Demo (No Signup)</Text>.
      </Text>
      <Text color="fg.muted" mb={2}>
        Then:
      </Text>
      <List.Root as="ul" gap={2} ps={6} mb={3} color="fg.muted">
        <ChecklistItem id="quick.demo.clickAround" checked={Boolean(checks["quick.demo.clickAround"])} onChange={setCheck}>
          Click around Planner / Tracker / Accounts (if shown)
        </ChecklistItem>
        <ChecklistItem id="quick.demo.findImports" checked={Boolean(checks["quick.demo.findImports"])} onChange={setCheck}>
          Try to find where imports happen (import/account data)
        </ChecklistItem>
      </List.Root>

      <Heading size="lg" mt={6} mb={2}>
        4) Import (demo data)
      </Heading>
      <Text color="fg.muted" mb={2}>
        In Demo Mode, find the import flow and try to load a demo dataset (Tiny).
      </Text>
      <Text color="fg.muted" mb={2}>
        Confirm:
      </Text>
      <List.Root as="ul" gap={2} ps={6} mb={3} color="fg.muted">
        <ChecklistItem id="quick.import.seeTx" checked={Boolean(checks["quick.import.seeTx"])} onChange={setCheck}>
          You see some transactions appear (staged/imported)
        </ChecklistItem>
        <ChecklistItem id="quick.import.apply" checked={Boolean(checks["quick.import.apply"])} onChange={setCheck}>
          You can “apply” the import to your budget (if prompted)
        </ChecklistItem>
        <ChecklistItem id="quick.import.history" checked={Boolean(checks["quick.import.history"])} onChange={setCheck}>
          You can find “Import history” (if available) and see your import session
        </ChecklistItem>
      </List.Root>

      <Heading size="lg" mt={6} mb={2}>
        5) General “does it feel right?” feedback
      </Heading>
      <List.Root as="ul" gap={2} ps={6} mb={3} color="fg.muted">
        <ChecklistItem id="quick.feel.confusing" checked={Boolean(checks["quick.feel.confusing"])} onChange={setCheck}>
          Anything confusing?
        </ChecklistItem>
        <ChecklistItem id="quick.feel.wording" checked={Boolean(checks["quick.feel.wording"])} onChange={setCheck}>
          Any wording that feels unclear?
        </ChecklistItem>
        <ChecklistItem id="quick.feel.missingButton" checked={Boolean(checks["quick.feel.missingButton"])} onChange={setCheck}>
          Any button you expected to exist but didn’t?
        </ChecklistItem>
      </List.Root>

      <Separator my={6} />

      <Heading size="xl" mt={2} mb={3}>
        Full test (30–60 minutes)
      </Heading>
      <Text color="fg.muted" mb={3}>
        If you have time, do everything in “Quick test”, plus:
      </Text>

      <Heading size="lg" mt={6} mb={2}>
        A) Planner: create a simple plan
      </Heading>
      <List.Root as="ul" gap={2} ps={6} mb={3} color="fg.muted">
        <ChecklistItem id="full.planner.createPlan" checked={Boolean(checks["full.planner.createPlan"])} onChange={setCheck}>
          Create or open a scenario/month plan
        </ChecklistItem>
        <ChecklistItem id="full.planner.income" checked={Boolean(checks["full.planner.income"])} onChange={setCheck}>
          Add at least: 1 income item
        </ChecklistItem>
        <ChecklistItem id="full.planner.expenses" checked={Boolean(checks["full.planner.expenses"])} onChange={setCheck}>
          Add at least: 2 expense items
        </ChecklistItem>
        <ChecklistItem id="full.planner.savingsOptional" checked={Boolean(checks["full.planner.savingsOptional"])} onChange={setCheck}>
          (optional) a savings goal
        </ChecklistItem>
      </List.Root>
      <Text color="fg.muted" mb={2}>
        Try edge cases:
      </Text>
      <List.Root as="ul" gap={2} ps={6} mb={3} color="fg.muted">
        <ChecklistItem id="full.planner.edge.zero" checked={Boolean(checks["full.planner.edge.zero"])} onChange={setCheck}>
          Enter a value like <Code>0</Code>
        </ChecklistItem>
        <ChecklistItem id="full.planner.edge.delete" checked={Boolean(checks["full.planner.edge.delete"])} onChange={setCheck}>
          Try deleting an item you just added
        </ChecklistItem>
        <ChecklistItem id="full.planner.edge.large" checked={Boolean(checks["full.planner.edge.large"])} onChange={setCheck}>
          Try very large numbers (e.g. <Code>999999</Code>)
        </ChecklistItem>
      </List.Root>
      <Text color="fg.muted" mb={2}>
        What to look for:
      </Text>
      <List.Root as="ul" gap={2} ps={6} mb={3} color="fg.muted">
        <ChecklistItem id="full.planner.look.totals" checked={Boolean(checks["full.planner.look.totals"])} onChange={setCheck}>
          Do totals update quickly and correctly?
        </ChecklistItem>
        <ChecklistItem id="full.planner.look.negative" checked={Boolean(checks["full.planner.look.negative"])} onChange={setCheck}>
          Any negative totals that don’t make sense?
        </ChecklistItem>
        <ChecklistItem id="full.planner.look.formatting" checked={Boolean(checks["full.planner.look.formatting"])} onChange={setCheck}>
          Any weird formatting (too many decimals, etc.)?
        </ChecklistItem>
      </List.Root>

      <Heading size="lg" mt={6} mb={2}>
        B) Tracker: compare planned vs actual
      </Heading>
      <List.Root as="ul" gap={2} ps={6} mb={3} color="fg.muted">
        <ChecklistItem id="full.tracker.go" checked={Boolean(checks["full.tracker.go"])} onChange={setCheck}>
          Go to Tracker
        </ChecklistItem>
        <ChecklistItem id="full.tracker.changeMonths" checked={Boolean(checks["full.tracker.changeMonths"])} onChange={setCheck}>
          Change months (if there’s a month picker)
        </ChecklistItem>
      </List.Root>
      <Text color="fg.muted" mb={2}>
        What to look for:
      </Text>
      <List.Root as="ul" gap={2} ps={6} mb={3} color="fg.muted">
        <ChecklistItem id="full.tracker.look.plannedVsActual" checked={Boolean(checks["full.tracker.look.plannedVsActual"])} onChange={setCheck}>
          Is it obvious what numbers are “planned” vs “actual”?
        </ChecklistItem>
        <ChecklistItem id="full.tracker.look.summary" checked={Boolean(checks["full.tracker.look.summary"])} onChange={setCheck}>
          Is anything confusing about the summary?
        </ChecklistItem>
      </List.Root>

      <Heading size="lg" mt={6} mb={2}>
        C) CSV import (upload a file)
      </Heading>
      <Text color="fg.muted" mb={2}>
        If there’s an “Import CSV” button that lets you upload a file:
      </Text>
      <List.Root as="ul" gap={2} ps={6} mb={3} color="fg.muted">
        <ChecklistItem id="full.csv.download" checked={Boolean(checks["full.csv.download"])} onChange={setCheck}>
          Download <Code>demo-tiny.csv</Code> (link at top)
        </ChecklistItem>
        <ChecklistItem id="full.csv.upload" checked={Boolean(checks["full.csv.upload"])} onChange={setCheck}>
          Upload it
        </ChecklistItem>
      </List.Root>
      <Text color="fg.muted" mb={2}>
        Try edge cases:
      </Text>
      <List.Root as="ul" gap={2} ps={6} mb={3} color="fg.muted">
        <ChecklistItem id="full.csv.edge.duplicate" checked={Boolean(checks["full.csv.edge.duplicate"])} onChange={setCheck}>
          Upload the same file twice (do you get duplicate transactions or does it handle re-import?)
        </ChecklistItem>
        <ChecklistItem id="full.csv.edge.cancel" checked={Boolean(checks["full.csv.edge.cancel"])} onChange={setCheck}>
          Cancel out of the import flow half-way through (does the app stay stable?)
        </ChecklistItem>
        <ChecklistItem id="full.csv.edge.refresh" checked={Boolean(checks["full.csv.edge.refresh"])} onChange={setCheck}>
          Refresh during or right after importing
        </ChecklistItem>
      </List.Root>
      <Text color="fg.muted" mb={2}>
        What to look for:
      </Text>
      <List.Root as="ul" gap={2} ps={6} mb={3} color="fg.muted">
        <ChecklistItem id="full.csv.look.staged" checked={Boolean(checks["full.csv.look.staged"])} onChange={setCheck}>
          Does the UI explain what “staged” means?
        </ChecklistItem>
        <ChecklistItem id="full.csv.look.applyUndo" checked={Boolean(checks["full.csv.look.applyUndo"])} onChange={setCheck}>
          Is it clear what “apply” and “undo” will do?
        </ChecklistItem>
        <ChecklistItem id="full.csv.look.afraid" checked={Boolean(checks["full.csv.look.afraid"])} onChange={setCheck}>
          Do you ever feel afraid to click something because it’s unclear?
        </ChecklistItem>
      </List.Root>

      <Heading size="lg" mt={6} mb={2}>
        D) Settings
      </Heading>
      <List.Root as="ul" gap={2} ps={6} mb={3} color="fg.muted">
        <ChecklistItem id="full.settings.change" checked={Boolean(checks["full.settings.change"])} onChange={setCheck}>
          Change at least one setting
        </ChecklistItem>
        <ChecklistItem id="full.settings.leaveComeBack" checked={Boolean(checks["full.settings.leaveComeBack"])} onChange={setCheck}>
          Leave Settings and come back
        </ChecklistItem>
      </List.Root>
      <Text color="fg.muted" mb={2}>
        What to look for:
      </Text>
      <List.Root as="ul" gap={2} ps={6} mb={3} color="fg.muted">
        <ChecklistItem id="full.settings.look.saved" checked={Boolean(checks["full.settings.look.saved"])} onChange={setCheck}>
          Did your setting actually save?
        </ChecklistItem>
        <ChecklistItem id="full.settings.look.risky" checked={Boolean(checks["full.settings.look.risky"])} onChange={setCheck}>
          Any setting that feels risky or unclear?
        </ChecklistItem>
      </List.Root>

      <Heading size="lg" mt={6} mb={2}>
        E) “Weird user” behavior (edge case hunting)
      </Heading>
      <Text color="fg.muted" mb={2}>
        Try a few of these (stop if anything feels annoying):
      </Text>
      <List.Root as="ul" gap={2} ps={6} mb={3} color="fg.muted">
        <ChecklistItem id="full.weird.twoTabs" checked={Boolean(checks["full.weird.twoTabs"])} onChange={setCheck}>
          Open the site in two tabs at once
        </ChecklistItem>
        <ChecklistItem id="full.weird.backForward" checked={Boolean(checks["full.weird.backForward"])} onChange={setCheck}>
          Use Back/Forward a lot
        </ChecklistItem>
        <ChecklistItem id="full.weird.reloadNonHome" checked={Boolean(checks["full.weird.reloadNonHome"])} onChange={setCheck}>
          Reload the page while on a non-home page
        </ChecklistItem>
        <ChecklistItem id="full.weird.clickFast" checked={Boolean(checks["full.weird.clickFast"])} onChange={setCheck}>
          Click buttons quickly 2–3 times
        </ChecklistItem>
        <ChecklistItem id="full.weird.resize" checked={Boolean(checks["full.weird.resize"])} onChange={setCheck}>
          Resize the browser window (wide → narrow)
        </ChecklistItem>
        <ChecklistItem id="full.weird.rotate" checked={Boolean(checks["full.weird.rotate"])} onChange={setCheck}>
          On mobile: rotate portrait ↔ landscape
        </ChecklistItem>
      </List.Root>
      <Text color="fg.muted" mb={2}>
        What to look for:
      </Text>
      <List.Root as="ul" gap={2} ps={6} mb={3} color="fg.muted">
        <ChecklistItem id="full.weird.look.crash" checked={Boolean(checks["full.weird.look.crash"])} onChange={setCheck}>
          App crash / blank screen
        </ChecklistItem>
        <ChecklistItem id="full.weird.look.frozen" checked={Boolean(checks["full.weird.look.frozen"])} onChange={setCheck}>
          Frozen loading state
        </ChecklistItem>
        <ChecklistItem id="full.weird.look.buttons" checked={Boolean(checks["full.weird.look.buttons"])} onChange={setCheck}>
          Buttons that stop working
        </ChecklistItem>
        <ChecklistItem id="full.weird.look.layout" checked={Boolean(checks["full.weird.look.layout"])} onChange={setCheck}>
          Layout that becomes unusable on smaller screens
        </ChecklistItem>
      </List.Root>

      <Separator my={6} />

      <Heading size="xl" mt={2} mb={3}>
        If something breaks
      </Heading>
      <Text color="fg.muted" mb={2}>
        If the app ever becomes unusable:
      </Text>
      <List.Root as="ul" gap={1} ps={6} mb={3} color="fg.muted">
        <List.Item as="li">Take a screenshot</List.Item>
        <List.Item as="li">Copy the URL</List.Item>
        <List.Item as="li">Tell me what you clicked right before it broke</List.Item>
      </List.Root>
      <Text color="fg.muted" mb={2}>
        Optional: try a hard refresh
      </Text>
      <List.Root as="ul" gap={1} ps={6} mb={4} color="fg.muted">
        <List.Item as="li">Windows: <Code>Ctrl+F5</Code></List.Item>
        <List.Item as="li">Mac: <Code>Cmd+Shift+R</Code></List.Item>
      </List.Root>
      <Text color="fg.muted" mb={2}>
        Thank you — even “small” notes help a lot.
      </Text>
    </Box>
  );
}
