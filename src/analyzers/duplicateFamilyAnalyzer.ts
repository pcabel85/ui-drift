import { ComponentProfile, DSAuditConfig, DuplicateFinding, DuplicateComponent, Confidence } from '../types';
import { normalizeComponentName, isPrimitiveLike } from '../utils/normalizeComponentName';

interface FamilyMember {
  profile: ComponentProfile;
  usesApprovedDS: boolean;
  kind: 'wrapper' | 'standalone' | 'feature-composed';
  wraps?: string;
}

export function analyzeDuplicateFamilies(
  profiles: ComponentProfile[],
  config: DSAuditConfig
): DuplicateFinding[] {
  const families: Map<string, FamilyMember[]> = new Map();
  const internalDSPaths = config.internalDSPaths ?? [];

  for (const profile of profiles) {
    const family = normalizeComponentName(profile.componentName);
    if (!family) continue;

    const usesApprovedDS = profile.imports.some((imp) =>
      config.designSystemImports.some(
        (ds) => imp.source === ds || imp.source.startsWith(`${ds}/`) || imp.source.startsWith(ds)
      ) || internalDSPaths.some((p) => imp.source.replace(/\\/g, '/').includes(p))
    );

    let kind: 'wrapper' | 'standalone' | 'feature-composed' = 'standalone';
    let wraps: string | undefined;

    // Thin wrapper: directly renders a same-family approved DS component
    if (profile.wrapsApprovedComponent && profile.approvedBaseComponents.length > 0) {
      for (const base of profile.approvedBaseComponents) {
        const baseFamily = normalizeComponentName(base);
        if (baseFamily === family) {
          kind = 'wrapper';
          wraps = base;
          break;
        }
      }
    }

    // Feature-composed: uses DS primitives but has its own domain logic
    // (not a thin same-family wrapper, but not flying blind either)
    if (kind === 'standalone' && usesApprovedDS) {
      kind = 'feature-composed';
    }

    if (!families.has(family)) families.set(family, []);
    families.get(family)!.push({ profile, usesApprovedDS, kind, wraps });
  }

  const findings: DuplicateFinding[] = [];

  for (const [family, members] of families.entries()) {
    if (members.length < 2) continue;

    // Bucket members
    const normalizedInternalPaths = internalDSPaths.map((p) => p.replace(/\\/g, '/'));
    const canonicalDS = members.filter((m) =>
      normalizedInternalPaths.some((p) => m.profile.filePath.replace(/\\/g, '/').includes(p))
    );
    const nonCanonical = members.filter((m) => !canonicalDS.includes(m));
    const primitiveMembers = nonCanonical.filter((m) => isPrimitiveLike(m.profile.componentName));
    const featureMembers = nonCanonical.filter((m) => !isPrimitiveLike(m.profile.componentName));

    // Need at least 2 primitive members to flag as a duplicate family
    if (primitiveMembers.length < 2) continue;

    const severity = calculateSeverity(primitiveMembers);
    if (!severity) continue;

    const confidence = calculateConfidence(primitiveMembers);
    const featureComponentsExcluded = featureMembers.length;
    const exampleFeature = featureMembers[0]?.profile.componentName;
    const reason = buildReason(primitiveMembers, featureComponentsExcluded, exampleFeature);
    const whyItMatters = buildWhyItMatters(family, primitiveMembers, severity);

    const components: DuplicateComponent[] = primitiveMembers.map((m) => ({
      filePath: m.profile.filePath,
      kind: m.kind,
      wraps: m.wraps,
    }));

    findings.push({ family, severity, components, reason, confidence, whyItMatters, featureComponentsExcluded });
  }

  const severityOrder = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return findings;
}

const COMMON_PROPS = ['variant', 'size', 'color', 'disabled', 'onClick', 'children', 'className', 'label', 'placeholder'];

/** Count how many common props are shared across every member in the set. */
function sharedPropCount(propSets: Set<string>[]): number {
  if (propSets.length < 2) return 0;
  return COMMON_PROPS.filter((p) => propSets.every((s) => s.has(p))).length;
}

function calculateSeverity(members: FamilyMember[]): 'high' | 'medium' | 'low' | null {
  const standalones = members.filter((m) => m.kind === 'standalone');
  const wrapperCount = members.filter((m) => m.kind === 'wrapper').length;
  const standaloneCount = standalones.length;
  // feature-composed members use DS primitives intentionally — zero severity weight
  // wrapper sprawl is handled by wrapperAnalyzer; here wrappers are capped at medium

  // Prop overlap measured only across standalones — they're the concerning ones
  const overlap = sharedPropCount(standalones.map((m) => new Set(m.profile.props)));

  // High: multiple reimplementations with structural similarity — clear duplicates
  if (standaloneCount >= 2 && overlap >= 1) return 'high';
  // High: 3+ standalones regardless — obvious drift even without prop evidence
  if (standaloneCount >= 3) return 'high';
  // Medium: 2 standalones but no prop overlap — same noun, different structure (may not be true dups)
  if (standaloneCount >= 2) return 'medium';
  // Medium: one standalone alongside wrappers — mixed DS usage signals a real problem
  if (standaloneCount >= 1 && wrapperCount >= 1) return 'medium';
  // Low: single standalone outlier among otherwise DS-using members
  if (standaloneCount >= 1) return 'low';
  // Medium: wrapper sprawl only (no standalones)
  if (wrapperCount >= 2) return 'medium';

  return null;
}

function calculateConfidence(members: FamilyMember[]): Confidence {
  const standalones = members.filter((m) => m.kind === 'standalone');
  const standaloneCount = standalones.length;
  // Measure overlap across standalones (the signal that matters) then across all members
  const standaloneOverlap = sharedPropCount(standalones.map((m) => new Set(m.profile.props)));
  const allMemberOverlap = sharedPropCount(members.map((m) => new Set(m.profile.props)));

  if (standaloneCount >= 2 && standaloneOverlap >= 2) return 'high';
  if (standaloneCount >= 3) return 'high';
  if (standaloneCount >= 2 || standaloneOverlap >= 1 || allMemberOverlap >= 2) return 'medium';
  return 'low';
}

function buildReason(
  members: FamilyMember[],
  featureComponentsExcluded: number,
  exampleFeature?: string
): string {
  const standalones = members.filter((m) => m.kind === 'standalone');
  const wrappers = members.filter((m) => m.kind === 'wrapper');
  const featureComposed = members.filter((m) => m.kind === 'feature-composed');
  const parts: string[] = [];

  parts.push(`${members.length} primitive-class components`);

  if (standalones.length > 0) {
    parts.push(`${standalones.length} standalone${standalones.length > 1 ? 's' : ''} without approved DS imports`);
  }
  if (wrappers.length > 0) {
    const bases = [...new Set(wrappers.map((w) => w.wraps).filter(Boolean))];
    parts.push(`${wrappers.length} wrapper${wrappers.length > 1 ? 's' : ''} around ${bases.join(', ')}`);
  }
  if (featureComposed.length > 0) {
    parts.push(`${featureComposed.length} feature-composed using DS primitives`);
  }

  const memberPropSets = members.map((m) => new Set(m.profile.props));
  const sharedProps = COMMON_PROPS.filter((p) => memberPropSets.every((s) => s.has(p)));
  if (sharedProps.length >= 2) {
    parts.push(`overlapping props: ${sharedProps.join(', ')}`);
  }

  if (featureComponentsExcluded > 0) {
    const example = exampleFeature ? ` (e.g. ${exampleFeature})` : '';
    parts.push(`${featureComponentsExcluded} feature-specific component${featureComponentsExcluded > 1 ? 's' : ''}${example} excluded from count`);
  }

  return parts.join('; ');
}

function buildWhyItMatters(
  family: string,
  members: FamilyMember[],
  severity: 'high' | 'medium' | 'low'
): string {
  const standaloneCount = members.filter((m) => m.kind === 'standalone').length;
  const wrapperCount = members.filter((m) => m.kind === 'wrapper').length;

  if (severity === 'high' && standaloneCount >= 2) {
    return (
      `Multiple independent ${family} implementations increase maintenance cost and cause ` +
      `visual inconsistency — the same UI element may look or behave differently across features. ` +
      `Bug fixes and design updates must be applied in ${standaloneCount} places instead of one.`
    );
  }
  if (wrapperCount >= 3) {
    return (
      `${wrapperCount} thin wrappers around the same base ${family} component signal that teams are ` +
      `working around each other instead of sharing. This often grows over time — ` +
      `consolidating to a single shared wrapper prevents further drift.`
    );
  }
  if (wrapperCount >= 2) {
    return (
      `Several thin wrappers around the same base ${family} component signal that teams are ` +
      `working around each other instead of sharing. This often grows over time — ` +
      `consolidating to a single shared wrapper prevents further drift.`
    );
  }
  return (
    `Similar ${family} implementations exist in multiple locations. ` +
    `While not immediately critical, this pattern tends to diverge over time as each copy evolves independently.`
  );
}
