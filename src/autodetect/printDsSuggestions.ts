import chalk from 'chalk';
import { AutoDetectResult, SuggestedConfig } from './types';

const HEAVY = chalk.yellow('━'.repeat(60));

// ── Pause block (high confidence, audit stopped before scoring) ────────────────

export function printDriftSensePauseBlock(
  detection: AutoDetectResult,
  suggested: SuggestedConfig | null
): void {
  console.log('');
  console.log(`  ${HEAVY}`);
  console.log('');
  console.log(`  ${chalk.bold.yellow('⚡ DriftSense activated')}`);
  console.log('');
  console.log(chalk.white('  ui-drift detected likely internal design system / shared UI paths.'));
  console.log('');
  console.log(chalk.gray('  To avoid producing a misleading design system health score,'));
  console.log(chalk.gray('  the audit has been paused before final scoring.'));
  console.log('');

  // Top candidates (high only, up to 5)
  const highCandidates = detection.candidates.filter(c => c.confidence === 'high').slice(0, 5);
  if (highCandidates.length > 0) {
    console.log(chalk.bold('  Possible design system locations:'));
    console.log('');
    highCandidates.forEach((c, i) => {
      console.log(`  ${chalk.bold(`${i + 1}.`)} ${chalk.cyan(c.importRoot)}  ${chalk.green('(high confidence)')}`);
      if (c.detectedPrimitives.length > 0) {
        const prims = c.detectedPrimitives.slice(0, 6).join(', ') + (c.detectedPrimitives.length > 6 ? ', …' : '');
        console.log(chalk.gray(`     contains ${prims}`));
      }
      if (c.importingFileCount > 0) {
        console.log(chalk.gray(`     imported by ${c.importingFileCount} files`));
      }
      console.log('');
    });
  }

  if (suggested) {
    console.log(chalk.bold('  Suggested configuration:'));
    console.log('');
    console.log(chalk.gray('  ┌─────────────────────────────────────────────────────────────'));
    console.log(chalk.gray('  │') + chalk.white(' {'));
    if (suggested.designSystemImports.length > 0) {
      console.log(chalk.gray('  │') + chalk.white('   "designSystemImports": ['));
      for (let i = 0; i < suggested.designSystemImports.length; i++) {
        const comma = i < suggested.designSystemImports.length - 1 ? ',' : '';
        console.log(chalk.gray('  │') + chalk.white(`     "${suggested.designSystemImports[i]}"${comma}`));
      }
      const hasNext = suggested.internalDSPaths.length > 0;
      console.log(chalk.gray('  │') + chalk.white(`   ]${hasNext ? ',' : ''}`));
    }
    if (suggested.internalDSPaths.length > 0) {
      console.log(chalk.gray('  │') + chalk.white('   "internalDSPaths": ['));
      for (let i = 0; i < suggested.internalDSPaths.length; i++) {
        const comma = i < suggested.internalDSPaths.length - 1 ? ',' : '';
        console.log(chalk.gray('  │') + chalk.white(`     "${suggested.internalDSPaths[i]}"${comma}`));
      }
      console.log(chalk.gray('  │') + chalk.white('   ]'));
    }
    console.log(chalk.gray('  │') + chalk.white(' }'));
    console.log(chalk.gray('  └─────────────────────────────────────────────────────────────'));
    console.log('');
  }

  console.log(chalk.bold('  Next steps:'));
  console.log('');
  console.log(`  ${chalk.cyan('--rerun-with-suggestion')}   ${chalk.gray('Run the audit immediately using the DriftSense suggestion')}`);
  console.log(`  ${chalk.cyan('--write-config')}            ${chalk.gray('Save the suggestion to ui-drift.config.json')}`);
  console.log(`  ${chalk.cyan('--ignore-driftsense')}       ${chalk.gray('Continue the audit with the current configuration')}`);
  console.log('');
  console.log(`  ${HEAVY}`);
  console.log('');
}

// ── Medium warning (shown inline, audit continues) ─────────────────────────────

export function printDriftSenseMediumWarning(): void {
  console.log(chalk.yellow('  DriftSense discovered possible shared UI paths.'));
  console.log('');
  console.log(chalk.gray('  These may represent an internal design system.'));
  console.log(chalk.gray('  Results may be more accurate if you configure these paths.'));
  console.log('');
  console.log(chalk.gray('  Suggested flag: ') + chalk.cyan('--rerun-with-suggestion'));
  console.log('');
}

// ── Ignore warning (shown when --ignore-driftsense overrides a high-confidence pause) ──

export function printIgnoreDriftSenseWarning(): void {
  console.log(chalk.yellow('  ⚠ Continuing audit without DriftSense suggestions.'));
  console.log(chalk.gray('  Health score may be inaccurate due to missing design system configuration.'));
  console.log('');
}

// ── Full DriftSense callout block (non-paused mode) ───────────────────────────

export function printDsSuggestions(
  result: AutoDetectResult,
  suggested: SuggestedConfig | null
): void {
  console.log('');
  console.log(`  ${HEAVY}`);
  console.log('');
  console.log(chalk.bold.yellow('  DriftSense activated'));
  console.log('');
  console.log(chalk.gray('  ui-drift detected unusually low design system adoption'));
  console.log(chalk.gray('  and scanned the repository for shared UI layers.'));
  console.log('');

  if (result.candidates.length === 0) {
    console.log(chalk.gray('  No design system candidates found.'));
    console.log('');
    console.log(`  ${HEAVY}`);
    console.log('');
    return;
  }

  const UI_KW = ['ui', 'components', 'design-system', 'designsystem', 'primitives', 'component-library'];
  const displayCandidates = result.candidates.filter(c => {
    if (c.confidence === 'high') return true;
    const rootLower = c.importRoot.toLowerCase();
    return UI_KW.some(kw => rootLower.includes(kw)) || c.detectedPrimitives.length >= 2;
  });

  console.log(chalk.bold('  Possible design system locations:'));
  console.log('');

  displayCandidates.forEach((c, i) => {
    const confColor =
      c.confidence === 'high' ? chalk.green :
      c.confidence === 'medium' ? chalk.yellow :
      chalk.gray;

    console.log(`  ${chalk.bold(`${i + 1}.`)} ${chalk.cyan(c.importRoot)}  ${confColor(`(${c.confidence} confidence)`)}`);

    if (c.detectedPrimitives.length > 0) {
      const prims = c.detectedPrimitives.slice(0, 6).join(', ') + (c.detectedPrimitives.length > 6 ? ', …' : '');
      console.log(chalk.gray(`     contains ${prims}`));
    }
    if (c.importingFileCount > 0) {
      console.log(chalk.gray(`     imported by ${c.importingFileCount} files`));
    }
    if (c.fsPath && c.fsPath !== c.importRoot) {
      console.log(chalk.gray(`     path: ${c.fsPath}`));
    }
    console.log('');
  });

  if (!suggested) {
    console.log(chalk.gray('  DriftSense could not generate a config suggestion from these candidates.'));
    console.log('');
    console.log(`  ${HEAVY}`);
    console.log('');
    return;
  }

  console.log(chalk.bold('  Suggested configuration:'));
  console.log('');
  console.log(chalk.gray('  ┌─────────────────────────────────────────────────────────────'));
  console.log(chalk.gray('  │') + chalk.white(' {'));
  if (suggested.designSystemImports.length > 0) {
    console.log(chalk.gray('  │') + chalk.white('   "designSystemImports": ['));
    for (let i = 0; i < suggested.designSystemImports.length; i++) {
      const comma = i < suggested.designSystemImports.length - 1 ? ',' : '';
      console.log(chalk.gray('  │') + chalk.white(`     "${suggested.designSystemImports[i]}"${comma}`));
    }
    const hasNext = suggested.internalDSPaths.length > 0;
    console.log(chalk.gray('  │') + chalk.white(`   ]${hasNext ? ',' : ''}`));
  }
  if (suggested.internalDSPaths.length > 0) {
    console.log(chalk.gray('  │') + chalk.white('   "internalDSPaths": ['));
    for (let i = 0; i < suggested.internalDSPaths.length; i++) {
      const comma = i < suggested.internalDSPaths.length - 1 ? ',' : '';
      console.log(chalk.gray('  │') + chalk.white(`     "${suggested.internalDSPaths[i]}"${comma}`));
    }
    console.log(chalk.gray('  │') + chalk.white('   ]'));
  }
  console.log(chalk.gray('  │') + chalk.white(' }'));
  console.log(chalk.gray('  └─────────────────────────────────────────────────────────────'));
  console.log('');
  console.log(chalk.gray('  Use ') + chalk.cyan('--write-config') + chalk.gray(' to save this suggestion.'));
  console.log(chalk.gray('  Use ') + chalk.cyan('--rerun-with-suggestion') + chalk.gray(' to rerun the audit with it applied.'));
  console.log('');
  console.log(`  ${HEAVY}`);
  console.log('');
}

// ── Hint line (non-paused, no action flags given) ─────────────────────────────

export function printDetectionHint(): void {
  console.log(
    chalk.gray('  Tip:') +
    chalk.white(' run with ') +
    chalk.cyan('--write-config') +
    chalk.white(' to save this DriftSense suggestion, or ') +
    chalk.cyan('--rerun-with-suggestion') +
    chalk.white(' to audit immediately with it.\n')
  );
}
