import { describe, it, expect } from 'vitest';
import { getImportRoot } from '../detectDesignSystemCandidates';

describe('getImportRoot', () => {
  // Relative imports are always null
  it('returns null for relative imports', () => {
    expect(getImportRoot('./components/Button')).toBeNull();
    expect(getImportRoot('../ui/index')).toBeNull();
    expect(getImportRoot('.')).toBeNull();
  });

  it('returns null for absolute path imports', () => {
    expect(getImportRoot('/src/components')).toBeNull();
  });

  // Scoped packages
  it('returns @scope/pkg for scoped package imports', () => {
    expect(getImportRoot('@radix-ui/react-dialog')).toBe('@radix-ui/react-dialog');
    expect(getImportRoot('@plane/ui/button')).toBe('@plane/ui');
    expect(getImportRoot('@shadcn/ui')).toBe('@shadcn/ui');
  });

  it('returns null for incomplete scoped packages', () => {
    expect(getImportRoot('@')).toBeNull();
  });

  // Bare packages
  it('returns bare package name', () => {
    expect(getImportRoot('lucide-react')).toBe('lucide-react');
    expect(getImportRoot('react')).toBe('react');
    expect(getImportRoot('cmdk/dist/something')).toBe('cmdk');
  });

  // Alias imports — truncates at last UI keyword segment
  it('truncates alias import at last UI keyword', () => {
    expect(getImportRoot('@/modules/ui/components/Button')).toBe('@/modules/ui/components');
    expect(getImportRoot('@/components/ui/dialog')).toBe('@/components/ui');
    expect(getImportRoot('@/design-system/tokens/color')).toBe('@/design-system');
    expect(getImportRoot('@/src/ui/primitives/badge')).toBe('@/src/ui/primitives'); // 'primitives' is itself a UI keyword
  });

  it('handles ~/ alias prefix the same as @/', () => {
    expect(getImportRoot('~/components/ui/button')).toBe('~/components/ui');
    expect(getImportRoot('~/design-system/Button')).toBe('~/design-system');
  });

  it('falls back to first two segments when no UI keyword found in alias', () => {
    expect(getImportRoot('@/lib/utils')).toBe('@/lib/utils');
    expect(getImportRoot('@/hooks/useStore')).toBe('@/hooks/useStore');
    expect(getImportRoot('@/a')).toBe('@/a'); // only one segment
  });

  it('handles alias import that is exactly a UI keyword segment', () => {
    expect(getImportRoot('@/ui')).toBe('@/ui');
    expect(getImportRoot('@/components')).toBe('@/components');
  });

  it('picks the LAST UI keyword segment, not the first', () => {
    // @/components/ui/button — last UI keyword is 'ui' at index 1
    expect(getImportRoot('@/components/ui/button')).toBe('@/components/ui');
  });
});
