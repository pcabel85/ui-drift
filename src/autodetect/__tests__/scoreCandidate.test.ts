import { describe, it, expect } from 'vitest';
import { scoreCandidate } from '../detectDesignSystemCandidates';

function make(overrides: Partial<Parameters<typeof scoreCandidate>[0]> = {}) {
  return {
    importRoot: 'some-package',
    detectedPrimitives: [],
    importingFileCount: 0,
    ...overrides,
  };
}

describe('scoreCandidate', () => {
  it('scores 0 for a generic package with no signals', () => {
    const { score, confidence } = scoreCandidate(make({ importRoot: 'lodash' }));
    expect(score).toBe(0);
    expect(confidence).toBe('low');
  });

  it('awards +2 for a UI keyword in the import root', () => {
    const { score } = scoreCandidate(make({ importRoot: '@company/ui' }));
    expect(score).toBeGreaterThanOrEqual(2);
  });

  it('awards an extra +1 bonus for design-system in the root', () => {
    const withDs = scoreCandidate(make({ importRoot: '@company/design-system' }));
    const withoutDs = scoreCandidate(make({ importRoot: '@company/ui' }));
    expect(withDs.score).toBe(withoutDs.score + 1);
  });

  it('awards +1 for 1-2 detected primitives', () => {
    const none = scoreCandidate(make({ importRoot: '@co/ui', detectedPrimitives: [] }));
    const one  = scoreCandidate(make({ importRoot: '@co/ui', detectedPrimitives: ['button'] }));
    expect(one.score).toBe(none.score + 1);
  });

  it('awards +3 for 3+ detected primitives', () => {
    const none  = scoreCandidate(make({ importRoot: '@co/ui', detectedPrimitives: [] }));
    const three = scoreCandidate(make({ importRoot: '@co/ui', detectedPrimitives: ['button', 'input', 'modal'] }));
    expect(three.score).toBe(none.score + 3);
  });

  it('awards +1 for 3-9 importing files', () => {
    const base = scoreCandidate(make({ importRoot: '@co/ui' }));
    const some = scoreCandidate(make({ importRoot: '@co/ui', importingFileCount: 5 }));
    expect(some.score).toBe(base.score + 1);
  });

  it('awards +3 for 10-49 importing files', () => {
    const base  = scoreCandidate(make({ importRoot: '@co/ui' }));
    const many  = scoreCandidate(make({ importRoot: '@co/ui', importingFileCount: 20 }));
    expect(many.score).toBe(base.score + 3);
  });

  it('awards +5 for 50+ importing files', () => {
    const base = scoreCandidate(make({ importRoot: '@co/ui' }));
    const lots = scoreCandidate(make({ importRoot: '@co/ui', importingFileCount: 50 }));
    expect(lots.score).toBe(base.score + 5);
  });

  it('applies -2 domain penalty for domain keywords', () => {
    const clean  = scoreCandidate(make({ importRoot: '@co/ui', importingFileCount: 5 }));
    const domain = scoreCandidate(make({ importRoot: '@co/ui-billing', importingFileCount: 5 }));
    expect(domain.score).toBe(Math.max(0, clean.score - 2));
  });

  it('never goes below 0', () => {
    const { score } = scoreCandidate(make({ importRoot: 'billing-utils' }));
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('labels confidence high at score >= 8', () => {
    // @co/ui (2) + 3 primitives (3) + 50 files (5) = 10
    const { confidence } = scoreCandidate(make({
      importRoot: '@co/ui',
      detectedPrimitives: ['button', 'input', 'modal'],
      importingFileCount: 50,
    }));
    expect(confidence).toBe('high');
  });

  it('labels confidence medium at score 4-7', () => {
    // @co/ui (2) + 3 primitives (3) = 5
    const { confidence } = scoreCandidate(make({
      importRoot: '@co/ui',
      detectedPrimitives: ['button', 'input', 'modal'],
    }));
    expect(confidence).toBe('medium');
  });

  it('labels confidence low at score < 4', () => {
    // @co/ui (2) + 1 primitive (1) = 3
    const { confidence } = scoreCandidate(make({
      importRoot: '@co/ui',
      detectedPrimitives: ['button'],
    }));
    expect(confidence).toBe('low');
  });
});
