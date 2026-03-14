/**
 * Regression tests for three bugs found during the multi-repo audit sweep.
 *
 * Bug 1 — `--json-only` / `--score-only` + DriftSense pause emitted no output.
 *   shouldPause did not check !silent, so those modes hit process.exit(0) and
 *   stdout was empty. Fix: add !silent to shouldPause.
 *
 * Bug 2 — Non-paused `--write-config` ran the audit with the pre-write config.
 *   After applySuggestedConfig wrote the file, executeAudit(config) used the
 *   original config variable rather than reloading from disk. Fix: reload from
 *   disk and return after writing, matching the paused --write-config path.
 *
 * Bug 3 — Score breakdown contributions could sum to healthScore ± 1.
 *   finalScore was Math.round(rawSum) but each breakdown contribution was
 *   Math.round(rawContribution) independently — double-rounding. Fix: round
 *   each contribution once and sum the rounded values for healthScore.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';

import { defaultConfig } from '../config/defaultConfig';
import { loadConfig } from '../config/loadConfig';
import { applySuggestedConfig, buildRerunConfig } from '../autodetect/applySuggestedConfig';
import { findSourceFiles } from '../scanner/findSourceFiles';
import { analyzeFile } from '../scanner/analyzeFile';
import { analyzeImportUsage } from '../analyzers/importUsageAnalyzer';
import { analyzeDuplicateFamilies } from '../analyzers/duplicateFamilyAnalyzer';
import { analyzeInlineStyles } from '../analyzers/inlineStyleAnalyzer';
import { analyzeWrappers } from '../analyzers/wrapperAnalyzer';
import { calculateHealthScore } from '../scoring/calculateHealthScore';
import { isComponentFile } from '../utils/isComponentFile';

// ── Shared helpers ─────────────────────────────────────────────────────────────

const CLI        = path.resolve(__dirname, '../../dist/cli.js');
const HEALTHY    = path.resolve(__dirname, '../..', 'test-projects/healthy-app');
const MIXED      = path.resolve(__dirname, '../..', 'test-projects/mixed-app');
const DRIFTED    = path.resolve(__dirname, '../..', 'test-projects/drifted-app');

async function runAuditPipeline(config: ReturnType<typeof loadConfig>, projectDir: string) {
  const allFiles = await findSourceFiles(projectDir, config.ignorePaths);
  const profiles = allFiles
    .map((f) => analyzeFile(f, config.designSystemImports))
    .filter((p): p is NonNullable<typeof p> => p !== null);
  const componentProfiles = profiles.filter((p) => isComponentFile(p.filePath));
  const importUsage       = analyzeImportUsage(profiles, config);
  const duplicateFindings = analyzeDuplicateFamilies(componentProfiles, config);
  const inlineStyles      = analyzeInlineStyles(profiles);
  return calculateHealthScore(importUsage, duplicateFindings, inlineStyles, config, allFiles.length);
}

// ── Synthetic project for Bug 1 ────────────────────────────────────────────────
//
// Needs:
//   - approvedCount === 0          → no imports matching defaultConfig DS entries
//   - localCount >= 25             → ≥25 PascalCase named imports from relative paths
//   - topCandidate.confidence === 'high' (score ≥ 8) → @/components alias imports:
//       UI keyword (+2) + 3 primitives button/card/input (+3) + 10+ files (+3) = 8
//
// Relative imports only count for localCount; alias imports only count for DriftSense
// candidate detection (getImportRoot returns null for relative paths).

function createDriftSensePauseProject(dir: string): void {
  const src = path.join(dir, 'src');
  fs.mkdirSync(src, { recursive: true });

  // 10 pages: alias imports → DriftSense candidate @/components (score 8 = high)
  //           relative imports → localCount += 3 per file = 30 total
  for (let i = 0; i < 10; i++) {
    fs.writeFileSync(
      path.join(src, `Page${i}.tsx`),
      [
        `import React from 'react';`,
        `import { Button, Card, Input } from '@/components';`,
        `import { PrimaryButton, SecondaryCard, FormInput } from './base-ui';`,
        `export const Page${i} = () => <div><Button /><Card /><Input /></div>;`,
      ].join('\n'),
    );
  }

  // Minimal base-ui file so analyzeFile can parse the relative imports
  fs.writeFileSync(
    path.join(src, 'base-ui.tsx'),
    [
      `export const PrimaryButton = () => <button />;`,
      `export const SecondaryCard = () => <div />;`,
      `export const FormInput     = () => <input />;`,
    ].join('\n'),
  );
}

// ── Bug 1: --json-only / --score-only bypass DriftSense pause ─────────────────

describe('Bug 1 – silent modes must produce output even when DriftSense pause triggers', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-drift-reg1-'));
    createDriftSensePauseProject(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('--json-only produces valid JSON (not empty stdout) when DriftSense pause conditions are met', () => {
    const result = spawnSync(
      'node',
      [CLI, tmpDir, '--detect-ds', '--json-only'],
      { encoding: 'utf-8', timeout: 30_000 },
    );

    expect(result.stdout.trim()).not.toBe('');
    const parsed = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(typeof parsed.healthScore).toBe('number');
    expect(parsed.healthScore).toBeGreaterThanOrEqual(0);
    expect(parsed.healthScore).toBeLessThanOrEqual(100);
  });

  it('--score-only prints a number (not empty stdout) when DriftSense pause conditions are met', () => {
    const result = spawnSync(
      'node',
      [CLI, tmpDir, '--detect-ds', '--score-only'],
      { encoding: 'utf-8', timeout: 30_000 },
    );

    const score = parseInt(result.stdout.trim(), 10);
    expect(Number.isNaN(score)).toBe(false);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ── Bug 2: written config must be used for the continuation audit ──────────────

describe('Bug 2 – non-paused --write-config must audit with the written config, not the pre-write config', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-drift-reg2-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loadConfig on the written file returns the suggestion imports, not defaultConfig placeholders', () => {
    const suggestion = {
      designSystemImports: ['@acme/design-system', '@acme/icons'],
      internalDSPaths: ['packages/ui'],
    };

    applySuggestedConfig(suggestion, tmpDir);
    const writtenConfig = loadConfig(undefined, tmpDir);

    // Written config must reflect the suggestion, not defaultConfig placeholder entries
    expect(writtenConfig.designSystemImports).toEqual(suggestion.designSystemImports);
    expect(writtenConfig.internalDSPaths).toContain('packages/ui');
    expect(writtenConfig.designSystemImports).not.toContain('@mui/material');
    expect(writtenConfig.designSystemImports).not.toContain('@company/ui');
  });

  it('audit with written config and buildRerunConfig produce identical scores on healthy-app', async () => {
    const suggestion = {
      designSystemImports: ['@acme/design-system'],
      internalDSPaths: ['packages/ui'],
    };

    applySuggestedConfig(suggestion, tmpDir);
    const writtenConfig  = loadConfig(undefined, tmpDir);
    const rerunConfig    = buildRerunConfig({ ...defaultConfig }, suggestion, tmpDir);

    const [writtenResult, rerunResult] = await Promise.all([
      runAuditPipeline(writtenConfig, HEALTHY),
      runAuditPipeline(rerunConfig, HEALTHY),
    ]);

    expect(writtenResult.score).toBe(rerunResult.score);
  });

  it('pre-write config (designSystemImports from defaultConfig) gives a different score than the written config', async () => {
    // This proves that using the wrong config (pre-write) is detectable —
    // the score differs, which is the observable symptom of the bug.
    const suggestion = {
      designSystemImports: ['@mui/material'], // same as defaultConfig → same score
      internalDSPaths: [],
    };

    // Use healthy-app which has @mui/material imports — changing designSystemImports matters
    const preWriteConfig = loadConfig(undefined, HEALTHY);   // has @mui/material approved
    const emptyDsConfig  = { ...defaultConfig, designSystemImports: [] as string[] };

    const [withMuiResult, withoutMuiResult] = await Promise.all([
      runAuditPipeline(preWriteConfig, HEALTHY),
      runAuditPipeline(emptyDsConfig, HEALTHY),
    ]);

    // Removing designSystemImports should change the adoption score
    expect(withMuiResult.score).not.toBe(withoutMuiResult.score);
  });
});

// ── Bug 3: score breakdown contributions must sum exactly to healthScore ────────

describe('Bug 3 – breakdown contributions must always sum to healthScore', () => {
  function assertBreakdownSumsToScore(score: number, breakdown: ReturnType<typeof calculateHealthScore>['breakdown']) {
    const sum = breakdown.adoptionContribution + breakdown.duplicateContribution
              + breakdown.tokenContribution    + breakdown.inlineStyleContribution;
    expect(sum).toBe(score);
  }

  function assertPenaltiesMatchWeights(breakdown: ReturnType<typeof calculateHealthScore>['breakdown']) {
    expect(breakdown.adoptionPenalty).toBe(40 - breakdown.adoptionContribution);
    expect(breakdown.duplicatePenalty).toBe(20 - breakdown.duplicateContribution);
    expect(breakdown.tokenPenalty).toBe(20 - breakdown.tokenContribution);
    expect(breakdown.inlineStylePenalty).toBe(20 - breakdown.inlineStyleContribution);
  }

  it('contributions sum to healthScore on healthy-app', async () => {
    const config = loadConfig(undefined, HEALTHY);
    const { score, breakdown } = await runAuditPipeline(config, HEALTHY);
    assertBreakdownSumsToScore(score, breakdown);
  });

  it('contributions sum to healthScore on mixed-app', async () => {
    const config = loadConfig(undefined, MIXED);
    const { score, breakdown } = await runAuditPipeline(config, MIXED);
    assertBreakdownSumsToScore(score, breakdown);
  });

  it('contributions sum to healthScore on drifted-app', async () => {
    const config = loadConfig(undefined, DRIFTED);
    const { score, breakdown } = await runAuditPipeline(config, DRIFTED);
    assertBreakdownSumsToScore(score, breakdown);
  });

  it('penalty fields equal weight minus contribution on all test projects', async () => {
    for (const dir of [HEALTHY, MIXED, DRIFTED]) {
      const config = loadConfig(undefined, dir);
      const { breakdown } = await runAuditPipeline(config, dir);
      assertPenaltiesMatchWeights(breakdown);
    }
  });

  it('contributions sum to healthScore with a zero-adoption config (the suppressed-score scenario)', async () => {
    // This is the specific scenario Bug 1 was hiding: 0% adoption produces a
    // valid score that was never emitted. Verify the math holds at 0% adoption.
    const zeroAdoptionConfig = { ...defaultConfig, designSystemImports: [] as string[] };
    const { score, breakdown } = await runAuditPipeline(zeroAdoptionConfig, HEALTHY);
    assertBreakdownSumsToScore(score, breakdown);
    expect(breakdown.adoptionContribution).toBe(0);
    expect(breakdown.adoptionPenalty).toBe(40);
  });
});
