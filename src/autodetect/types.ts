import { DSAuditConfig } from '../types';

/** How a candidate was primarily discovered */
export type DetectionSource =
  | 'import-frequency'   // high-frequency import root found via profile analysis
  | 'filesystem'         // known DS path pattern found on disk
  | 'workspace-package'; // workspace package with a UI-like name

export interface DsCandidate {
  /** Import root to suggest for designSystemImports (e.g. "@/modules/ui/components", "@plane/ui") */
  importRoot: string;

  /**
   * Filesystem path segment relative to targetDir for internalDSPaths.
   * Undefined for bare package imports with no resolvable local path.
   */
  fsPath: string | undefined;

  /** Strongest detection signal for this candidate */
  source: DetectionSource;

  /** Primitive component names detected under fsPath (or inferred from specifiers) */
  detectedPrimitives: string[];

  /** Number of distinct source files importing from this root */
  importingFileCount: number;

  /** Raw composite score */
  score: number;

  /** Confidence level derived from score */
  confidence: 'high' | 'medium' | 'low';
}

export interface AutoDetectResult {
  /** All candidates above the minimum score threshold */
  candidates: DsCandidate[];

  /** Whether the automatic trigger conditions were met */
  triggerMet: boolean;

  /** Human-readable explanation of why detection was triggered */
  triggerReason: string;
}

/** The config block we suggest writing / applying */
export interface SuggestedConfig {
  designSystemImports: string[];
  internalDSPaths: string[];
}

export interface ApplyConfigResult {
  written: boolean;
  configPath: string;
  hadExistingConfig: boolean;
  /** Human-readable diff lines when hadExistingConfig is true */
  diffLines: string[];
}
