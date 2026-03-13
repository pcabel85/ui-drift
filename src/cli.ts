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
import { printDsSuggestions, printDetectionHint } from './autodetect/printDsSuggestions';
import { applySuggestedConfig, mergeConfigInMemory } from './autodetect/applySuggestedConfig';

const program = new Command();

program
  .name('ui-drift')
  .description('Design system health auditor for React/TypeScript codebases')
  .version('0.1.0')
  .argument('[dir]', 'Path to the React project to audit', '.')
  .option('-c, --config <path>', 'Path to ui-drift.config.json')
  .option('--json [output]', 'Export JSON report (optionally specify output path)')
  .option('--html [output]', 'Export HTML report (optionally specify output path)')
  .option('--json-only', 'Print raw JSON to stdout (no terminal report)')
  .option('--score-only', 'Print only the health score number (useful for CI)')
  .option('--detect-ds', 'Force guided DS auto-detection even if trigger conditions are not met')
  .option('--no-ds-detect', 'Disable guided DS auto-detection entirely')
  .option('--write-config', 'Write suggested config to ui-drift.config.json in the target directory')
  .option('--rerun-with-suggestion', 'Rerun the audit using the suggested config (in-memory, no file write)')
  .option('--print-suggested-config', 'Print the suggested config block and exit')
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

  let config = loadConfig(opts.config, targetDir);

  if (!silent) console.log(chalk.gray('  Scanning files...'));

  const allFiles = await findSourceFiles(targetDir, config.ignorePaths);

  // ── First audit pass ─────────────────────────────────────────────────────────

  const { result, importUsage, inlineStyles, wrappers } =
    await executeAudit(config, allFiles, silent);

  // ── Guided DS auto-detection ─────────────────────────────────────────────────

  const approvedCount = Object.values(importUsage.approvedImportCounts).reduce((s, n) => s + n, 0);
  const localCount    = Object.values(importUsage.localUiImportCounts).reduce((s, n) => s + n, 0);

  // Build profiles once more for detection (already computed above; reuse via re-analysis)
  // We need the raw profiles for candidate detection
  const profiles = allFiles
    .map((f) => analyzeFile(f, config.designSystemImports))
    .filter((p): p is NonNullable<typeof p> => p !== null);

  let ranDetection = false;
  let suggested = null as ReturnType<typeof generateSuggestedConfig>;

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
      ranDetection = true;
      suggested = generateSuggestedConfig(detection.candidates);

      // --print-suggested-config: print config block and exit
      if (opts.printSuggestedConfig) {
        printDsSuggestions(detection, suggested);
        return;
      }

      if (!silent) {
        printDsSuggestions(detection, suggested);
      }

      // --write-config: persist to disk
      if (opts.writeConfig && suggested) {
        const applyResult = applySuggestedConfig(suggested, targetDir);
        if (!silent) {
          if (applyResult.hadExistingConfig) {
            console.log(chalk.green(`  ✓ Config merged into ${path.relative(process.cwd(), applyResult.configPath)}`));
            for (const line of applyResult.diffLines) {
              console.log(chalk.gray(`    ${line}`));
            }
          } else {
            console.log(chalk.green(`  ✓ Config written to ${path.relative(process.cwd(), applyResult.configPath)}`));
          }
          console.log('');
        }
      }

      // --rerun-with-suggestion: re-audit with the suggested config applied in memory
      if (opts.rerunWithSuggestion && suggested) {
        if (!silent) {
          console.log(chalk.bold('  Rerunning audit with suggested config...\n'));
        }
        const mergedConfig = mergeConfigInMemory(config, suggested);
        const rerun = await executeAudit(mergedConfig, allFiles, silent);

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

      if (!silent && !opts.writeConfig) {
        printDetectionHint();
      }
    }
  }

  // ── Normal output path ───────────────────────────────────────────────────────

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
