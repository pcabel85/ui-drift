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
import { AuditResult } from './types';

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
  .parse(process.argv);

const opts = program.opts();
const args = program.args;
const targetDir = path.resolve(args[0] || '.');

async function run() {
  if (!fs.existsSync(targetDir)) {
    console.error(chalk.red(`Error: Directory not found: ${targetDir}`));
    process.exit(1);
  }

  if (!opts.jsonOnly && !opts.scoreOnly) console.log(chalk.gray('\n  Loading config...'));

  const config = loadConfig(opts.config, targetDir);

  if (!opts.jsonOnly && !opts.scoreOnly) console.log(chalk.gray('  Scanning files...'));

  const allFiles = await findSourceFiles(targetDir, config.ignorePaths);
  const componentFiles = allFiles.filter(isComponentFile);

  if (!opts.jsonOnly && !opts.scoreOnly) {
    console.log(chalk.gray(`  Found ${allFiles.length} source files, ${componentFiles.length} component files`));
    console.log(chalk.gray('  Analyzing AST...\n'));
  }

  const profiles = allFiles
    .map((f) => analyzeFile(f, config.designSystemImports))
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const componentProfiles = profiles.filter((p) => isComponentFile(p.filePath));

  const importUsage    = analyzeImportUsage(profiles, config);
  const duplicateFindings = analyzeDuplicateFamilies(componentProfiles, config);
  const inlineStyles   = analyzeInlineStyles(profiles);
  const wrappers       = analyzeWrappers(componentProfiles, config);

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

  if (opts.scoreOnly) {
    console.log(healthScore);
    process.exit(healthScore >= 70 ? 0 : 1);
  }

  if (opts.jsonOnly) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printTerminalReport(result, importUsage, inlineStyles, wrappers, targetDir);

  if (opts.json !== undefined) {
    const jsonPath = typeof opts.json === 'string' ? opts.json : path.join(targetDir, 'ui-drift-report.json');
    writeJsonReport(result, jsonPath);
    console.log(chalk.green(`  ✓ JSON report saved to ${path.relative(process.cwd(), jsonPath)}`));
  }

  if (opts.html !== undefined) {
    const htmlPath = typeof opts.html === 'string' ? opts.html : path.join(targetDir, 'ui-drift-report.html');
    writeHtmlReport(result, htmlPath, targetDir);
    console.log(chalk.green(`  ✓ HTML report saved to ${path.relative(process.cwd(), htmlPath)}`));
  }

  console.log('');
}

run().catch((err) => {
  console.error(chalk.red('\n  Fatal error:'), err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
