# Automatic design system detection

ui-drift needs to know which imports are "approved" design system usage before it can score a codebase. On repos where no config exists yet, that means the first run will always report 0% adoption — which is technically correct but not useful.

Guided DS auto-detection solves this by scanning the repo for likely shared UI paths and suggesting a `ui-drift.config.json` you can accept, adjust, or ignore.

---

## Why it exists

Most teams do have a design system. They just haven't told ui-drift about it yet. Without detection, the tool's first impression on a new codebase is a misleading zero score. Detection closes that gap so the first run is meaningful.

---

## When it triggers

Detection runs automatically when both conditions are met:

- 0 approved design system imports found
- At least 25 local UI imports across at least 50 scanned files

This threshold is intentionally conservative. Detection only fires when the evidence clearly points to a misconfiguration rather than a genuinely undisciplined codebase.

You can also force detection on any repo regardless of adoption level:

```bash
node dist/cli.js ./my-app --detect-ds
```

Or disable it entirely:

```bash
node dist/cli.js ./my-app --no-ds-detect
```

---

## How candidates are discovered

Detection combines three independent signals.

**Import frequency analysis**

All import statements across every scanned file are grouped by their common root. A root used in 2 or more files becomes a candidate. Alias imports (`@/`, `~/`) are truncated at the last UI keyword segment — so `@/modules/ui/components/Button` becomes `@/modules/ui/components`. Scoped packages are truncated at `@scope/package`.

**Filesystem scanning**

ui-drift probes a list of known DS path patterns relative to the project root:

```
packages/ui         src/components/ui    modules/ui
packages/design-system   src/ui          libs/ui
packages/components  src/design-system   lib/ui
src/shared/ui        src/shared/components   components/ui
shared/ui            design-system
```

Any that exist on disk are added as candidates, along with the primitive component names found inside them.

**Workspace package scanning**

In monorepos, ui-drift scans `packages/`, `libs/`, and `modules/` for subdirectories with a `package.json`. Packages whose directory or package name includes a UI keyword and no domain keyword are added as candidates.

---

## How scoring works

Each candidate is scored on four dimensions:

| Signal | Points |
|---|---|
| UI keyword in import root (`ui`, `components`, `design-system`, etc.) | +2 |
| `design-system` or `designsystem` specifically | +1 bonus |
| 3+ detected primitive component names | +3 |
| 1–2 detected primitive component names | +1 |
| 50+ files importing from this root | +5 |
| 10–49 files importing | +3 |
| 3–9 files importing | +1 |
| Domain keyword in root (`billing`, `auth`, `checkout`, etc.) | -2 |

Score floor is 0. Confidence labels:

- **high**: score 8 or above
- **medium**: score 4–7
- **low**: score below 4

Candidates with score 0 or from known non-DS package roots (email libraries, Storybook) are excluded before display.

---

## What goes into the suggested config

The suggested config is built from all high-confidence candidates plus up to two medium ones. Mapping rules:

- **Alias imports** (`@/…`, `~/…`) go into both `designSystemImports` (full alias, for import matching) and `internalDSPaths` (stripped path, for file exclusion)
- **Package imports** (`@scope/pkg`, bare package names) go into `designSystemImports` only; if a local filesystem path was resolved, it also goes into `internalDSPaths`
- **Filesystem-only candidates** (no matching import root) go into `internalDSPaths` only

If every candidate would produce empty arrays, no config is suggested.

---

## CLI flags

| Flag | Behavior |
|---|---|
| `--detect-ds` | Force detection even if adoption is not zero |
| `--no-ds-detect` | Disable detection entirely |
| `--write-config` | Write the suggested config to `ui-drift.config.json` in the target directory; merges with any existing config using union semantics |
| `--rerun-with-suggestion` | Re-run the full audit in memory with the suggested config applied, without writing anything to disk |
| `--print-suggested-config` | Print the suggested config block and exit |

---

## Example: plane (monorepo with internal DS packages)

```
  ── Guided DS auto-detection ──────────────────────────────────

  Trigger: 0 approved design system imports detected across 2132 source files with 1092 local UI imports

  Detected possible internal design system / shared UI paths:

  [high] @/components (586 files) — primitives: form, breadcrumb, switch, select, button, label, …
  [high] @plane/ui (522 files) — primitives: input, checkbox, spinner, avatar, breadcrumb, loader, …
  [high] @headlessui/react (94 files) — primitives: dialog, switch, menu, popover
  [high] @plane/propel (764 files) — primitives: toast, button, tooltip, card, dropdown, label, …

  Suggested config:

  ┌─────────────────────────────────────────────────────────────
  │ {
  │   "designSystemImports": [
  │     "@/components",
  │     "@plane/ui",
  │     "@headlessui/react",
  │     "@plane/propel"
  │   ],
  │   "internalDSPaths": [
  │     "components",
  │     "packages/ui"
  │   ]
  │ }
  └─────────────────────────────────────────────────────────────

  Tip: run with --write-config to save this config, or --rerun-with-suggestion to audit immediately with it.
```

Running with `--rerun-with-suggestion` takes plane from **37/100 Poor** (0% adoption) to **88/100 Excellent** (79% adoption) without any manual config.

---

## Accepting and refining the suggestion

The suggested config is a starting point, not a final answer. After writing it:

1. Open `ui-drift.config.json` and review the entries
2. Remove any candidates that are not part of your actual design system
3. Add any packages the detector missed (especially if import counts were low)
4. Re-run `node dist/cli.js ./my-app` to see the scored result

The config file is yours — detection only suggests, never overwrites without `--write-config`.
