import chalk from 'chalk';
import { AutoDetectResult, SuggestedConfig } from './types';

/**
 * Prints DriftSense discovery results to the terminal.
 */
export function printDsSuggestions(
  result: AutoDetectResult,
  suggested: SuggestedConfig | null
): void {
  console.log(chalk.yellow('\n  ── DriftSense ────────────────────────────────────────────────\n'));
  console.log(chalk.yellow(`  Trigger: ${result.triggerReason}`));
  console.log('');

  if (result.candidates.length === 0) {
    console.log(chalk.gray('  DriftSense found no design system candidates.\n'));
    return;
  }

  console.log(chalk.bold('  DriftSense detected possible internal design system / shared UI locations:\n'));

  const UI_KW = ['ui', 'components', 'design-system', 'designsystem', 'primitives', 'component-library'];
  const displayCandidates = result.candidates.filter(c => {
    if (c.confidence === 'high') return true;
    const rootLower = c.importRoot.toLowerCase();
    return UI_KW.some(kw => rootLower.includes(kw)) || c.detectedPrimitives.length >= 2;
  });

  for (const c of displayCandidates) {
    const confColor =
      c.confidence === 'high' ? chalk.green :
      c.confidence === 'medium' ? chalk.yellow :
      chalk.gray;

    const confLabel = confColor(`[${c.confidence}]`);
    const primitiveNote = c.detectedPrimitives.length > 0
      ? chalk.gray(` — primitives: ${c.detectedPrimitives.slice(0, 6).join(', ')}${c.detectedPrimitives.length > 6 ? ', …' : ''}`)
      : '';
    const fileNote = c.importingFileCount > 0
      ? chalk.gray(` (${c.importingFileCount} files)`)
      : '';

    console.log(`  ${confLabel} ${chalk.cyan(c.importRoot)}${fileNote}${primitiveNote}`);
    if (c.fsPath && c.fsPath !== c.importRoot) {
      console.log(chalk.gray(`          fs: ${c.fsPath}`));
    }
  }

  if (!suggested) {
    console.log(chalk.gray('\n  DriftSense could not generate a config suggestion from these candidates.\n'));
    return;
  }

  console.log(chalk.bold('\n  DriftSense suggestion:\n'));
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

/**
 * Prints a one-line hint about available DriftSense flags.
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
