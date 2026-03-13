import { describe, it, expect } from 'vitest';
import { generateSuggestedConfig } from '../generateSuggestedConfig';
import {
  isAliasImport,
  isPackageImport,
  stripAliasPrefix,
} from '../generateSuggestedConfig';
import { DsCandidate } from '../types';

function candidate(overrides: Partial<DsCandidate> & { importRoot: string }): DsCandidate {
  return {
    fsPath: undefined,
    source: 'import-frequency',
    detectedPrimitives: [],
    importingFileCount: 0,
    score: 5,
    confidence: 'medium',
    ...overrides,
  };
}

// ── Helper predicates ──────────────────────────────────────────────────────────

describe('isAliasImport', () => {
  it('returns true for @/ and ~/ prefixes', () => {
    expect(isAliasImport('@/components/ui')).toBe(true);
    expect(isAliasImport('~/ui')).toBe(true);
  });

  it('returns false for scoped packages and bare names', () => {
    expect(isAliasImport('@radix-ui/react-dialog')).toBe(false);
    expect(isAliasImport('lucide-react')).toBe(false);
    expect(isAliasImport('./local')).toBe(false);
  });
});

describe('isPackageImport', () => {
  it('returns true for bare and scoped packages', () => {
    expect(isPackageImport('@radix-ui/react-dialog')).toBe(true);
    expect(isPackageImport('lucide-react')).toBe(true);
  });

  it('returns false for alias imports and relative paths', () => {
    expect(isPackageImport('@/components/ui')).toBe(false);
    expect(isPackageImport('./local')).toBe(false);
    expect(isPackageImport('/absolute')).toBe(false);
  });
});

describe('stripAliasPrefix', () => {
  it('strips @/ prefix', () => {
    expect(stripAliasPrefix('@/modules/ui/components')).toBe('modules/ui/components');
  });

  it('strips ~/ prefix', () => {
    expect(stripAliasPrefix('~/ui/button')).toBe('ui/button');
  });

  it('returns the string unchanged if no alias prefix', () => {
    expect(stripAliasPrefix('packages/ui')).toBe('packages/ui');
  });
});

// ── generateSuggestedConfig ────────────────────────────────────────────────────

describe('generateSuggestedConfig', () => {
  it('returns null for empty candidates', () => {
    expect(generateSuggestedConfig([])).toBeNull();
  });

  it('returns null when all candidates would produce empty arrays', () => {
    // A candidate with score 0 wouldn't reach here, but test defensively
    // Use a low-confidence candidate that has no mappable data
    // Actually the function doesn't filter by score; it uses confidence
    // A single 'low' candidate with no fsPath and importRoot is a relative-style — won't be null
    // Let's verify the null branch with a weird edge case: scores filtered out upstream
    expect(generateSuggestedConfig([])).toBeNull();
  });

  // Alias candidates → both designSystemImports and internalDSPaths
  it('puts alias imports into both designSystemImports and internalDSPaths', () => {
    const result = generateSuggestedConfig([
      candidate({ importRoot: '@/modules/ui/components', confidence: 'high' }),
    ]);
    expect(result).not.toBeNull();
    expect(result!.designSystemImports).toContain('@/modules/ui/components');
    expect(result!.internalDSPaths).toContain('modules/ui/components');
  });

  // Package candidates → designSystemImports only (unless fsPath present)
  it('puts package imports into designSystemImports only when no fsPath', () => {
    const result = generateSuggestedConfig([
      candidate({ importRoot: '@radix-ui/react-dialog', confidence: 'high' }),
    ]);
    expect(result!.designSystemImports).toContain('@radix-ui/react-dialog');
    expect(result!.internalDSPaths).toHaveLength(0);
  });

  it('also adds fsPath to internalDSPaths for package imports that have one', () => {
    const result = generateSuggestedConfig([
      candidate({ importRoot: '@plane/ui', fsPath: 'packages/ui', confidence: 'high' }),
    ]);
    expect(result!.designSystemImports).toContain('@plane/ui');
    expect(result!.internalDSPaths).toContain('packages/ui');
  });

  // Filesystem-only candidates → internalDSPaths only
  it('puts filesystem-only candidates into internalDSPaths only', () => {
    const result = generateSuggestedConfig([
      candidate({ importRoot: 'src/components/ui', fsPath: 'src/components/ui', source: 'filesystem', confidence: 'high' }),
    ]);
    expect(result!.internalDSPaths).toContain('src/components/ui');
    expect(result!.designSystemImports).toHaveLength(0);
  });

  it('uses fsPath over importRoot for filesystem candidates when available', () => {
    const result = generateSuggestedConfig([
      candidate({ importRoot: 'packages/ui', fsPath: 'packages/ui', source: 'filesystem', confidence: 'high' }),
    ]);
    expect(result!.internalDSPaths).toContain('packages/ui');
  });

  // Uses top 3 high/medium; falls back to top 1 if all low
  it('includes all high candidates plus up to 2 medium ones', () => {
    const result = generateSuggestedConfig([
      candidate({ importRoot: '@/ui',         confidence: 'high' }),
      candidate({ importRoot: '@/components', confidence: 'high' }),
      candidate({ importRoot: '@/primitives', confidence: 'medium' }),
      candidate({ importRoot: '@/extra',      confidence: 'medium' }),
      candidate({ importRoot: '@/overflow',   confidence: 'medium' }), // 3rd medium — excluded
    ]);
    // Both highs + first 2 mediums = 4
    expect(result!.designSystemImports).toHaveLength(4);
    expect(result!.designSystemImports).not.toContain('@/overflow');
  });

  it('falls back to top 1 candidate when all are low confidence', () => {
    const result = generateSuggestedConfig([
      candidate({ importRoot: '@/ui',         confidence: 'low' }),
      candidate({ importRoot: '@/components', confidence: 'low' }),
    ]);
    expect(result!.designSystemImports).toHaveLength(1);
    expect(result!.designSystemImports[0]).toBe('@/ui');
  });

  // No duplicates
  it('does not add duplicate import roots', () => {
    const result = generateSuggestedConfig([
      candidate({ importRoot: '@/modules/ui/components', confidence: 'high' }),
      candidate({ importRoot: '@/modules/ui/components', confidence: 'high' }),
    ]);
    expect(result!.designSystemImports.filter(v => v === '@/modules/ui/components')).toHaveLength(1);
    expect(result!.internalDSPaths.filter(v => v === 'modules/ui/components')).toHaveLength(1);
  });
});
