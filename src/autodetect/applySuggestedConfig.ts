import * as fs from 'fs';
import * as path from 'path';
import { DSAuditConfig } from '../types';
import { SuggestedConfig, ApplyConfigResult } from './types';
import { normalizeAuditConfig } from '../config/loadConfig';

const CONFIG_FILENAME = 'ui-drift.config.json';

/**
 * Writes (or merges) the suggested config into ui-drift.config.json at targetDir.
 * Returns metadata about what was written.
 */
export function applySuggestedConfig(
  suggested: SuggestedConfig,
  targetDir: string
): ApplyConfigResult {
  const configPath = path.join(targetDir, CONFIG_FILENAME);
  const hadExistingConfig = fs.existsSync(configPath);
  const diffLines: string[] = [];

  let existing: Partial<DSAuditConfig> = {};
  if (hadExistingConfig) {
    try {
      existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      // treat as empty if unparseable
    }
  }

  // Union-merge arrays (do NOT replace existing entries)
  const mergedImports = unionStrings(
    (existing.designSystemImports as string[] | undefined) ?? [],
    suggested.designSystemImports
  );
  const mergedPaths = unionStrings(
    (existing.internalDSPaths as string[] | undefined) ?? [],
    suggested.internalDSPaths
  );

  if (hadExistingConfig) {
    const prevImports = (existing.designSystemImports as string[] | undefined) ?? [];
    const prevPaths = (existing.internalDSPaths as string[] | undefined) ?? [];

    for (const v of mergedImports) {
      if (!prevImports.includes(v)) diffLines.push(`+ designSystemImports: "${v}"`);
    }
    for (const v of mergedPaths) {
      if (!prevPaths.includes(v)) diffLines.push(`+ internalDSPaths: "${v}"`);
    }
  }

  const out: Record<string, unknown> = {
    ...existing,
    designSystemImports: mergedImports,
    internalDSPaths: mergedPaths,
  };

  fs.writeFileSync(configPath, JSON.stringify(out, null, 2) + '\n', 'utf-8');

  return { written: true, configPath, hadExistingConfig, diffLines };
}

/**
 * Builds the in-memory rerun config for --rerun-with-suggestion.
 *
 * Produces the exact same effective config as the applySuggestedConfig + loadConfig
 * path by following the same two steps:
 *
 *  1. Read the raw config file from targetDir (if one exists) and union its
 *     arrays with the suggestion — identical to what applySuggestedConfig writes.
 *  2. Pass the resulting raw object through normalizeAuditConfig (deepMerge with
 *     defaultConfig) — identical to what loadConfig does after reading the file.
 *
 * This guarantees the invariant:
 *   audit(buildRerunConfig(...)) === audit(applySuggestedConfig(...) + loadConfig(...))
 *
 * @param _config - Preserved for API compatibility. Not used internally: the
 *   effective config is always derived from the targetDir's on-disk file plus
 *   defaultConfig, mirroring the applySuggestedConfig + loadConfig path.
 *   (The previous implementation spread `...config` here, which caused score
 *   divergence when `config` was loaded from a CWD that had its own
 *   ui-drift.config.json with non-default penalties or weights.)
 */
export function buildRerunConfig(
  _config: DSAuditConfig,
  suggested: SuggestedConfig,
  targetDir: string
): DSAuditConfig {
  const configPath = path.join(targetDir, CONFIG_FILENAME);
  let existingFileConfig: Partial<DSAuditConfig> = {};

  if (fs.existsSync(configPath)) {
    try {
      existingFileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch { /* treat as empty on parse error */ }
  }

  const existingFileImports = (existingFileConfig.designSystemImports as string[] | undefined) ?? [];
  const existingFilePaths   = (existingFileConfig.internalDSPaths   as string[] | undefined) ?? [];

  // Build the same raw object that applySuggestedConfig would write to disk,
  // then normalize identically to loadConfig (deepMerge with defaultConfig).
  const rawConfig: Partial<DSAuditConfig> = {
    ...existingFileConfig,
    designSystemImports: unionStrings(existingFileImports, suggested.designSystemImports),
    internalDSPaths:     unionStrings(existingFilePaths,   suggested.internalDSPaths),
  };

  return normalizeAuditConfig(rawConfig);
}

/**
 * Produces a merged DSAuditConfig by union-merging the suggested config arrays
 * into the existing config. Does NOT write to disk.
 * @deprecated Use buildRerunConfig for the --rerun-with-suggestion path.
 */
export function mergeConfigInMemory(
  base: DSAuditConfig,
  suggested: SuggestedConfig
): DSAuditConfig {
  return {
    ...base,
    designSystemImports: unionStrings(base.designSystemImports ?? [], suggested.designSystemImports),
    internalDSPaths: unionStrings(base.internalDSPaths ?? [], suggested.internalDSPaths),
  };
}

export function unionStrings(a: string[], b: string[]): string[] {
  const result = [...a];
  for (const v of b) {
    if (!result.includes(v)) result.push(v);
  }
  return result;
}
