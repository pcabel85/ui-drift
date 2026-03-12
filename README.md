# ui-drift

> Design system health auditor for React / TypeScript codebases.

ui-drift answers one question for your frontend team:

**How healthy is our design system adoption in the actual codebase?**

It scans your React project with AST-based analysis (no regex) and produces a scored, actionable report in the terminal, as JSON, or as a shareable HTML file.

---

## Quick start

```bash
# Run against any React/TS project
npx ui-drift ./my-app

# With a config file
npx ui-drift ./my-app --config ui-drift.config.json

# Export a shareable HTML report
npx ui-drift ./my-app --html

# Export machine-readable JSON
npx ui-drift ./my-app --json

# Both at once (custom paths)
npx ui-drift ./my-app --json audit.json --html audit.html

# Score only — exits 0 if score >= 70 (useful for CI)
npx ui-drift ./my-app --score-only
```

---

## What it detects

### 1. Design system adoption

Counts how many UI component imports come from approved design system libraries versus local hand-rolled alternatives, and produces an adoption ratio.

```
✓ Approved imports:
    42  @mui/material/Button
    17  @mui/material/Card

⚠ Local UI component imports:
    11  Button
     7  PrimaryButton
```

### 2. Duplicate component families

Groups components by normalised UI noun (button, card, input, modal, etc.) and flags families where multiple implementations exist. Each finding includes:

- **Severity** — High / Medium / Low
- **Confidence** — High ●●● / Medium ●●○ / Low ●○○ (heuristic transparency)
- **Component kind** — `wrapper → MuiButton` vs `standalone — no approved DS import`
- **Why it matters** — a plain-English explanation of the business impact

```
HIGH  button family   Confidence: High ●●●

  └─ src/components/Button.tsx            [standalone — no approved DS import]
  └─ src/shared/PrimaryButton.tsx         [standalone — no approved DS import]
  └─ src/features/checkout/CTAButton.tsx  [standalone — no approved DS import]

  Reason: 3 standalones without approved DS imports; overlapping props: onClick, children
  Why it matters: Multiple independent button implementations increase maintenance
  cost and cause visual inconsistency across features.
```

Wrapper components (e.g. `AppButton` wrapping `@mui/material/Button`) are classified separately and treated with lower severity than standalone implementations.

### 3. Inline styles and token violations

Detects direct bypasses of the design system:

| Check | What it flags |
|---|---|
| `style={{}}` props | Raw inline style objects on JSX elements |
| `sx={{}}` overrides | MUI sx prop usage (flagged for review, not penalised heavily) |
| Hardcoded colors | Hex values, `rgb()`/`rgba()` in style objects |
| Hardcoded spacing | Raw pixel values on margin, padding, gap, width, height, etc. |

### 4. Wrapper sprawl detection

Flags when multiple thin wrappers exist around the same approved base component — a pattern that signals design drift even when the underlying DS is technically in use.

### 5. Health score (0–100)

Weighted across four dimensions:

| Dimension | Weight | What drives it |
|---|---|---|
| DS adoption | 40% | Ratio of approved to local UI imports |
| Duplicate components | 20% | Number and severity of duplicate families |
| Token compliance | 20% | Hardcoded color and spacing violations |
| Inline style usage | 20% | `style={{}}` prop count |

Score labels: **85–100 Excellent · 70–84 Good · 50–69 Fair · 30–49 Poor · 0–29 Critical**

### 6. Score breakdown

Every report shows the math behind the score so engineers can see exactly where points were lost:

```
Score Breakdown

DS adoption          40/40    —
Duplicate penalty    10/20   -10
Token compliance     14/20    -6
Inline style usage   16/20    -4
```

### 7. Audit summary

A leadership-friendly skim section at the top of every report:

```
Audit Summary

DS Adoption          97%
Duplicate Families   0
Inline Style Usage   Low
Token Violations     Low

✓ No critical issues detected
```

The summary labels and top-issue line are tone-matched to the overall health score so the summary never contradicts the grade.

---

## Terminal output example

```
  ╔══════════════════════════════════════════╗
  ║            ui-drift  v0.1                ║
  ╚══════════════════════════════════════════╝

  Target: /repos/my-app
  Files scanned: 214

  ────────────────────────────────────────────

  📋 Audit Summary

  DS Adoption          61%
  Duplicate Families   3
  Inline Style Usage   High
  Token Violations     Moderate

  ⚑ Top issue: High-severity duplicate component families

  ────────────────────────────────────────────

  Design System Health Score   52/100  Fair
  ██████████░░░░░░░░░░

  Score Breakdown

  DS adoption          25/40   -15
  Duplicate penalty     8/20   -12
  Token compliance     12/20    -8
  Inline style usage   10/20   -10

  ────────────────────────────────────────────

  🔁 Potential Duplicate Components

   HIGH  button family   Confidence: High ●●●
    └─ src/components/Button.tsx            [standalone — no approved DS import]
    └─ src/shared/PrimaryButton.tsx         [standalone — no approved DS import]
    └─ src/features/checkout/CTAButton.tsx  [standalone — no approved DS import]

    Reason: 3 standalones without approved DS imports
    Why it matters: Multiple independent button implementations increase
    maintenance cost and cause visual inconsistency across features.

  ────────────────────────────────────────────

  💡 Top Recommendations

  1. Low design system adoption (61%). Migrate local components to approved
     imports, starting with: Button, PrimaryButton, CTAButton.

  2. 1 high-severity duplicate family: button. Consolidate to a single
     implementation using approved DS components.
```

---

## Configuration

Place `ui-drift.config.json` in the root of the project you are auditing, or pass `--config`:

```json
{
  "designSystemImports": [
    "@mui/material",
    "@mui/icons-material",
    "@company/ui"
  ],
  "ignorePaths": [
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".next",
    "storybook-static"
  ],
  "familyKeywords": [
    "button", "card", "modal", "input", "select",
    "badge", "tag", "alert", "dialog", "dropdown",
    "table", "tabs"
  ],
  "penalties": {
    "duplicateHigh": 25,
    "duplicateMedium": 12,
    "duplicateLow": 4,
    "inlineStyle": 1.5,
    "hardcodedColor": 2,
    "hardcodedSpacing": 1
  },
  "bonuses": {
    "approvedImport": 0.5
  },
  "scoreWeights": {
    "approvedAdoption": 40,
    "duplicateComponents": 20,
    "tokenCompliance": 20,
    "inlineStyles": 20
  }
}
```

All fields are optional — any omitted field falls back to the built-in default.

---

## JSON output schema

```json
{
  "healthScore": 68,
  "scoreBreakdown": {
    "adoptionScore": 61,
    "duplicateScore": 50,
    "tokenScore": 72,
    "inlineStyleScore": 68,
    "adoptionContribution": 24,
    "duplicateContribution": 10,
    "tokenContribution": 14,
    "inlineStyleContribution": 14,
    "adoptionPenalty": 16,
    "duplicatePenalty": 10,
    "tokenPenalty": 6,
    "inlineStylePenalty": 6
  },
  "summary": {
    "adoptionPercent": 61,
    "duplicateFamilyCount": 3,
    "inlineStyleLevel": "High",
    "tokenViolationLevel": "Moderate",
    "topIssue": "High-severity duplicate component families"
  },
  "scannedFiles": 214,
  "approvedImportCounts": {
    "@mui/material/Button": 42
  },
  "localUiImportCounts": {
    "Button": 11,
    "PrimaryButton": 7
  },
  "duplicateFindings": [
    {
      "family": "button",
      "severity": "high",
      "confidence": "high",
      "components": [
        { "filePath": "src/components/Button.tsx", "kind": "standalone" },
        { "filePath": "src/shared/PrimaryButton.tsx", "kind": "standalone" },
        { "filePath": "src/features/checkout/CTAButton.tsx", "kind": "standalone" }
      ],
      "reason": "3 standalones without approved DS imports; overlapping props: onClick, children",
      "whyItMatters": "Multiple independent button implementations increase maintenance cost..."
    }
  ],
  "inlineStyleCount": 44,
  "sxOverrideCount": 12,
  "hardcodedColorCount": 19,
  "hardcodedSpacingCount": 27,
  "recommendations": [
    "Low design system adoption (61%). Migrate local components..."
  ]
}
```

---

## Development

```bash
# Install dependencies
npm install

# Build TypeScript to dist/
npm run build

# Run from source without a build step
npm run dev -- ./path/to/project

# Run the compiled build directly
node dist/cli.js ./path/to/project
```

### Project structure

```
src/
  cli.ts                          # Entry point — CLI flags, wires everything together
  types.ts                        # All shared TypeScript interfaces
  config/
    defaultConfig.ts              # Built-in defaults for all config fields
    loadConfig.ts                 # Reads ui-drift.config.json, merges with defaults
  scanner/
    findSourceFiles.ts            # File discovery via fast-glob (Windows path safe)
    analyzeFile.ts                # AST-based file analysis via @babel/parser
  analyzers/
    importUsageAnalyzer.ts        # Approved vs local UI import counting
    duplicateFamilyAnalyzer.ts    # Component family grouping, severity, confidence
    wrapperAnalyzer.ts            # Wrapper vs standalone classification, sprawl detection
    inlineStyleAnalyzer.ts        # Inline style, sx, hardcoded color/spacing detection
  scoring/
    calculateHealthScore.ts       # Weighted scoring model + summary builder
    recommendations.ts            # Actionable recommendation generator
  reporters/
    printTerminalReport.ts        # Chalk-formatted terminal output
    writeJsonReport.ts            # JSON export + HTML report generation
  utils/
    normalizeComponentName.ts     # PascalCase to UI family noun mapping
    isComponentFile.ts            # Component file detection heuristic
    pathHelpers.ts                # Cross-platform path utilities
```

### Tech stack

| Package | Purpose |
|---|---|
| `@babel/parser` | AST parsing for TSX/JSX with error recovery |
| `fast-glob` | Cross-platform file discovery |
| `chalk` | Terminal colour output |
| `commander` | CLI argument parsing |
| `typescript` | Dev-time type checking |
| `ts-node` | Run source directly without a build step |

---

## Test projects

The `test-projects/` directory contains three sample React apps for validating the tool:

| Project | Expected score | What it demonstrates |
|---|---|---|
| `healthy-app` | ~90–96 | Full MUI adoption, no duplicates, minimal inline styles |
| `mixed-app` | ~70–80 | Partial adoption, one duplicate family, some inline styles |
| `drifted-app` | ~15–25 | Zero DS imports, 4 button variants, heavy inline styles |

```bash
# Build first, then run against all three
npm run build

node dist/cli.js ../test-projects/healthy-app --html
node dist/cli.js ../test-projects/mixed-app   --html
node dist/cli.js ../test-projects/drifted-app --html
```

---

## Philosophy

- **AST-based, not regex** — accurate analysis of real import and JSX structure
- **Prefer false negatives over noise** — findings are marked "potential", not "definitive"
- **Confidence levels on every duplicate finding** — heuristic uncertainty is surfaced, not hidden
- **Score math is always visible** — engineers can see exactly why a score is what it is
- **Wrapper vs standalone distinction** — thin wrappers around approved components are classified and penalised separately from independent reimplementations

---

## Roadmap

- [ ] CI mode — exit code based on score delta from baseline
- [ ] GitHub Action
- [ ] Trend reports over time
- [ ] Rule packs for Chakra UI, Tailwind, and custom design systems
- [ ] Team dashboard

---

## License

MIT
