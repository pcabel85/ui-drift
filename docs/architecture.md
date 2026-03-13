# Architecture

## Project structure

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

---

## Data flow

```
findSourceFiles
      │
      ▼
analyzeFile (per file)          ← @babel/parser AST
      │  produces ComponentProfile[]
      ▼
┌──────────────────────────────────────────┐
│  importUsageAnalyzer   → ImportUsageResult
│  duplicateFamilyAnalyzer → DuplicateFinding[]
│  inlineStyleAnalyzer   → InlineStyleResult
│  wrapperAnalyzer       → WrapperResult
└──────────────────────────────────────────┘
      │
      ▼
calculateHealthScore → { score, breakdown }
buildSummary         → AuditSummary
generateRecommendations → string[]
      │
      ▼
printTerminalReport / writeJsonReport / writeHtmlReport
```

---

## Key analyzers

### `importUsageAnalyzer`

Counts approved vs local UI imports across all profiles. A file inside `internalDSPaths` is skipped (it is the DS, not a consumer). An import whose source contains an `internalDSPaths` segment counts as approved.

### `duplicateFamilyAnalyzer`

Groups component profiles by normalised UI noun. Filters to families with 2+ primitive-like members (using `isPrimitiveLike()`). Computes severity and confidence from standalone count and shared prop overlap across standalones.

Component kind classification:
- **wrapper** — renders a same-family approved DS component directly
- **feature-composed** — uses DS primitives but has domain logic (zero severity weight)
- **standalone** — no approved DS imports (the main concern)

### `wrapperAnalyzer`

Separate from duplicate detection. Flags when multiple thin wrappers exist around the same base component across the codebase — a different pattern from duplication, handled with its own severity model.

### `inlineStyleAnalyzer`

Walks JSX attributes looking for `style={{}}` objects, `sx={{}}` props, and string/number values on color/spacing CSS properties.

---

## Tech stack

| Package | Purpose |
|---|---|
| `@babel/parser` | AST parsing for TSX/JSX with error recovery |
| `fast-glob` | Cross-platform file discovery |
| `chalk` | Terminal colour output |
| `commander` | CLI argument parsing |
| `typescript` | Dev-time type checking |
| `ts-node` | Run source directly without a build step |

---

## Adding a new analyzer

1. Create `src/analyzers/myAnalyzer.ts` — accepts `ComponentProfile[]` and config, returns a typed result
2. Import and call it in `cli.ts` alongside the other analyzers
3. Pass its output into `calculateHealthScore` if it should affect scoring, or into `printTerminalReport` / `writeJsonReport` for display only
4. Add any new fields to `types.ts` and `AuditResult`
