import { ComponentProfile, DSAuditConfig, DuplicateFinding, DuplicateComponent, Confidence } from '../types';
import { normalizeComponentName } from '../utils/normalizeComponentName';

interface FamilyMember {
  profile: ComponentProfile;
  usesApprovedDS: boolean;
  kind: 'wrapper' | 'standalone';
  wraps?: string;
}

export function analyzeDuplicateFamilies(
  profiles: ComponentProfile[],
  config: DSAuditConfig
): DuplicateFinding[] {
  const families: Map<string, FamilyMember[]> = new Map();

  for (const profile of profiles) {
    const family = normalizeComponentName(profile.componentName);
    if (!family) continue;

    const usesApprovedDS = profile.imports.some((imp) =>
      config.designSystemImports.some(
        (ds) => imp.source === ds || imp.source.startsWith(`${ds}/`) || imp.source.startsWith(ds)
      )
    );

    let kind: 'wrapper' | 'standalone' = 'standalone';
    let wraps: string | undefined;

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

    if (!families.has(family)) families.set(family, []);
    families.get(family)!.push({ profile, usesApprovedDS, kind, wraps });
  }

  const findings: DuplicateFinding[] = [];

  for (const [family, members] of families.entries()) {
    if (members.length < 2) continue;

    const severity = calculateSeverity(members);
    if (!severity) continue;

    const confidence = calculateConfidence(members);
    const reason = buildReason(members, severity);
    const whyItMatters = buildWhyItMatters(family, members, severity);

    const components: DuplicateComponent[] = members.map((m) => ({
      filePath: m.profile.filePath,
      kind: m.kind,
      wraps: m.wraps,
    }));

    findings.push({ family, severity, components, reason, confidence, whyItMatters });
  }

  const severityOrder = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return findings;
}

function calculateSeverity(members: FamilyMember[]): 'high' | 'medium' | 'low' | null {
  const count = members.length;
  const standaloneCount = members.filter((m) => m.kind === 'standalone' && !m.usesApprovedDS).length;
  const wrapperCount = members.filter((m) => m.kind === 'wrapper').length;

  if (count >= 3 && standaloneCount >= 2) return 'high';
  if (count >= 4) return 'high';
  if (wrapperCount >= 2) return 'medium';
  if (count >= 2 && standaloneCount >= 1) return 'medium';
  if (count >= 2) return 'low';

  return null;
}

function calculateConfidence(members: FamilyMember[]): Confidence {
  const standaloneCount = members.filter((m) => m.kind === 'standalone').length;
  const COMMON_PROPS = ['variant', 'size', 'color', 'disabled', 'onClick', 'children', 'className'];
  const memberPropSets = members.map((m) => new Set(m.profile.props));

  let sharedPropCount = 0;
  for (const prop of COMMON_PROPS) {
    if (memberPropSets.length >= 2 && memberPropSets.every((s) => s.has(prop))) sharedPropCount++;
  }

  if (standaloneCount >= 2 && sharedPropCount >= 2) return 'high';
  if (standaloneCount >= 3) return 'high';
  if (standaloneCount >= 2 || sharedPropCount >= 1) return 'medium';
  return 'low';
}

function buildReason(members: FamilyMember[], severity: 'high' | 'medium' | 'low'): string {
  const standalones = members.filter((m) => m.kind === 'standalone' && !m.usesApprovedDS);
  const wrappers = members.filter((m) => m.kind === 'wrapper');
  const parts: string[] = [];

  parts.push(`${members.length} components with similar names`);

  if (standalones.length > 0) {
    parts.push(`${standalones.length} standalone${standalones.length > 1 ? 's' : ''} without approved DS imports`);
  }
  if (wrappers.length > 0) {
    const bases = [...new Set(wrappers.map((w) => w.wraps).filter(Boolean))];
    parts.push(`${wrappers.length} wrapper${wrappers.length > 1 ? 's' : ''} around ${bases.join(', ')}`);
  }

  const COMMON_PROPS = ['variant', 'size', 'color', 'disabled', 'onClick', 'children'];
  const memberPropSets = members.map((m) => new Set(m.profile.props));
  const sharedProps = COMMON_PROPS.filter((p) => memberPropSets.every((s) => s.has(p)));
  if (sharedProps.length >= 2) {
    parts.push(`overlapping props: ${sharedProps.join(', ')}`);
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

  if (severity === 'high') {
    return (
      `Multiple independent ${family} implementations increase maintenance cost and cause ` +
      `visual inconsistency — the same UI element may look or behave differently across features. ` +
      `Bug fixes and design updates must be applied in ${standaloneCount} places instead of one.`
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
