# JSON output schema

Generate with `--json` (writes to file) or `--json-only` (prints to stdout):

```bash
node dist/cli.js ./my-app --json
node dist/cli.js ./my-app --json-only
```

---

## Top-level shape

```json
{
  "healthScore": 68,
  "scoreBreakdown": { ... },
  "summary": { ... },
  "scannedFiles": 214,
  "approvedImportCounts": { ... },
  "localUiImportCounts": { ... },
  "duplicateFindings": [ ... ],
  "inlineStyleCount": 44,
  "sxOverrideCount": 12,
  "hardcodedColorCount": 19,
  "hardcodedSpacingCount": 27,
  "recommendations": [ ... ]
}
```

---

## `scoreBreakdown`

```json
{
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
}
```

`*Score`: sub-score out of 100 before weighting
`*Contribution`: points contributed to the final score (score × weight / 100)
`*Penalty`: points lost in that dimension (weight − contribution)

---

## `summary`

```json
{
  "adoptionPercent": 61,
  "duplicateFamilyCount": 3,
  "inlineStyleLevel": "High",
  "tokenViolationLevel": "Moderate",
  "topIssue": "High-severity duplicate component families"
}
```

`inlineStyleLevel` and `tokenViolationLevel` are one of: `"None"` `"Low"` `"Moderate"` `"High"` `"Critical"`

---

## `approvedImportCounts` / `localUiImportCounts`

Flat objects mapping import specifier to count:

```json
{
  "@mui/material/Button": 42,
  "@mui/material/Card": 17
}
```

---

## `duplicateFindings`

Array of duplicate family findings, sorted high → medium → low severity:

```json
[
  {
    "family": "button",
    "severity": "high",
    "confidence": "high",
    "components": [
      { "filePath": "src/components/Button.tsx", "kind": "standalone" },
      { "filePath": "src/shared/PrimaryButton.tsx", "kind": "standalone" },
      { "filePath": "src/checkout/CTAButton.tsx", "kind": "wrapper", "wraps": "MuiButton" }
    ],
    "reason": "3 primitive-class components; 2 standalones without approved DS imports; overlapping props: onClick, children",
    "whyItMatters": "Multiple independent button implementations increase maintenance cost...",
    "featureComponentsExcluded": 2
  }
]
```

### `severity`
`"high"` | `"medium"` | `"low"`

### `confidence`
`"high"` | `"medium"` | `"low"`. Reflects how certain the heuristic is that these are true duplicates rather than coincidentally named components.

### `components[].kind`
| Value | Meaning |
|---|---|
| `standalone` | No approved DS import; independently re-implemented |
| `wrapper` | Thin wrapper around an approved DS component from the same family |
| `feature-composed` | Uses DS primitives but has domain-specific logic; excluded from severity |

### `featureComponentsExcluded`
Count of domain-specific components (e.g. `AcceptBookingButton`, `CreateEventModal`) that share the family noun but were excluded from the primitive duplicate count. Reported for transparency.

---

## `recommendations`

Array of plain-English recommendation strings, ordered by priority:

```json
[
  "Low design system adoption (61%). Migrate local components to approved imports, starting with: Button, PrimaryButton, CTAButton.",
  "1 high-severity duplicate family: button. Consolidate to a single implementation using approved DS components."
]
```
