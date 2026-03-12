import { DSAuditConfig, DuplicateFinding, ScoreBreakdown, AuditSummary } from '../types';
import { ImportUsageResult } from '../analyzers/importUsageAnalyzer';
import { InlineStyleResult } from '../analyzers/inlineStyleAnalyzer';

export function calculateHealthScore(
  importUsage: ImportUsageResult,
  duplicateFindings: DuplicateFinding[],
  inlineStyles: InlineStyleResult,
  config: DSAuditConfig
): { score: number; breakdown: ScoreBreakdown } {
  const weights = config.scoreWeights;

  // ── 1. Approved adoption (40%) ────────────────────────────────────────────────
  const adoptionScore = Math.round(importUsage.adoptionRatio * 100);

  // ── 2. Duplicate components (20%) ─────────────────────────────────────────────
  let duplicatePenaltyRaw = 0;
  for (const finding of duplicateFindings) {
    if (finding.severity === 'high') duplicatePenaltyRaw += config.penalties.duplicateHigh;
    else if (finding.severity === 'medium') duplicatePenaltyRaw += config.penalties.duplicateMedium;
    else duplicatePenaltyRaw += config.penalties.duplicateLow;
  }
  const duplicateScore = Math.max(0, 100 - duplicatePenaltyRaw);

  // ── 3. Token compliance (20%) ──────────────────────────────────────────────────
  const tokenPenaltyRaw =
    inlineStyles.totalHardcodedColors * config.penalties.hardcodedColor +
    inlineStyles.totalHardcodedSpacing * config.penalties.hardcodedSpacing;
  const tokenScore = Math.max(0, 100 - tokenPenaltyRaw);

  // ── 4. Inline styles (20%) ─────────────────────────────────────────────────────
  const inlineStylePenaltyRaw =
    inlineStyles.totalInlineStyles * config.penalties.inlineStyle +
    inlineStyles.totalSxOverrides * 0.5;
  const inlineStyleScore = Math.max(0, 100 - inlineStylePenaltyRaw);

  // ── Weighted contributions ─────────────────────────────────────────────────────
  const adoptionContribution  = (adoptionScore    * weights.approvedAdoption)   / 100;
  const duplicateContribution = (duplicateScore   * weights.duplicateComponents) / 100;
  const tokenContribution     = (tokenScore       * weights.tokenCompliance)     / 100;
  const inlineContribution    = (inlineStyleScore * weights.inlineStyles)        / 100;

  const finalScore = Math.min(100, Math.max(0, Math.round(
    adoptionContribution + duplicateContribution + tokenContribution + inlineContribution
  )));

  const breakdown: ScoreBreakdown = {
    adoptionScore,
    duplicateScore,
    tokenScore,
    inlineStyleScore,
    adoptionContribution:  Math.round(adoptionContribution),
    duplicateContribution: Math.round(duplicateContribution),
    tokenContribution:     Math.round(tokenContribution),
    inlineStyleContribution: Math.round(inlineContribution),
    adoptionPenalty:  Math.round(weights.approvedAdoption   - adoptionContribution),
    duplicatePenalty: Math.round(weights.duplicateComponents - duplicateContribution),
    tokenPenalty:     Math.round(weights.tokenCompliance     - tokenContribution),
    inlineStylePenalty: Math.round(weights.inlineStyles      - inlineContribution),
  };

  return { score: finalScore, breakdown };
}

export function buildSummary(
  importUsage: ImportUsageResult,
  duplicateFindings: DuplicateFinding[],
  inlineStyles: InlineStyleResult,
  healthScore: number
): AuditSummary {
  const adoptionPercent = Math.round(importUsage.adoptionRatio * 100);

  // Only count raw style={{}} for the label — sx is an intentional MUI pattern.
  const hardStyleCount = inlineStyles.totalInlineStyles;
  const inlineStyleLevel =
    hardStyleCount === 0   ? 'None'
    : hardStyleCount <= 3  ? 'Low'
    : hardStyleCount <= 15 ? 'Moderate'
    : hardStyleCount <= 40 ? 'High'
    : 'Critical';

  const totalToken = inlineStyles.totalHardcodedColors + inlineStyles.totalHardcodedSpacing;
  const tokenViolationLevel =
    totalToken === 0    ? 'None'
    : totalToken <= 10  ? 'Low'
    : totalToken <= 40  ? 'Moderate'
    : totalToken <= 100 ? 'High'
    : 'Critical';

  // Top issue tone is anchored to the overall health score so the summary
  // never contradicts the grade.
  let topIssue: string;
  if (healthScore >= 85) {
    topIssue = 'No critical issues detected';
  } else if (healthScore >= 70) {
    topIssue = 'Action recommended in several areas';
  } else if (healthScore >= 45) {
    if (adoptionPercent < 50)
      topIssue = 'Significant design system adoption gap';
    else if (duplicateFindings.some((d) => d.severity === 'high'))
      topIssue = 'High-severity duplicate component families';
    else
      topIssue = 'Multiple areas need attention before this repo is healthy';
  } else {
    if (adoptionPercent < 20)
      topIssue = 'Critical: almost no approved design system usage detected';
    else
      topIssue = 'Critical issues require immediate attention';
  }

  return {
    adoptionPercent,
    duplicateFamilyCount: duplicateFindings.length,
    inlineStyleLevel,
    tokenViolationLevel,
    topIssue,
  };
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 30) return 'Poor';
  return 'Critical';
}

export function scoreColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 70) return 'green';
  if (score >= 45) return 'yellow';
  return 'red';
}
