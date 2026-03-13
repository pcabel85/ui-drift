import { DsCandidate, SuggestedConfig } from './types';

/**
 * Returns true if the import root is an alias-style import (@/ or ~/).
 */
export function isAliasImport(importRoot: string): boolean {
  return importRoot.startsWith('@/') || importRoot.startsWith('~/');
}

/**
 * Returns true if the import root looks like a scoped or bare npm package
 * (not an alias, not a relative path).
 */
export function isPackageImport(importRoot: string): boolean {
  return !importRoot.startsWith('.') && !importRoot.startsWith('/') && !isAliasImport(importRoot);
}

/**
 * Strips the alias prefix from an alias import root to produce a path segment
 * suitable for internalDSPaths.
 * Example: "@/modules/ui/components" → "modules/ui/components"
 */
export function stripAliasPrefix(importRoot: string): string {
  if (importRoot.startsWith('@/')) return importRoot.slice(2);
  if (importRoot.startsWith('~/')) return importRoot.slice(2);
  return importRoot;
}

/**
 * Builds a SuggestedConfig from the top-scoring candidates.
 *
 * Mapping rules:
 *  - Alias imports (@/ or ~/) → importRoot into designSystemImports AND
 *    the stripped path into internalDSPaths (internalDSPaths uses `includes`
 *    matching so the path segment is sufficient)
 *  - Package imports (@scope/pkg or bare pkg) → designSystemImports only
 *  - Filesystem-only candidates (no alias, source === 'filesystem') → internalDSPaths only
 *
 * Returns null if both arrays would be empty.
 */
export function generateSuggestedConfig(candidates: DsCandidate[]): SuggestedConfig | null {
  // Include all high-confidence candidates, then up to 2 medium ones.
  // Fall back to top 1 if everything is low confidence.
  const highs = candidates.filter(c => c.confidence === 'high');
  const mediums = candidates.filter(c => c.confidence === 'medium').slice(0, 2);
  const useCandidates = highs.length > 0 ? [...highs, ...mediums] : candidates.slice(0, 1);

  const designSystemImports: string[] = [];
  const internalDSPaths: string[] = [];

  for (const c of useCandidates) {
    if (isAliasImport(c.importRoot)) {
      // Alias: add full alias root to designSystemImports (startsWith matching)
      if (!designSystemImports.includes(c.importRoot)) {
        designSystemImports.push(c.importRoot);
      }
      // Also add the stripped path to internalDSPaths (covers file-path exclusion)
      const stripped = stripAliasPrefix(c.importRoot);
      if (!internalDSPaths.includes(stripped)) {
        internalDSPaths.push(stripped);
      }
    } else if (isPackageImport(c.importRoot) && c.source !== 'filesystem') {
      // Package: designSystemImports only
      if (!designSystemImports.includes(c.importRoot)) {
        designSystemImports.push(c.importRoot);
      }
      // If we also have an fsPath, add it to internalDSPaths
      if (c.fsPath && !internalDSPaths.includes(c.fsPath)) {
        internalDSPaths.push(c.fsPath);
      }
    } else {
      // Filesystem-only or local-path candidate
      const pathToAdd = c.fsPath ?? c.importRoot;
      if (!internalDSPaths.includes(pathToAdd)) {
        internalDSPaths.push(pathToAdd);
      }
    }
  }

  if (designSystemImports.length === 0 && internalDSPaths.length === 0) return null;

  return { designSystemImports, internalDSPaths };
}
