import * as fs from 'fs';
import * as path from 'path';
import { ComponentProfile } from '../types';
import { DsCandidate, AutoDetectResult, DetectionSource } from './types';

// ── Constants ──────────────────────────────────────────────────────────────────

/** Path segments that signal UI/DS content */
const UI_KEYWORDS = ['ui', 'components', 'design-system', 'designsystem', 'primitives', 'component-library'] as const;

/**
 * Package roots that look like UI but are not app design systems.
 * Checked against the start of the import root (after lowercasing).
 */
const NON_DS_PACKAGE_PREFIXES = [
  '@react-email', 'react-email',  // email rendering
  'mjml',                          // email templating
  '@mailchimp',                    // marketing email
  'storybook', '@storybook',       // docs tooling, not runtime DS
] as const;

/** Segments that signal domain-specific (non-shared) code */
const DOMAIN_KEYWORDS = [
  'billing', 'auth', 'checkout', 'survey', 'onboarding', 'analytics',
  'admin', 'settings', 'profile', 'payment', 'booking', 'reporting',
] as const;

/** Known DS path patterns to probe, relative to targetDir */
const KNOWN_FS_PATTERNS = [
  'packages/ui',
  'packages/design-system',
  'packages/components',
  'src/components/ui',
  'src/ui',
  'src/design-system',
  'src/shared/ui',
  'src/shared/components',
  'modules/ui',
  'libs/ui',
  'lib/ui',
  'components/ui',
  'shared/ui',
  'design-system',
] as const;

/** File/directory names (lowercased, no extension) that suggest UI primitives */
const PRIMITIVE_NAMES = new Set([
  'button', 'input', 'select', 'modal', 'dialog', 'card', 'badge',
  'alert', 'tooltip', 'checkbox', 'radio', 'switch', 'spinner',
  'skeleton', 'avatar', 'icon', 'label', 'form', 'table', 'tabs',
  'accordion', 'drawer', 'toast', 'popover', 'breadcrumb', 'tag',
  'chip', 'menu', 'heading', 'text', 'loader', 'dropdown',
]);

// ── Import root extraction ─────────────────────────────────────────────────────

/**
 * Given an import source string, returns the groupable root to use as a
 * candidate key. Returns null for relative imports and non-UI bare imports.
 *
 * Rules:
 *  - Relative → null
 *  - @scope/pkg[/...] (non-alias) → "@scope/pkg"
 *  - @/ or ~/ (alias) → path up to and including the last UI_KEYWORDS segment
 *  - bare package → first path segment
 */
export function getImportRoot(source: string): string | null {
  if (!source || source.startsWith('.') || source.startsWith('/')) return null;

  // Alias imports: @/ or ~/
  if (source.startsWith('@/') || source.startsWith('~/')) {
    const prefix = source.startsWith('@/') ? '@/' : '~/';
    const inner = source.slice(prefix.length);
    const segments = inner.split('/');

    let lastUiIdx = -1;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i].toLowerCase();
      if ((UI_KEYWORDS as readonly string[]).includes(seg)) lastUiIdx = i;
    }

    if (lastUiIdx >= 0) {
      return prefix + segments.slice(0, lastUiIdx + 1).join('/');
    }
    // No UI keyword — return first two segments as a weak candidate
    return prefix + segments.slice(0, Math.min(2, segments.length)).join('/');
  }

  // Scoped package: @scope/package[/rest]
  if (source.startsWith('@')) {
    const parts = source.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  }

  // Bare package
  const first = source.split('/')[0];
  return first.length > 0 ? first : null;
}

// ── Import frequency analysis ─────────────────────────────────────────────────

interface RootData {
  files: Set<string>;
  specifiers: Set<string>;
  source: DetectionSource;
}

function groupImportsByRoot(profiles: ComponentProfile[]): Map<string, RootData> {
  const map = new Map<string, RootData>();

  for (const profile of profiles) {
    for (const imp of profile.imports) {
      const root = getImportRoot(imp.source);
      if (!root) continue;

      if (!map.has(root)) {
        map.set(root, { files: new Set(), specifiers: new Set(), source: 'import-frequency' });
      }
      const data = map.get(root)!;
      data.files.add(profile.filePath);
      for (const spec of imp.specifiers) data.specifiers.add(spec);
    }
  }

  return map;
}

/** Extract primitive names from a set of imported specifier names */
function primitivesFromSpecifiers(specifiers: Set<string>): string[] {
  const found = new Set<string>();
  for (const spec of specifiers) {
    const lower = spec.toLowerCase();
    for (const prim of PRIMITIVE_NAMES) {
      if (lower === prim || lower.startsWith(prim)) found.add(prim);
    }
  }
  return Array.from(found);
}

// ── Filesystem scanning ────────────────────────────────────────────────────────

function detectPrimitivesInDir(dirPath: string): string[] {
  const found = new Set<string>();

  function checkName(name: string) {
    const clean = name.toLowerCase().replace(/\.(tsx|jsx|ts|js)$/, '').replace(/[-_]/g, '');
    if (PRIMITIVE_NAMES.has(clean)) found.add(clean);
    // Also try with trailing 's' stripped
    if (clean.endsWith('s') && PRIMITIVE_NAMES.has(clean.slice(0, -1))) found.add(clean.slice(0, -1));
  }

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      checkName(entry.name);
      if (entry.isDirectory()) {
        try {
          const sub = fs.readdirSync(path.join(dirPath, entry.name), { withFileTypes: true });
          for (const s of sub) checkName(s.name);
        } catch { /* skip unreadable subdirs */ }
      }
    }
  } catch { /* skip unreadable dirs */ }

  return Array.from(found);
}

function scanFilesystemPatterns(targetDir: string): Array<{ fsPath: string; primitives: string[] }> {
  const results: Array<{ fsPath: string; primitives: string[] }> = [];

  for (const pattern of KNOWN_FS_PATTERNS) {
    const fullPath = path.join(targetDir, ...pattern.split('/'));
    try {
      const stat = fs.statSync(fullPath);
      if (!stat.isDirectory()) continue;
    } catch {
      continue;
    }
    const primitives = detectPrimitivesInDir(fullPath);
    results.push({ fsPath: pattern, primitives });
  }

  return results;
}

// ── tsconfig alias reading ─────────────────────────────────────────────────────

/** Returns alias → base-path pairs, e.g. "@/*" → "src/" */
function readTsconfigAliases(targetDir: string): Map<string, string> {
  const aliases = new Map<string, string>();
  const candidates = [
    path.join(targetDir, 'tsconfig.json'),
    path.join(targetDir, 'tsconfig.base.json'),
    path.join(targetDir, 'apps', 'web', 'tsconfig.json'),
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      // Strip single-line comments so JSON.parse works
      const clean = raw.replace(/\/\/[^\n]*/g, '');
      const tsconfig = JSON.parse(clean);
      const paths: Record<string, string[]> = tsconfig?.compilerOptions?.paths ?? {};
      for (const [alias, targets] of Object.entries(paths)) {
        if (!Array.isArray(targets) || targets.length === 0) continue;
        // Normalise: "@/*" → "@/", "src/*" → "src/"
        const normAlias = alias.replace(/\/?\*$/, '/').replace(/\/$/, '');
        const normTarget = targets[0].replace(/\/?\*$/, '/').replace(/\/$/, '');
        aliases.set(normAlias, normTarget);
      }
      break; // use first parseable tsconfig
    } catch { /* skip */ }
  }

  return aliases;
}

// ── Workspace package scanning ────────────────────────────────────────────────

function scanWorkspacePackages(targetDir: string): Array<{ importRoot: string; fsPath: string }> {
  const results: Array<{ importRoot: string; fsPath: string }> = [];
  const wsDirs = ['packages', 'libs', 'modules'];

  for (const wsDir of wsDirs) {
    const wsPath = path.join(targetDir, wsDir);
    if (!fs.existsSync(wsPath)) continue;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(wsPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pkgJsonPath = path.join(wsPath, entry.name, 'package.json');
      if (!fs.existsSync(pkgJsonPath)) continue;

      let pkgName = '';
      try {
        const raw = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
        pkgName = raw.name ?? '';
      } catch {
        continue;
      }

      const dirLower = entry.name.toLowerCase();
      const nameLower = pkgName.toLowerCase();
      const isUiLike =
        (UI_KEYWORDS as readonly string[]).some(kw => dirLower.includes(kw) || nameLower.includes(kw));
      const isDomainSpecific =
        (DOMAIN_KEYWORDS as readonly string[]).some(kw => dirLower.includes(kw) || nameLower.includes(kw));

      if (isUiLike && !isDomainSpecific) {
        results.push({
          importRoot: pkgName || path.posix.join(wsDir, entry.name),
          fsPath: path.posix.join(wsDir, entry.name),
        });
      }
    }
  }

  return results;
}

// ── Scoring ───────────────────────────────────────────────────────────────────

export function scoreCandidate(candidate: {
  importRoot: string;
  detectedPrimitives: string[];
  importingFileCount: number;
}): { score: number; confidence: 'high' | 'medium' | 'low' } {
  let score = 0;
  const root = candidate.importRoot.toLowerCase();

  // Path contains a UI keyword: +2
  if ((UI_KEYWORDS as readonly string[]).some(kw => root.includes(kw))) score += 2;
  // Extra bonus for 'design-system': +1
  if (root.includes('design-system') || root.includes('designsystem')) score += 1;

  // Detected primitives
  const pc = candidate.detectedPrimitives.length;
  if (pc >= 3) score += 3;
  else if (pc >= 1) score += 1;

  // Import frequency
  const fc = candidate.importingFileCount;
  if (fc >= 50) score += 5;
  else if (fc >= 10) score += 3;
  else if (fc >= 3) score += 1;

  // Domain penalty
  if ((DOMAIN_KEYWORDS as readonly string[]).some(kw => root.includes(kw))) score -= 2;

  const finalScore = Math.max(0, score);
  const confidence: 'high' | 'medium' | 'low' =
    finalScore >= 8 ? 'high' : finalScore >= 4 ? 'medium' : 'low';

  return { score: finalScore, confidence };
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export function detectDesignSystemCandidates(
  profiles: ComponentProfile[],
  targetDir: string,
  approvedCount: number,
  localCount: number,
  scannedFiles: number,
  forceDetect: boolean
): AutoDetectResult {
  const triggerMet =
    forceDetect ||
    (approvedCount === 0 && localCount >= 25 && scannedFiles >= 50);

  const triggerReason = approvedCount === 0
    ? `0 approved design system imports detected across ${scannedFiles} source files with ${localCount} local UI imports`
    : `Approved DS adoption is unusually low (${Math.round((approvedCount / (approvedCount + localCount)) * 100)}%)`;

  if (!triggerMet) {
    return { candidates: [], triggerMet: false, triggerReason };
  }

  // Collect all signals into a merged candidate map keyed by importRoot
  const merged = new Map<string, {
    importRoot: string;
    fsPath: string | undefined;
    source: DetectionSource;
    detectedPrimitives: Set<string>;
    importingFileCount: number;
  }>();

  function upsert(
    importRoot: string,
    fsPath: string | undefined,
    source: DetectionSource,
    primitives: string[],
    fileCount: number
  ) {
    if (!merged.has(importRoot)) {
      merged.set(importRoot, {
        importRoot,
        fsPath,
        source,
        detectedPrimitives: new Set(primitives),
        importingFileCount: fileCount,
      });
    } else {
      const existing = merged.get(importRoot)!;
      for (const p of primitives) existing.detectedPrimitives.add(p);
      existing.importingFileCount = Math.max(existing.importingFileCount, fileCount);
      // Prefer import-frequency as strongest source signal
      if (source === 'import-frequency') existing.source = 'import-frequency';
      if (!existing.fsPath && fsPath) existing.fsPath = fsPath;
    }
  }

  // Signal 1: import frequency from profiles
  const tsAliases = readTsconfigAliases(targetDir);
  const importMap = groupImportsByRoot(profiles);

  for (const [root, data] of importMap) {
    if (data.files.size < 2) continue; // need at least 2 files to be a shared root

    const primitives = primitivesFromSpecifiers(data.specifiers);

    // Try to resolve fsPath for alias imports
    let fsPath: string | undefined;
    if (root.startsWith('@/') || root.startsWith('~/')) {
      const inner = root.slice(2); // strip @/ or ~/
      // Look for a matching tsconfig alias
      for (const [alias, target] of tsAliases) {
        const normAlias = alias.replace(/^@\//, '').replace(/^~\//, '');
        if (inner.startsWith(normAlias) || normAlias === '') {
          fsPath = (normAlias === '' ? target : target + inner.slice(normAlias.length))
            .replace(/\\/g, '/').replace(/^\//, '');
          break;
        }
      }
      // Fallback: strip alias prefix as-is
      if (!fsPath) fsPath = inner;
    }

    upsert(root, fsPath, 'import-frequency', primitives, data.files.size);
  }

  // Signal 2: filesystem path scanning
  const fsPaths = scanFilesystemPatterns(targetDir);
  for (const { fsPath, primitives } of fsPaths) {
    // Build an import root from the fsPath for display (use the last UI-keyword segment path)
    upsert(fsPath, fsPath, 'filesystem', primitives, 0);
  }

  // Signal 3: workspace packages
  const wsPkgs = scanWorkspacePackages(targetDir);
  for (const { importRoot, fsPath } of wsPkgs) {
    const primitives = detectPrimitivesInDir(path.join(targetDir, ...fsPath.split('/')));
    upsert(importRoot, fsPath, 'workspace-package', primitives, 0);
  }

  // Score and build final candidates
  const candidates: DsCandidate[] = [];
  for (const c of merged.values()) {
    const { score, confidence } = scoreCandidate({
      importRoot: c.importRoot,
      detectedPrimitives: Array.from(c.detectedPrimitives),
      importingFileCount: c.importingFileCount,
    });
    if (score <= 0) continue;

    // Filter out packages that look like UI but are not app design systems
    const rootLower = c.importRoot.toLowerCase();
    if ((NON_DS_PACKAGE_PREFIXES as readonly string[]).some(p => rootLower.startsWith(p))) continue;

    candidates.push({
      importRoot: c.importRoot,
      fsPath: c.fsPath,
      source: c.source,
      detectedPrimitives: Array.from(c.detectedPrimitives),
      importingFileCount: c.importingFileCount,
      score,
      confidence,
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  return { candidates, triggerMet: true, triggerReason };
}
