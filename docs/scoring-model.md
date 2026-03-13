# Scoring model

ui-drift produces a **health score from 0–100** that is a weighted combination of four dimensions.

## Score weights

| Dimension | Weight | What drives it |
|---|---|---|
| DS adoption | 40% | Ratio of approved to local UI imports |
| Duplicate components | 20% | Number and severity of duplicate families |
| Token compliance | 20% | Hardcoded color and spacing violations |
| Inline style usage | 20% | `style={{}}` prop count |

Score labels:

| Range | Label |
|---|---|
| 85–100 | Excellent |
| 70–84 | Good |
| 50–69 | Fair |
| 30–49 | Poor |
| 0–29 | Critical |

---

## Dimension details

### 1. DS adoption (40 pts)

`adoptionScore = adoptionRatio × 100`

The adoption ratio is `approvedImports / (approvedImports + localUiImports)`. Files inside `internalDSPaths` are excluded from the denominator (they are the DS, not consumers of it).

### 2. Duplicate components (20 pts)

Uses a **two-layer penalty model** to prevent a long tail of medium/low findings from zeroing out the score:

**Layer 1 — Standalone weighting**

Each finding's base penalty is multiplied by the fraction of its primitive components that are true standalones (no DS imports). Wrapper-heavy and feature-composed families contribute less.

- `effectivePenalty = basePenalty × max(0.15, standaloneRatio)`
- The `0.15` floor keeps wrapper sprawl on the radar without amplifying it

**Layer 2 — Diminishing returns**

Findings are sorted worst-first. Each successive finding is discounted:

- `discount = 1 / (1 + i × 0.15)` where `i` is the zero-based rank
- The first (worst) finding counts fully; by the 10th it counts ~40%; by the 20th ~25%

This prevents a repo with many localized UI variants from bottoming out at 0/20.

**Penalty values (configurable):**

| Severity | Default base penalty |
|---|---|
| High | 25 |
| Medium | 12 |
| Low | 4 |

### 3. Token compliance (20 pts)

```
tokenPenalty = (hardcodedColors × 2 + hardcodedSpacing × 1) / per100
tokenScore = max(0, 100 − tokenPenalty)
```

### 4. Inline style usage (20 pts)

```
inlinePenalty = (inlineStyles × 1.5 + sxOverrides × 0.5) / per100
inlineScore = max(0, 100 − inlinePenalty)
```

`sx` overrides are penalised at half the rate of raw `style={{}}` props.

---

## Size normalisation

Raw violation counts on large repos produce unfairly large penalties. Penalties for dimensions 3 and 4 are normalised by repo size:

```
per100 = max(100, scannedFiles) / 100
```

A 1,500-file app and a 50-file app are scored on the same yardstick (violations per 100 scanned files). The `max(100, ...)` floor means apps with fewer than 100 files are treated as if they have 100, preventing over-penalisation of small repos.

---

## Score breakdown

Every report exposes the math so engineers can see exactly where points were lost:

```
Score Breakdown

DS adoption          25/40   -15
Duplicate penalty     8/20   -12
Token compliance     12/20    -8
Inline style usage   10/20   -10
```

---

## Audit summary labels

The summary labels are derived from normalised rates (violations per 100 files):

| Metric | None | Low | Moderate | High | Critical |
|---|---|---|---|---|---|
| Inline styles | 0 | ≤ 2 | ≤ 8 | ≤ 25 | > 25 |
| Token violations | 0 | ≤ 5 | ≤ 20 | ≤ 50 | > 50 |

The `topIssue` line is tone-matched to the overall health score so the summary never contradicts the grade.
