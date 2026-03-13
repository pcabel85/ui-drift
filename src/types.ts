export interface DSAuditConfig {
  designSystemImports: string[];
  /**
   * Path segments that identify monorepo-internal UI packages (e.g. ["packages/ui"]).
   * Any import whose source contains one of these segments is treated as an approved
   * DS import. Components whose filePath lives inside one of these directories are
   * considered canonical DS primitives and are never flagged as duplicates.
   */
  internalDSPaths: string[];
  ignorePaths: string[];
  familyKeywords: string[];
  penalties: {
    duplicateHigh: number;
    duplicateMedium: number;
    duplicateLow: number;
    inlineStyle: number;
    hardcodedColor: number;
    hardcodedSpacing: number;
  };
  bonuses: {
    approvedImport: number;
  };
  scoreWeights: {
    approvedAdoption: number;
    duplicateComponents: number;
    tokenCompliance: number;
    inlineStyles: number;
  };
}

export interface ImportInfo {
  source: string;
  specifiers: string[];
}

export interface ComponentProfile {
  filePath: string;
  fileName: string;
  componentName: string;
  exportedName?: string;
  props: string[];
  imports: ImportInfo[];
  jsxElements: string[];
  wrapsApprovedComponent: boolean;
  approvedBaseComponents: string[];
  inlineStyleCount: number;
  sxOverrideCount: number;
  hardcodedColors: string[];
  hardcodedSpacingCount: number;
}

/** How a component in a duplicate family is classified */
export type ComponentKind = 'wrapper' | 'standalone';

export interface DuplicateComponent {
  filePath: string;
  kind: ComponentKind;
  /** The DS component it wraps, if kind === 'wrapper' */
  wraps?: string;
}

/** Confidence in a duplicate detection finding */
export type Confidence = 'high' | 'medium' | 'low';

export interface DuplicateFinding {
  family: string;
  severity: 'high' | 'medium' | 'low';
  /** Structured per-component entries */
  components: DuplicateComponent[];
  reason: string;
  confidence: Confidence;
  /** Human-readable explanation of why this matters */
  whyItMatters: string;
  /** Number of feature-specific components excluded from severity calculation */
  featureComponentsExcluded: number;
}

/** Per-dimension breakdown shown alongside the final score */
export interface ScoreBreakdown {
  adoptionScore: number;
  duplicateScore: number;
  tokenScore: number;
  inlineStyleScore: number;
  adoptionContribution: number;
  duplicateContribution: number;
  tokenContribution: number;
  inlineStyleContribution: number;
  adoptionPenalty: number;
  duplicatePenalty: number;
  tokenPenalty: number;
  inlineStylePenalty: number;
}

/** Quick skim summary for leadership */
export interface AuditSummary {
  adoptionPercent: number;
  duplicateFamilyCount: number;
  inlineStyleLevel: string;
  tokenViolationLevel: string;
  topIssue: string;
}

export interface AuditResult {
  healthScore: number;
  scoreBreakdown: ScoreBreakdown;
  summary: AuditSummary;
  scannedFiles: number;
  approvedImportCounts: Record<string, number>;
  localUiImportCounts: Record<string, number>;
  duplicateFindings: DuplicateFinding[];
  inlineStyleCount: number;
  sxOverrideCount: number;
  hardcodedColorCount: number;
  hardcodedSpacingCount: number;
  recommendations: string[];
}
