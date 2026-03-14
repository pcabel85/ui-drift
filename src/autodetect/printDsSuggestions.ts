import chalk from 'chalk';
import { AutoDetectResult, SuggestedConfig } from './types';

const HEAVY = chalk.yellow('━'.repeat(60));

/**
 * Prints the DriftSense callout block to the terminal.
 */
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

/**
 * Prints a short hint when DriftSense ran but the user hasn't acted on it.
 */
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
