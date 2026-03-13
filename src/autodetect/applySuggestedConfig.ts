import * as fs from 'fs';
import * as path from 'path';
import { DSAuditConfig } from '../types';
import { SuggestedConfig, ApplyConfigResult } from './types';

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
 * Produces a merged DSAuditConfig by union-merging the suggested config arrays
 * into the existing config. Does NOT write to disk.
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

function unionStrings(a: string[], b: string[]): string[] {
  const result = [...a];
  for (const v of b) {
    if (!result.includes(v)) result.push(v);
  }
  return result;
}
