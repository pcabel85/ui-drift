import { DSAuditConfig, DuplicateFinding, ScoreBreakdown, AuditSummary } from '../types';
import { ImportUsageResult } from '../analyzers/importUsageAnalyzer';
import { InlineStyleResult } from '../analyzers/inlineStyleAnalyzer';

export function calculateHealthScore(
  importUsage: ImportUsageResult,
  duplicateFindings: DuplicateFinding[],
  inlineStyles: InlineStyleResult,
  config: DSAuditConfig,
  scannedFiles: number
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

  // ── 3 & 4. Token compliance and inline styles — normalised by repo size ───────
  // Raw counts on large repos produce unfairly huge penalties. We penalise the
  // *rate* (violations per 100 scanned files) so a 1,500-file app and a 50-file
  // app are judged on the same yardstick.
  // Normalise against a minimum baseline of 100 files so small apps are not
  // over-penalised. Apps with fewer than 100 files are scored on raw counts
  // (same as the pre-normalisation baseline); larger repos get the benefit.
  const per100 = Math.max(100, scannedFiles) / 100;

  const tokenPenaltyRaw = (
    inlineStyles.totalHardcodedColors  * config.penalties.hardcodedColor +
    inlineStyles.totalHardcodedSpacing * config.penalties.hardcodedSpacing
  ) / per100;
  const tokenScore = Math.max(0, 100 - tokenPenaltyRaw);

  const inlineStylePenaltyRaw = (
    inlineStyles.totalInlineStyles * config.penalties.inlineStyle +
    inlineStyles.totalSxOverrides  * 0.5
  ) / per100;
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
    tokenScore:      Math.round(tokenScore),
    inlineStyleScore: Math.round(inlineStyleScore),
    adoptionContribution:    Math.round(adoptionContribution),
    duplicateContribution:   Math.round(duplicateContribution),
    tokenContribution:       Math.round(tokenContribution),
    inlineStyleContribution: Math.round(inlineContribution),
    adoptionPenalty:    Math.round(weights.approvedAdoption    - adoptionContribution),
    duplicatePenalty:   Math.round(weights.duplicateComponents - duplicateContribution),
    tokenPenalty:       Math.round(weights.tokenCompliance     - tokenContribution),
    inlineStylePenalty: Math.round(weights.inlineStyles        - inlineContribution),
  };

  return { score: finalScore, breakdown };
}

export function buildSummary(
  importUsage: ImportUsageResult,
  duplicateFindings: DuplicateFinding[],
  inlineStyles: InlineStyleResult,
  healthScore: number,
  scannedFiles: number
): AuditSummary {
  const adoptionPercent = Math.round(importUsage.adoptionRatio * 100);

  // Normalise violation counts by repo size before applying label thresholds.
  // Normalise against a minimum baseline of 100 files so small apps are not
  // over-penalised. Apps with fewer than 100 files are scored on raw counts
  // (same as the pre-normalisation baseline); larger repos get the benefit.
  const per100 = Math.max(100, scannedFiles) / 100;

  const inlineRate = inlineStyles.totalInlineStyles / per100;
  const inlineStyleLevel =
    inlineRate === 0    ? 'None'
    : inlineRate <= 2   ? 'Low'
    : inlineRate <= 8   ? 'Moderate'
    : inlineRate <= 25  ? 'High'
    : 'Critical';

  const tokenRate = (inlineStyles.totalHardcodedColors + inlineStyles.totalHardcodedSpacing) / per100;
  const tokenViolationLevel =
    tokenRate === 0   ? 'None'
    : tokenRate <= 5  ? 'Low'
    : tokenRate <= 20 ? 'Moderate'
    : tokenRate <= 50 ? 'High'
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
