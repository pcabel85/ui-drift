# Configuration

Place `ui-drift.config.json` in the root of the project you are auditing, or pass `--config <path>` to specify a file anywhere.

All fields are optional. Any omitted field falls back to the built-in default.

---

## Full reference

```json
{
  "designSystemImports": [
    "@mui/material",
    "@mui/icons-material",
    "@company/ui"
  ],
  "internalDSPaths": [],
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

---

## Field descriptions

### `designSystemImports`

Array of npm package prefixes to treat as approved design system imports.

```json
"designSystemImports": ["@mui/material", "@mui/icons-material", "@company/ui"]
```

Any import whose source starts with one of these strings is counted as an approved DS import. Used to compute the adoption ratio.

### `internalDSPaths`

For monorepos that maintain their own internal UI package (e.g. `packages/ui`), ui-drift would otherwise misclassify imports from that package as local drift.

`internalDSPaths` accepts an array of path segments. Any import whose source path contains one of these segments is treated as an approved DS import. Components whose `filePath` lives inside one of these directories are treated as canonical DS primitives and are never flagged as duplicates.

**Example (cal.com monorepo):**

```json
{
  "designSystemImports": ["@calcom/ui"],
  "internalDSPaths": ["packages/ui"]
}
```

With this config:
- Imports from `../../packages/ui/Button` are counted as approved DS usage
- Files inside `packages/ui/` are the canonical source of truth and are never flagged as duplicates
- Domain-specific wrappers like `AcceptBookingButton` are excluded from primitive duplicate counts and reported transparently

### `ignorePaths`

Array of path segments to exclude from scanning. Any file whose path contains one of these segments is skipped entirely.

Default: `["node_modules", "dist", "build", "coverage", ".next", "storybook-static"]`

### `familyKeywords`

The list of UI family nouns used for duplicate family grouping. Components are grouped when their names contain the same family noun (e.g. `PrimaryButton` and `GhostButton` both belong to the `button` family).

This list is used alongside the broader `UI_NOUNS` set in the normalizer for matching. Extend it to catch domain-specific UI families in your codebase.

### `penalties`

Controls how much each type of violation reduces the raw sub-scores before they are weighted.

| Field | Default | Description |
|---|---|---|
| `duplicateHigh` | 25 | Base penalty per high-severity duplicate family |
| `duplicateMedium` | 12 | Base penalty per medium-severity duplicate family |
| `duplicateLow` | 4 | Base penalty per low-severity duplicate family |
| `inlineStyle` | 1.5 | Penalty per `style={{}}` usage (per 100 files) |
| `hardcodedColor` | 2 | Penalty per hardcoded color (per 100 files) |
| `hardcodedSpacing` | 1 | Penalty per hardcoded spacing value (per 100 files) |

Duplicate penalties are further modulated by standalone weighting and diminishing returns. See [scoring-model.md](./scoring-model.md) for details.

### `bonuses`

| Field | Default | Description |
|---|---|---|
| `approvedImport` | 0.5 | Reserved for future use |

### `scoreWeights`

Controls how each dimension contributes to the final 0–100 score. Must sum to 100.

| Field | Default |
|---|---|
| `approvedAdoption` | 40 |
| `duplicateComponents` | 20 |
| `tokenCompliance` | 20 |
| `inlineStyles` | 20 |
