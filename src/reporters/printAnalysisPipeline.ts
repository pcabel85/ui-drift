import chalk from 'chalk';

// ── Types ──────────────────────────────────────────────────────────────────────

/** Which DriftSense execution branch was taken this run. */
export type DriftSenseMode = 'none' | 'paused' | 'rerun' | 'nonpaused';

/**
 * Records which audit phases actually executed this run.
 * Built up incrementally in the CLI as each phase completes.
 */
export interface PipelineState {
  configLoaded: boolean;
  filesDiscovered: number;        // 0 = not yet; >0 = discovered file count
  componentsIdentified: boolean;
  importsAnalyzed: boolean;
  driftSenseTriggered: boolean;
  driftSenseMode: DriftSenseMode;
  driftSenseDetails: string[];    // e.g. ['Low DS adoption detected', 'Shared UI candidates found']
  dsUsageChecked: boolean;
  tokenComplianceChecked: boolean;
  duplicatesChecked: boolean;
  healthScoreCalculated: boolean;
  auditPaused: boolean;
}

export function defaultPipelineState(): PipelineState {
  return {
    configLoaded: false,
    filesDiscovered: 0,
    componentsIdentified: false,
    importsAnalyzed: false,
    driftSenseTriggered: false,
    driftSenseMode: 'none',
    driftSenseDetails: [],
    dsUsageChecked: false,
    tokenComplianceChecked: false,
    duplicatesChecked: false,
    healthScoreCalculated: false,
    auditPaused: false,
  };
}

// ── Renderer ───────────────────────────────────────────────────────────────────

const HEAVY = chalk.gray('━'.repeat(60));

interface Step {
  kind: 'done' | 'driftsense';
  label: string;
  details?: string[];
}

export function printAnalysisPipeline(state: PipelineState): void {
  const steps = buildSteps(state);

  console.log(`  ${HEAVY}`);
  console.log('');
  console.log(chalk.bold('  Analysis Pipeline'));
  console.log('');

  for (const step of steps) {
    if (step.kind === 'done') {
      console.log(`  ${chalk.green('✓')} ${chalk.white(step.label)}`);
    } else {
      console.log(`  ${chalk.yellow('⚡')} ${chalk.yellow(step.label)}`);
      for (const detail of step.details ?? []) {
        console.log(`     ${chalk.gray(detail)}`);
      }
    }
  }

  if (state.auditPaused) {
    console.log('');
    console.log(`  ${chalk.yellow('Audit paused before final scoring.')}`);
  }

  console.log('');
  console.log(`  ${HEAVY}`);
  console.log('');
}

function buildSteps(state: PipelineState): Step[] {
  const steps: Step[] = [];

  if (state.configLoaded) {
    steps.push({ kind: 'done', label: 'Loading configuration' });
  }

  // Rerun: DriftSense config note appears directly after loading, before file discovery
  if (state.driftSenseMode === 'rerun') {
    steps.push({ kind: 'driftsense', label: 'Using DriftSense suggested configuration' });
  }

  if (state.filesDiscovered > 0) {
    steps.push({ kind: 'done', label: 'Discovering source files' });
  }

  if (state.componentsIdentified) {
    steps.push({ kind: 'done', label: 'Identifying React components' });
  }

  if (state.importsAnalyzed) {
    steps.push({ kind: 'done', label: 'Analyzing imports' });
  }

  // DriftSense trigger for paused / non-paused branches (rerun is handled above)
  if (state.driftSenseTriggered && state.driftSenseMode !== 'rerun') {
    steps.push({
      kind: 'driftsense',
      label: 'DriftSense discovery triggered',
      details: state.driftSenseDetails,
    });
  }

  // Stop here if the audit never reached the scoring phases
  if (state.auditPaused) return steps;

  if (state.dsUsageChecked) {
    steps.push({ kind: 'done', label: 'Detecting design system usage' });
  }
  if (state.tokenComplianceChecked) {
    steps.push({ kind: 'done', label: 'Checking token compliance' });
  }
  if (state.duplicatesChecked) {
    steps.push({ kind: 'done', label: 'Detecting duplicate component families' });
  }
  if (state.healthScoreCalculated) {
    steps.push({ kind: 'done', label: 'Calculating health score' });
  }

  return steps;
}
