import chalk from 'chalk';
import * as path from 'path';
import { AuditResult } from '../types';
import { ImportUsageResult } from '../analyzers/importUsageAnalyzer';
import { InlineStyleResult } from '../analyzers/inlineStyleAnalyzer';
import { WrapperAnalysisResult } from '../analyzers/wrapperAnalyzer';
import { scoreLabel, scoreColor } from '../scoring/calculateHealthScore';
import { PipelineState, printAnalysisPipeline } from './printAnalysisPipeline';

const DIVIDER = chalk.gray('─'.repeat(60));

// ── Shared header ─────────────────────────────────────────────────────────────

/**
 * Prints the ui-drift identity box and per-run metadata (target, files, mode).
 * Called by printTerminalReport for completed runs, and directly by the CLI
 * for runs that pause before the full report (e.g. DriftSense pause).
 */
export function printAuditHeader(
  targetDir: string,
  fileCount: number,
  isDriftSense: boolean
): void {
  console.log('');
  console.log(chalk.bold.blue('  ╔══════════════════════════════════════════╗'));
  console.log(chalk.bold.blue('  ║                 ui-drift                 ║'));
  console.log(chalk.bold.blue('  ║    Design System Architecture Audit      ║'));
  console.log(chalk.bold.blue('  ╚══════════════════════════════════════════╝'));
  console.log('');
  console.log(chalk.gray(`  Target:        ${chalk.white(path.resolve(targetDir))}`));
  console.log(chalk.gray(`  Files scanned: ${chalk.white(fileCount)}`));
  console.log(chalk.gray(`  Mode:          ${isDriftSense ? chalk.yellow('DriftSense Discovery') : chalk.white('Standard Audit')}`));
  console.log('');
}

function scoreBar(score: number): string {
  const filled = Math.round(score / 5);
  const empty = 20 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const c = scoreColor(score);
  return c === 'green' ? chalk.green(bar) : c === 'yellow' ? chalk.yellow(bar) : chalk.red(bar);
}

function severityBadge(severity: 'high' | 'medium' | 'low'): string {
  if (severity === 'high')   return chalk.bgRed.white(' HIGH ');
  if (severity === 'medium') return chalk.bgYellow.black(' MED  ');
  return chalk.bgGray.white(' LOW  ');
}

function confidenceBadge(confidence: 'high' | 'medium' | 'low'): string {
  if (confidence === 'high')   return chalk.green('Confidence: High ●●●');
  if (confidence === 'medium') return chalk.yellow('Confidence: Medium ●●○');
  return chalk.gray('Confidence: Low ●○○');
}

function kindLabel(kind: 'wrapper' | 'standalone' | 'feature-composed', wraps?: string): string {
  if (kind === 'wrapper' && wraps) return chalk.cyan(`  [wrapper → ${wraps}]`);
  if (kind === 'feature-composed') return chalk.blue('  [feature-composed — uses DS primitives]');
  return chalk.red('  [standalone — no approved DS import]');
}

function levelColor(level: string): string {
  if (level === 'None' || level === 'Low') return chalk.green(level);
  if (level === 'Moderate') return chalk.yellow(level);
  return chalk.red(level);
}

export function printTerminalReport(
  result: AuditResult,
  importUsage: ImportUsageResult,
  inlineStyles: InlineStyleResult,
  wrappers: WrapperAnalysisResult,
  targetDir: string,
  pipeline?: PipelineState
): void {
  const { healthScore: score, scoreBreakdown: bd, summary } = result;
  const label = scoreLabel(score);
  const colorFn = scoreColor(score) === 'green' ? chalk.green : scoreColor(score) === 'yellow' ? chalk.yellow : chalk.red;

  const isDriftSense = result.dsDetectionMode === 'driftsense';

  printAuditHeader(targetDir, result.scannedFiles, isDriftSense);

  if (pipeline) {
    printAnalysisPipeline(pipeline);
  } else {
    console.log(DIVIDER);
    console.log('');
  }

  // ── Quick Summary ─────────────────────────────────────────────────────────────
  console.log('');
  console.log(chalk.bold('  📋 Audit Summary'));
  console.log('');
  const adoptionStr = `${summary.adoptionPercent}%`;
  const adoptionStyled = summary.adoptionPercent >= 70 ? chalk.green(adoptionStr) : summary.adoptionPercent >= 40 ? chalk.yellow(adoptionStr) : chalk.red(adoptionStr);
  const dupCount = String(summary.duplicateFamilyCount);
  const dupStyled = summary.duplicateFamilyCount === 0 ? chalk.green(dupCount) : summary.duplicateFamilyCount <= 2 ? chalk.yellow(dupCount) : chalk.red(dupCount);

  console.log(`  DS Adoption          ${adoptionStyled}`);
  console.log(`  Duplicate Families   ${dupStyled}`);
  console.log(`  Inline Style Usage   ${levelColor(summary.inlineStyleLevel)}`);
  console.log(`  Token Violations     ${levelColor(summary.tokenViolationLevel)}`);
  console.log(`  Discovery Mode       ${isDriftSense ? chalk.yellow('DriftSense') : chalk.gray('Standard')}`);
  console.log('');
  if (summary.topIssue !== 'No critical issues detected') {
    console.log(`  ${chalk.yellow('⚑')} Top issue: ${chalk.white(summary.topIssue)}`);
  } else {
    console.log(`  ${chalk.green('✓')} ${chalk.white(summary.topIssue)}`);
  }
  console.log('');
  console.log(DIVIDER);

  // ── Health Score ──────────────────────────────────────────────────────────────
  console.log('');
  console.log(`  ${chalk.bold('Design System Health Score')}   ${colorFn.bold(`${score}/100`)}  ${colorFn(label)}`);
  console.log(`  ${scoreBar(score)}`);
  console.log('');

  // Score breakdown
  console.log(chalk.bold('  Score Breakdown'));
  console.log('');

  const rows: Array<{ label: string; contribution: number; penalty: number; weight: number }> = [
    { label: 'DS adoption',        contribution: bd.adoptionContribution,      penalty: bd.adoptionPenalty,      weight: 40 },
    { label: 'Duplicate penalty',  contribution: bd.duplicateContribution,     penalty: bd.duplicatePenalty,     weight: 20 },
    { label: 'Token compliance',   contribution: bd.tokenContribution,         penalty: bd.tokenPenalty,         weight: 20 },
    { label: 'Inline style usage', contribution: bd.inlineStyleContribution,   penalty: bd.inlineStylePenalty,   weight: 20 },
  ];

  for (const row of rows) {
    const penaltyStr = row.penalty > 0 ? chalk.red(` -${row.penalty}`) : chalk.green(' +0');
    const contribStr = chalk.bold(`${row.contribution}/${row.weight}`);
    console.log(`  ${row.label.padEnd(24)} ${contribStr.padStart(8)}  ${penaltyStr}`);
  }

  console.log('');
  console.log(DIVIDER);

  // ── DS Adoption ───────────────────────────────────────────────────────────────
  console.log('');
  console.log(chalk.bold('  📦 Design System Adoption'));
  console.log('');

  const adoptionPct = summary.adoptionPercent;
  const adoptionColor = adoptionPct >= 70 ? chalk.green : adoptionPct >= 40 ? chalk.yellow : chalk.red;
  console.log(`  Adoption ratio: ${adoptionColor.bold(`${adoptionPct}%`)} (${importUsage.totalApproved} approved / ${importUsage.totalLocal} local UI)`);
  console.log('');

  const topApproved = Object.entries(result.approvedImportCounts).sort(([, a], [, b]) => b - a).slice(0, 8);
  if (topApproved.length > 0) {
    console.log(`  ${chalk.green('✓')} Approved imports:`);
    for (const [key, count] of topApproved) {
      console.log(`    ${chalk.green(count.toString().padStart(4))}  ${chalk.gray(key)}`);
    }
  } else {
    console.log(`  ${chalk.red('✗')} No approved design system imports found`);
  }

  const topLocal = Object.entries(result.localUiImportCounts).sort(([, a], [, b]) => b - a).slice(0, 8);
  if (topLocal.length > 0) {
    console.log('');
    console.log(`  ${chalk.yellow('⚠')} Local UI component imports:`);
    for (const [key, count] of topLocal) {
      console.log(`    ${chalk.yellow(count.toString().padStart(4))}  ${chalk.gray(key)}`);
    }
  }

  console.log('');
  console.log(DIVIDER);

  // ── Duplicates ────────────────────────────────────────────────────────────────
  console.log('');
  console.log(chalk.bold('  🔁 Potential Duplicate Components'));
  console.log('');

  if (result.duplicateFindings.length === 0) {
    console.log(`  ${chalk.green('✓')} No significant duplicate component families detected`);
  } else {
    console.log(chalk.gray(`  Components are classified as: ${chalk.red('standalone')} · ${chalk.cyan('wrapper')} · ${chalk.blue('feature-composed')}`));
    console.log('');
    console.log(chalk.gray('  Component classification'));
    console.log('');
    console.log(`    ${chalk.red('standalone')}         A component that implements UI behavior independently, with no approved DS primitive underneath it.`);
    console.log(`    ${chalk.cyan('wrapper')}            A thin component that wraps an approved DS primitive and mainly adds styling or minor behavior.`);
    console.log(`    ${chalk.blue('feature-composed')}   A product-specific component built on DS primitives. Represents a real interaction, not a reusable UI element.`);
    console.log('');

    for (const finding of result.duplicateFindings) {
      console.log(`  ${severityBadge(finding.severity)}  ${chalk.bold(finding.family + ' family')}   ${confidenceBadge(finding.confidence)}`);
      console.log('');

      for (const comp of finding.components) {
        const rel = path.relative(targetDir, comp.filePath);
        console.log(`    ${chalk.gray('└─')} ${rel}${kindLabel(comp.kind, comp.wraps)}`);
      }
      if (finding.featureComponentsExcluded > 0) {
        const exampleMatch = finding.reason.match(/e\.g\. ([A-Z][A-Za-z]+)/);
        const exampleStr = exampleMatch ? ` (e.g. ${exampleMatch[1]})` : '';
        console.log(`    ${chalk.gray(`ℹ ${finding.featureComponentsExcluded} feature-specific component${finding.featureComponentsExcluded > 1 ? 's' : ''}${exampleStr} excluded — not counted as primitives`)}`);
      }
      console.log('');
      console.log(`    ${chalk.gray('Reason:')} ${finding.reason}`);
      console.log('');
      // Why it matters
      const lines = finding.whyItMatters.match(/.{1,72}(\s|$)/g) || [finding.whyItMatters];
      console.log(`    ${chalk.italic.gray('Why it matters:')}`);
      for (const line of lines) {
        console.log(`    ${chalk.gray(line.trim())}`);
      }
      console.log('');
    }
  }

  // Wrapper sprawl
  const sprawlKeys = Object.keys(wrappers.sprawlGroups);
  if (sprawlKeys.length > 0) {
    console.log(`  ${chalk.yellow('⚠')} Wrapper sprawl:`);
    for (const key of sprawlKeys) {
      const group = wrappers.sprawlGroups[key];
      console.log(`    ${chalk.yellow(group.length + ' wrappers')} around ${chalk.bold(key)}`);
      for (const w of group) {
        const rel = path.relative(targetDir, w.filePath);
        console.log(`    ${chalk.gray('└─')} ${w.componentName} ${chalk.gray(`(${rel})`)}`);
      }
    }
    console.log('');
  }

  console.log(DIVIDER);

  // ── Style Overrides ───────────────────────────────────────────────────────────
  console.log('');
  console.log(chalk.bold('  🎨 Style Overrides & Token Violations'));
  console.log('');

  const styleItems = [
    {
      label: 'Inline style props (style={{}})',
      value: result.inlineStyleCount,
      threshold: 5,
      why: 'Inline styles bypass design system tokens and cause spacing and color inconsistency across teams.',
    },
    {
      label: 'MUI sx overrides',
      value: result.sxOverrideCount,
      threshold: 5,
      why: 'Frequent sx overrides can indicate heavy local customization. Review whether these styles align with approved tokens and intended component usage.',
    },
    {
      label: 'Hardcoded colors',
      value: result.hardcodedColorCount,
      threshold: 3,
      why: 'Hardcoded hex values break theme consistency and make global color changes (e.g. rebranding) much harder.',
    },
    {
      label: 'Hardcoded spacing values',
      value: result.hardcodedSpacingCount,
      threshold: 5,
      why: 'Raw pixel values ignore the spacing scale, leading to subtle misalignment and inconsistent density across the UI.',
    },
  ];

  for (const item of styleItems) {
    const icon = item.value === 0 ? chalk.green('✓') : item.value <= item.threshold ? chalk.yellow('⚠') : chalk.red('✗');
    const valStr = item.value === 0 ? chalk.green('0') : item.value <= item.threshold ? chalk.yellow(String(item.value)) : chalk.red(String(item.value));
    console.log(`  ${icon}  ${item.label.padEnd(35)} ${valStr}`);
    if (item.value > item.threshold) {
      console.log(`     ${chalk.gray(item.why)}`);
    }
  }

  if (inlineStyles.worstOffenders.length > 0 && result.inlineStyleCount + result.hardcodedColorCount + result.hardcodedSpacingCount > 0) {
    console.log('');
    console.log(`  ${chalk.gray('Top offenders:')}`);
    for (const offender of inlineStyles.worstOffenders.slice(0, 3)) {
      const rel = path.relative(targetDir, offender.filePath);
      console.log(`    ${chalk.red(offender.count.toString().padStart(3))} violations  ${chalk.gray(rel)}`);
    }
  }

  console.log('');
  console.log(DIVIDER);

  // ── Recommendations ───────────────────────────────────────────────────────────
  console.log('');
  console.log(chalk.bold('  💡 Top Recommendations'));
  console.log('');

  if (result.recommendations.length === 0) {
    console.log(`  ${chalk.green('✓')} No critical recommendations — design system looks healthy!`);
  } else {
    result.recommendations.forEach((rec, i) => {
      console.log(`  ${chalk.bold.blue(`${i + 1}.`)} ${rec}`);
      console.log('');
    });
  }

  console.log(DIVIDER);
  console.log('');
  console.log(chalk.gray('  Run with --json to export machine-readable report.'));
  console.log(chalk.gray('  Run with --html to export shareable HTML report.'));
  console.log('');
}
