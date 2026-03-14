/**
 * Regression tests for DriftSense suggestion application.
 *
 * DriftSense suggestion application now uses identical merge behavior for both
 * persisted and in-memory reruns, ensuring score consistency across execution modes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { buildRerunConfig, applySuggestedConfig } from '../applySuggestedConfig';
import { SuggestedConfig } from '../types';
import { defaultConfig } from '../../config/defaultConfig';
import { loadConfig } from '../../config/loadConfig';
import { findSourceFiles } from '../../scanner/findSourceFiles';
import { analyzeFile } from '../../scanner/analyzeFile';
import { analyzeImportUsage } from '../../analyzers/importUsageAnalyzer';
import { analyzeDuplicateFamilies } from '../../analyzers/duplicateFamilyAnalyzer';
import { analyzeInlineStyles } from '../../analyzers/inlineStyleAnalyzer';
import { analyzeWrappers } from '../../analyzers/wrapperAnalyzer';
import { calculateHealthScore } from '../../scoring/calculateHealthScore';
import { isComponentFile } from '../../utils/isComponentFile';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const HEALTHY_APP = path.resolve(__dirname, '../../..', 'test-projects/healthy-app');

const BASE_CONFIG = { ...defaultConfig };

function makeSuggestion(
  designSystemImports: string[],
  internalDSPaths: string[] = []
): SuggestedConfig {
  return { designSystemImports, internalDSPaths };
}

// ── buildRerunConfig: existing config file ────────────────────────────────────

describe('buildRerunConfig – existing config file', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-drift-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('unions existing designSystemImports with suggestion imports', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'ui-drift.config.json'),
      JSON.stringify({ designSystemImports: ['@/components', '@plane/ui'] })
    );

    const suggestion = makeSuggestion(['@plane/propel', '@plane/ui']);
    const result = buildRerunConfig(BASE_CONFIG, suggestion, tmpDir);

    expect(result.designSystemImports).toContain('@/components');
    expect(result.designSystemImports).toContain('@plane/ui');
    expect(result.designSystemImports).toContain('@plane/propel');
  });

  it('does not duplicate entries present in both the file and the suggestion', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'ui-drift.config.json'),
      JSON.stringify({ designSystemImports: ['@plane/ui', 'lucide-react'] })
    );

    const suggestion = makeSuggestion(['@plane/ui', '@plane/propel']);
    const result = buildRerunConfig(BASE_CONFIG, suggestion, tmpDir);

    const count = result.designSystemImports.filter((s) => s === '@plane/ui').length;
    expect(count).toBe(1);
  });

  it('unions existing internalDSPaths with suggestion paths', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'ui-drift.config.json'),
      JSON.stringify({
        designSystemImports: [],
        internalDSPaths: ['packages/ui'],
      })
    );

    const suggestion = makeSuggestion([], ['packages/ui', 'plane-web/components']);
    const result = buildRerunConfig(BASE_CONFIG, suggestion, tmpDir);

    expect(result.internalDSPaths).toContain('packages/ui');
    expect(result.internalDSPaths).toContain('plane-web/components');
    expect(result.internalDSPaths.filter((s) => s === 'packages/ui').length).toBe(1);
  });

  it('preserves other config fields (penalties, scoreWeights) from the base config', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'ui-drift.config.json'),
      JSON.stringify({ designSystemImports: ['@acme/ui'] })
    );

    const suggestion = makeSuggestion(['@acme/icons']);
    const result = buildRerunConfig(BASE_CONFIG, suggestion, tmpDir);

    expect(result.penalties).toEqual(BASE_CONFIG.penalties);
    expect(result.scoreWeights).toEqual(BASE_CONFIG.scoreWeights);
  });
});

// ── buildRerunConfig: no existing config file ─────────────────────────────────

describe('buildRerunConfig – no existing config file', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-drift-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('uses suggestion imports as-is when no config file is present', () => {
    const suggestion = makeSuggestion(['@plane/propel', 'lucide-react']);
    const result = buildRerunConfig(BASE_CONFIG, suggestion, tmpDir);

    expect(result.designSystemImports).toEqual(['@plane/propel', 'lucide-react']);
  });

  it('uses suggestion internalDSPaths as-is when no config file is present', () => {
    const suggestion = makeSuggestion(['@plane/propel'], ['packages/ui']);
    const result = buildRerunConfig(BASE_CONFIG, suggestion, tmpDir);

    expect(result.internalDSPaths).toEqual(['packages/ui']);
  });

  it('does not include defaultConfig placeholder imports (e.g. @mui/material)', () => {
    const suggestion = makeSuggestion(['@acme/design-system']);
    const result = buildRerunConfig(BASE_CONFIG, suggestion, tmpDir);

    // defaultConfig carries placeholder entries; they must not bleed into the rerun
    expect(result.designSystemImports).not.toContain('@mui/material');
    expect(result.designSystemImports).not.toContain('@company/ui');
  });
});

// ── Score equivalence: persisted vs in-memory rerun ───────────────────────────

describe('score equivalence – persisted vs in-memory rerun', () => {
  /**
   * Runs the full audit pipeline against a project directory with the given
   * config and returns the health score and key counts.
   */
  async function runAudit(config: ReturnType<typeof loadConfig>, projectDir: string) {
    const allFiles = await findSourceFiles(projectDir, config.ignorePaths);
    const profiles = allFiles
      .map((f) => analyzeFile(f, config.designSystemImports))
      .filter((p): p is NonNullable<typeof p> => p !== null);

    const componentProfiles = profiles.filter((p) => isComponentFile(p.filePath));

    const importUsage       = analyzeImportUsage(profiles, config);
    const duplicateFindings = analyzeDuplicateFamilies(componentProfiles, config);
    const inlineStyles      = analyzeInlineStyles(profiles);
    const wrappers          = analyzeWrappers(componentProfiles, config);
    const { score }         = calculateHealthScore(importUsage, duplicateFindings, inlineStyles, config, allFiles.length);

    return {
      score,
      totalApproved:        importUsage.totalApproved,
      totalLocal:           importUsage.totalLocal,
      duplicateFamilyCount: duplicateFindings.length,
      wrapperCount:         wrappers.wrappers.length,
    };
  }

  it('produces identical audit results for persisted and in-memory execution paths', async () => {
    // healthy-app already has a ui-drift.config.json — use it as the "existing" file.
    const existingConfig   = loadConfig(undefined, HEALTHY_APP);
    const existingRaw      = JSON.parse(
      fs.readFileSync(path.join(HEALTHY_APP, 'ui-drift.config.json'), 'utf-8')
    );

    // Suggestion adds one new entry that is NOT already in the existing config.
    const suggestion = makeSuggestion([
      ...existingRaw.designSystemImports,
      '@acme/icons', // novel entry
    ]);

    // ── Persisted path ──────────────────────────────────────────────────────
    // Simulate applySuggestedConfig: the written file would be the union.
    const mergedImports = Array.from(
      new Set([...existingRaw.designSystemImports, ...suggestion.designSystemImports])
    );
    const mergedPaths = Array.from(
      new Set([...(existingRaw.internalDSPaths ?? []), ...suggestion.internalDSPaths])
    );
    const persistedConfig = {
      ...existingConfig,
      designSystemImports: mergedImports,
      internalDSPaths: mergedPaths,
    };

    // ── In-memory rerun path ────────────────────────────────────────────────
    const rerunConfig = buildRerunConfig(existingConfig, suggestion, HEALTHY_APP);

    // Both configs must be structurally equivalent.
    expect(rerunConfig.designSystemImports.sort()).toEqual(persistedConfig.designSystemImports.sort());
    expect(rerunConfig.internalDSPaths.sort()).toEqual(persistedConfig.internalDSPaths.sort());

    // Run the full audit pipeline with both configs.
    const [persistedResult, rerunResult] = await Promise.all([
      runAudit(persistedConfig, HEALTHY_APP),
      runAudit(rerunConfig, HEALTHY_APP),
    ]);

    expect(rerunResult.score).toBe(persistedResult.score);
    expect(rerunResult.totalApproved).toBe(persistedResult.totalApproved);
    expect(rerunResult.totalLocal).toBe(persistedResult.totalLocal);
    expect(rerunResult.duplicateFamilyCount).toBe(persistedResult.duplicateFamilyCount);
    expect(rerunResult.wrapperCount).toBe(persistedResult.wrapperCount);
  });
});
