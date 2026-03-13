# Philosophy

## Core principles

**AST-based, not regex**

ui-drift uses `@babel/parser` to parse TypeScript/JSX into a full AST before analyzing imports and JSX structure. It understands the actual shape of the code, not pattern-matched strings, so results are accurate even with unusual formatting or complex re-exports.

**Prefer false negatives over noise**

Findings are surfaced as "potential" duplicates, not definitive violations. The tool is designed to help engineers have a conversation, not to block CI with spurious failures. If a finding has low confidence, it says so.

**Confidence levels on every duplicate finding**

Every duplicate family finding includes a confidence score (`high` / `medium` / `low`) that reflects how certain the heuristic is. Components named similarly but with genuinely different roles will usually come back with low or medium confidence. Engineers can use that signal to triage what's worth acting on.

**Score math is always visible**

The breakdown section in every report shows exactly how many points were lost in each dimension and why. A score of 68 should never feel like a mystery.

**Wrapper vs standalone vs feature-composed distinction**

Not all local implementations are equal:

- A **standalone** component (no DS imports, no DS wrapping) is the most concerning: it's a full reimplementation that can drift independently
- A **wrapper** around an approved DS component is less severe because it's still using the DS, just with an extra layer
- A **feature-composed** component (e.g. `BookingList`, `CreateEventModal`) uses DS primitives but contains domain logic. Flagging it as drift would be a false positive.

Penalties reflect this distinction. The goal is to surface real maintenance risk, not punish thoughtful composition.

**Size-aware scoring**

A 1,500-file app with 200 inline styles is healthier (proportionally) than a 20-file app with 200 inline styles. Inline style and token penalties are normalised by file count so repos of all sizes are judged on the same yardstick.

**Diminishing returns on duplicate penalties**

A codebase with 20 low-severity duplicate families should not score 0/20 on duplicates. The duplicate penalty applies diminishing returns, so the 10th finding contributes ~40% of what the 1st does. Some UI noun collision is unavoidable in large codebases, and the scoring reflects that.
