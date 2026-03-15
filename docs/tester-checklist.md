# ui-drift — Quick Tester Checklist

Thanks for taking a look at **ui-drift**.
The goal of this quick test is to see whether the audit results feel believable and useful in a real codebase.

This should take about **10–15 minutes**.

---

## Step 1 — Run the tool

Clone and build:

```bash
git clone https://github.com/pcabel85/ui-drift.git
cd ui-drift
npm install
npm run build
```

Run it against a React / Next.js repo:

```bash
node dist/cli.js /path/to/repo --html
```

If the repo does not have a config, DriftSense may trigger and suggest one.
You can either run with the suggestion applied in-memory:

```bash
node dist/cli.js /path/to/repo --rerun-with-suggestion --html
```

Or write the suggested config to disk first and then re-run:

```bash
node dist/cli.js /path/to/repo --write-config
node dist/cli.js /path/to/repo --html
```

---

## Step 2 — Review the report

Open the generated HTML report and skim the sections:

- **Audit Summary** — top-line counts (DS adoption %, duplicate families, style violations)
- **Design System Health Score** — the 0–100 score and per-dimension breakdown
- **Duplicate Component Families** — components flagged as redundant implementations
- **Style Overrides & Token Violations** — inline styles, hardcoded colors, hardcoded spacing
- **Recommendations** — prioritised list of suggested improvements

---

## Step 3 — Quick feedback questions

Please answer these briefly — a sentence or two per question is plenty.

### 1. Does the health score feel believable?

If it says 82, does that roughly match your intuition about how well this codebase follows its design system?

### 2. Did the tool find anything interesting or surprising?

For example:

- duplicate button or card components you had forgotten about
- wrapper sprawl around a shared component
- heavy inline style usage in a specific feature area
- token violations (hardcoded colors or spacing values)

### 3. Did anything feel incorrect or noisy?

For example:

- components flagged as duplicates that clearly are not
- design system adoption misidentified (imports counted as local when they should be approved)
- recommendations that do not apply to the repo

### 4. Would this be useful for your team?

If yes, when would you run it?

For example:

- before a design system migration to understand the current state
- periodically to track drift over time
- as a CI check to catch regressions
- during architecture reviews

### 5. What would make this more useful?

For example:

- CI integration with a baseline comparison
- trend tracking over time
- per-team or per-feature breakdowns
- a different scoring model
- support for a specific design system (Chakra UI, Tailwind, Radix, etc.)

---

## Optional — share your results

If you are comfortable sharing:

- the repo you tested (name / link is enough)
- the generated HTML report

This helps calibrate the heuristics and improve accuracy for real-world codebases. Nothing is required.

---

Thanks again for taking a look — honest feedback at this stage is extremely valuable.
