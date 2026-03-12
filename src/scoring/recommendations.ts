import { DuplicateFinding } from '../types';
import { ImportUsageResult } from '../analyzers/importUsageAnalyzer';
import { InlineStyleResult } from '../analyzers/inlineStyleAnalyzer';
import { WrapperAnalysisResult } from '../analyzers/wrapperAnalyzer';

export function generateRecommendations(
  importUsage: ImportUsageResult,
  duplicateFindings: DuplicateFinding[],
  inlineStyles: InlineStyleResult,
  wrappers: WrapperAnalysisResult,
  healthScore: number
): string[] {
  const recs: string[] = [];

  // Import adoption recommendations
  if (importUsage.adoptionRatio < 0.5) {
    const topLocal = Object.entries(importUsage.localUiImportCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name]) => name);

    if (topLocal.length > 0) {
      recs.push(
        `Low design system adoption (${Math.round(importUsage.adoptionRatio * 100)}%). ` +
        `Migrate local components to approved imports, starting with: ${topLocal.join(', ')}.`
      );
    } else {
      recs.push(
        `Low design system adoption (${Math.round(importUsage.adoptionRatio * 100)}%). ` +
        `Increase usage of approved design system imports.`
      );
    }
  } else if (importUsage.adoptionRatio < 0.8) {
    recs.push(
      `Design system adoption at ${Math.round(importUsage.adoptionRatio * 100)}%. ` +
      `Continue migrating local UI components to approved imports.`
    );
  }

  // Duplicate component recommendations
  const highDups = duplicateFindings.filter((d) => d.severity === 'high');
  const medDups = duplicateFindings.filter((d) => d.severity === 'medium');

  if (highDups.length > 0) {
    const families = highDups.map((d) => d.family).join(', ');
    recs.push(
      `${highDups.length} high-severity duplicate component family(ies) found: ${families}. ` +
      `Consolidate to a single implementation using approved DS components.`
    );
  }

  if (medDups.length > 0) {
    const families = medDups.map((d) => d.family).join(', ');
    recs.push(
      `${medDups.length} medium-severity duplicate family(ies): ${families}. ` +
      `Review for consolidation opportunities.`
    );
  }

  // Inline style recommendations
  if (inlineStyles.totalInlineStyles > 10) {
    recs.push(
      `${inlineStyles.totalInlineStyles} inline style props detected. ` +
      `Replace with design system tokens or utility classes.`
    );
  }

  if (inlineStyles.totalHardcodedColors > 5) {
    recs.push(
      `${inlineStyles.totalHardcodedColors} hardcoded color values found. ` +
      `Replace with approved color tokens from your design system.`
    );
  }

  if (inlineStyles.totalHardcodedSpacing > 10) {
    recs.push(
      `${inlineStyles.totalHardcodedSpacing} hardcoded spacing values found. ` +
      `Replace with approved spacing tokens (e.g., spacing(2) instead of 16px).`
    );
  }

  // Wrapper sprawl recommendations
  const sprawlKeys = Object.keys(wrappers.sprawlGroups);
  if (sprawlKeys.length > 0) {
    recs.push(
      `Wrapper sprawl detected around: ${sprawlKeys.join(', ')}. ` +
      `Multiple thin wrappers around the same base component signal design drift. ` +
      `Consider a single shared wrapper or use the base component directly.`
    );
  }

  // General score-based recommendation
  if (healthScore < 40) {
    recs.push(
      `Overall score is critical (${healthScore}/100). ` +
      `Consider a dedicated design system migration sprint to address the most impactful issues above.`
    );
  }

  return recs.slice(0, 6); // Cap at 6 recommendations
}
