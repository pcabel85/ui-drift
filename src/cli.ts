#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';

import { loadConfig } from './config/loadConfig';
import { findSourceFiles } from './scanner/findSourceFiles';
import { analyzeFile } from './scanner/analyzeFile';
import { isComponentFile } from './utils/isComponentFile';
import { analyzeImportUsage } from './analyzers/importUsageAnalyzer';
import { analyzeDuplicateFamilies } from './analyzers/duplicateFamilyAnalyzer';
import { analyzeInlineStyles } from './analyzers/inlineStyleAnalyzer';
import { analyzeWrappers } from './analyzers/wrapperAnalyzer';
import { calculateHealthScore, buildSummary } from './scoring/calculateHealthScore';
import { generateRecommendations } from './scoring/recommendations';
import { printTerminalReport } from './reporters/printTerminalReport';
import { writeJsonReport, writeHtmlReport } from './reporters/writeJsonReport';
import { AuditResult, DSAuditConfig } from './types';

import { detectDesignSystemCandidates } from './autodetect/detectDesignSystemCandidates';
import { generateSuggestedConfig } from './autodetect/generateSuggestedConfig';
import {
  printDsSuggestions,
  printDriftSensePauseBlock,
  printDriftSenseMediumWarning,
  printIgnoreDriftSenseWarning,
  printDetectionHint,
} from './autodetect/printDsSuggestions';
import { applySuggestedConfig } from './autodetect/applySuggestedConfig';

const program = new Command();

program
  .name('ui-drift')
  .description('Design system health auditor for React/TypeScript codebases')
  .version('0.2.0')
  .argument('[dir]', 'Path to the React project to audit', '.')
  .option('-c, --config <path>', 'Path to ui-drift.config.json')
  .option('--json [output]', 'Export JSON report (optionally specify output path)')
  .option('--html [output]', 'Export HTML report (optionally specify output path)')
  .option('--json-only', 'Print raw JSON to stdout (no terminal report)')
  .option('--score-only', 'Print only the health score number (useful for CI)')
  .option('--detect-ds', 'Force DriftSense design system discovery even if normal trigger conditions are not met')
  .option('--no-ds-detect', 'Disable DriftSense discovery entirely')
  .option('--write-config', 'Write the DriftSense suggestion to ui-drift.config.json in the target directory')
  .option('--rerun-with-suggestion', 'Rerun the audit using the DriftSense suggestion (in-memory, no file write)')
  .option('--print-suggested-config', 'Print the DriftSense suggested config and exit')
  .option('--ignore-driftsense', 'Continue the audit even when DriftSense detects high-confidence DS paths (score may be inaccurate)')
  .parse(process.argv);

const opts = program.opts();
const args = program.args;
const targetDir = path.resolve(args[0] || '.');

// Commander converts --no-ds-detect to opts.dsDetect = false
const autoDetectEnabled: boolean = opts.dsDetect !== false;
const forceDetect: boolean = !!opts.detectDs;

// ── Core audit executor ────────────────────────────────────────────────────────

async function executeAudit(
  config: DSAuditConfig,
  allFiles: string[],
  silent: boolean = false
): Promise<{
  result: AuditResult;
  importUsage: ReturnType<typeof analyzeImportUsage>;
  inlineStyles: ReturnType<typeof analyzeInlineStyles>;
  wrappers: ReturnType<typeof analyzeWrappers>;
}> {
  const componentFiles = allFiles.filter(isComponentFile);

  if (!silent) {
    console.log(chalk.gray(`  Found ${allFiles.length} source files, ${componentFiles.length} component files`));
    console.log(chalk.gray('  Analyzing AST...\n'));
  }

  const profiles = allFiles
    .map((f) => analyzeFile(f, config.designSystemImports))
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const componentProfiles = profiles.filter((p) => isComponentFile(p.filePath));

  const importUsage       = analyzeImportUsage(profiles, config);
  const duplicateFindings = analyzeDuplicateFamilies(componentProfiles, config);
  const inlineStyles      = analyzeInlineStyles(profiles);
  const wrappers          = analyzeWrappers(componentProfiles, config);

  const { score: healthScore, breakdown: scoreBreakdown } =
    calculateHealthScore(importUsage, duplicateFindings, inlineStyles, config, allFiles.length);

  const summary = buildSummary(importUsage, duplicateFindings, inlineStyles, healthScore, allFiles.length);

  const recommendations = generateRecommendations(
    importUsage, duplicateFindings, inlineStyles, wrappers, healthScore
  );

  const result: AuditResult = {
    healthScore,
    scoreBreakdown,
    summary,
    scannedFiles: allFiles.length,
    approvedImportCounts: importUsage.approvedImportCounts,
    localUiImportCounts:  importUsage.localUiImportCounts,
    duplicateFindings,
    inlineStyleCount:      inlineStyles.totalInlineStyles,
    sxOverrideCount:       inlineStyles.totalSxOverrides,
    hardcodedColorCount:   inlineStyles.totalHardcodedColors,
    hardcodedSpacingCount: inlineStyles.totalHardcodedSpacing,
    recommendations,
  };

  return { result, importUsage, inlineStyles, wrappers };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function run() {
  if (!fs.existsSync(targetDir)) {
    console.error(chalk.red(`Error: Directory not found: ${targetDir}`));
    process.exit(1);
  }

  const silent = !!(opts.jsonOnly || opts.scoreOnly);

  if (!silent) console.log(chalk.gray('\n  Loading config...'));

  const config = loadConfig(opts.config, targetDir);

  if (!silent) console.log(chalk.gray('  Scanning files...'));

  const allFiles = await findSourceFiles(targetDir, config.ignorePaths);

  // ── Initial scan: import counts only (cheap — needed for DriftSense trigger) ─

  if (!silent) {
    console.log(chalk.gray(`  Found ${allFiles.length} source files`));
    console.log(chalk.gray('  Scanning imports...\n'));
  }

  const profiles = allFiles
    .map((f) => analyzeFile(f, config.designSystemImports))
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const quickImportUsage = analyzeImportUsage(profiles, config);
  const approvedCount    = Object.values(quickImportUsage.approvedImportCounts).reduce((s, n) => s + n, 0);
  const localCount       = Object.values(quickImportUsage.localUiImportCounts).reduce((s, n) => s + n, 0);

  // ── DriftSense ───────────────────────────────────────────────────────────────

  if (autoDetectEnabled) {
    const detection = detectDesignSystemCandidates(
      profiles,
      targetDir,
      approvedCount,
      localCount,
      allFiles.length,
      forceDetect
    );

    if (detection.triggerMet && detection.candidates.length > 0) {
      const suggested    = generateSuggestedConfig(detection.candidates);
      const topCandidate = detection.candidates[0];

      // Pause condition: high-confidence discovery with no approved imports
      const shouldPause =
        !opts.ignoreDriftsense &&
        !opts.rerunWithSuggestion &&
        approvedCount === 0 &&
        localCount >= 25 &&
        topCandidate?.confidence === 'high';

      // ── --print-suggested-config: print and exit regardless of mode ────────
      if (opts.printSuggestedConfig) {
        printDriftSensePauseBlock(detection, suggested);
        return;
      }

      // ── --rerun-with-suggestion: bypass pause, apply suggestion, full audit ─
      if (opts.rerunWithSuggestion && suggested) {
        if (!silent) {
          printDriftSensePauseBlock(detection, suggested);
          console.log(chalk.bold('  Rerunning audit with DriftSense suggestion...\n'));
        }

        let rerunConfig: DSAuditConfig;
        if (opts.writeConfig) {
          // Write first, then reload from disk so the in-memory run matches the file exactly
          const applyResult = applySuggestedConfig(suggested, targetDir);
          if (!silent) {
            const label = applyResult.hadExistingConfig ? 'Config merged into' : 'Config written to';
            console.log(chalk.green(`  ✓ ${label} ${path.relative(process.cwd(), applyResult.configPath)}`));
            for (const line of applyResult.diffLines) console.log(chalk.gray(`    ${line}`));
            console.log('');
          }
          rerunConfig = loadConfig(opts.config, targetDir);
        } else {
          // In-memory only: mirror applySuggestedConfig behaviour — union the existing
          // config file's entries (if any) with the suggestion so the score matches
          // what --write-config would produce.  Avoid spreading the full loaded config
          // here because it may include defaultConfig placeholder entries that are not
          // present in the actual file.
          const existingConfigPath = path.join(targetDir, 'ui-drift.config.json');
          let existingFileImports: string[] = [];
          let existingFilePaths: string[] = [];
          if (fs.existsSync(existingConfigPath)) {
            try {
              const raw = JSON.parse(fs.readFileSync(existingConfigPath, 'utf-8'));
              existingFileImports = (raw.designSystemImports as string[] | undefined) ?? [];
              existingFilePaths   = (raw.internalDSPaths   as string[] | undefined) ?? [];
            } catch { /* leave empty on parse error */ }
          }
          const unionStrings = (a: string[], b: string[]) => {
            const result = [...a];
            for (const v of b) if (!result.includes(v)) result.push(v);
            return result;
          };
          rerunConfig = {
            ...config,
            designSystemImports: unionStrings(existingFileImports, suggested.designSystemImports),
            internalDSPaths:     unionStrings(existingFilePaths,   suggested.internalDSPaths),
          };
        }

        const rerun = await executeAudit(rerunConfig, allFiles, silent);
        rerun.result.dsDetectionMode = 'driftsense';

        if (opts.scoreOnly) {
          console.log(rerun.result.healthScore);
          process.exit(rerun.result.healthScore >= 70 ? 0 : 1);
        }
        if (opts.jsonOnly) {
          console.log(JSON.stringify(rerun.result, null, 2));
          return;
        }

        printTerminalReport(rerun.result, rerun.importUsage, rerun.inlineStyles, rerun.wrappers, targetDir);
        await writeReports(rerun.result, targetDir);
        console.log('');
        return;
      }

      // ── Pause: high confidence, no override ───────────────────────────────
      if (shouldPause) {
        if (!silent) printDriftSensePauseBlock(detection, suggested);

        // --write-config in pause mode: write config, reload from disk, run audit
        if (opts.writeConfig && suggested) {
          const applyResult = applySuggestedConfig(suggested, targetDir);
          if (!silent) {
            const label = applyResult.hadExistingConfig ? 'Config merged into' : 'Config written to';
            console.log(chalk.green(`  ✓ ${label} ${path.relative(process.cwd(), applyResult.configPath)}`));
            console.log('');
            console.log(chalk.bold('  Running audit with saved config...\n'));
          }

          // Reload from the written file so the score matches subsequent standard runs
          const rerunConfig = loadConfig(opts.config, targetDir);
          const rerun = await executeAudit(rerunConfig, allFiles, silent);
          rerun.result.dsDetectionMode = 'driftsense';

          if (opts.scoreOnly) {
            console.log(rerun.result.healthScore);
            process.exit(rerun.result.healthScore >= 70 ? 0 : 1);
          }
          if (opts.jsonOnly) {
            console.log(JSON.stringify(rerun.result, null, 2));
            return;
          }

          printTerminalReport(rerun.result, rerun.importUsage, rerun.inlineStyles, rerun.wrappers, targetDir);
          await writeReports(rerun.result, targetDir);
          console.log('');
          return;
        }

        process.exit(0);
      }

      // ── Non-paused: show full DriftSense block then continue ──────────────
      if (!silent) {
        printDsSuggestions(detection, suggested);

        if (topCandidate?.confidence === 'medium') {
          printDriftSenseMediumWarning();
        }

        if (opts.ignoreDriftsense && topCandidate?.confidence === 'high') {
          printIgnoreDriftSenseWarning();
        }
      }

      if (opts.writeConfig && suggested) {
        const applyResult = applySuggestedConfig(suggested, targetDir);
        if (!silent) {
          const label = applyResult.hadExistingConfig ? 'Config merged into' : 'Config written to';
          console.log(chalk.green(`  ✓ ${label} ${path.relative(process.cwd(), applyResult.configPath)}`));
          for (const line of applyResult.diffLines) console.log(chalk.gray(`    ${line}`));
          console.log('');
        }
      }

      if (!silent && !opts.writeConfig) {
        printDetectionHint();
      }
    }
  }

  // ── Full audit ───────────────────────────────────────────────────────────────

  if (!silent) console.log(chalk.gray('  Analyzing AST...\n'));

  const { result, importUsage, inlineStyles, wrappers } =
    await executeAudit(config, allFiles, true /* suppress file count line — already printed */);

  if (autoDetectEnabled && approvedCount === 0 && localCount >= 25) {
    result.dsDetectionMode = 'driftsense';
  }

  if (opts.scoreOnly) {
    console.log(result.healthScore);
    process.exit(result.healthScore >= 70 ? 0 : 1);
  }

  if (opts.jsonOnly) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printTerminalReport(result, importUsage, inlineStyles, wrappers, targetDir);
  await writeReports(result, targetDir);
  console.log('');
}

async function writeReports(result: AuditResult, dir: string) {
  if (opts.json !== undefined) {
    const jsonPath = typeof opts.json === 'string' ? opts.json : path.join(dir, 'ui-drift-report.json');
    writeJsonReport(result, jsonPath);
    console.log(chalk.green(`  ✓ JSON report saved to ${path.relative(process.cwd(), jsonPath)}`));
  }

  if (opts.html !== undefined) {
    const htmlPath = typeof opts.html === 'string' ? opts.html : path.join(dir, 'ui-drift-report.html');
    writeHtmlReport(result, htmlPath, dir);
    console.log(chalk.green(`  ✓ HTML report saved to ${path.relative(process.cwd(), htmlPath)}`));
  }
}

run().catch((err) => {
  console.error(chalk.red('\n  Fatal error:'), err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
