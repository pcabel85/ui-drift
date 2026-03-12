import { ComponentProfile, DSAuditConfig } from '../types';
import { normalizeComponentName } from '../utils/normalizeComponentName';

export interface WrapperFinding {
  filePath: string;
  componentName: string;
  wrapsComponent: string;
  isWrapperSprawl: boolean;
}

export interface WrapperAnalysisResult {
  wrappers: WrapperFinding[];
  sprawlGroups: Record<string, WrapperFinding[]>;
}

/**
 * A true wrapper is a component whose exported name maps to the same UI family
 * as the DS component it wraps. e.g. AppButton wrapping MuiButton → both "button" family.
 *
 * Components that merely USE Typography/Box/Divider internally are consumers, not wrappers.
 * We explicitly exclude layout/utility primitives (Box, Grid, Stack, Typography, Divider,
 * Container) from sprawl detection because they are expected to be used everywhere.
 */
const UTILITY_PRIMITIVES = new Set([
  'Box', 'Grid', 'Stack', 'Container', 'Typography', 'Divider',
  'Spacer', 'Flex', 'HStack', 'VStack', 'Center', 'Wrap',
]);

export function analyzeWrappers(
  profiles: ComponentProfile[],
  config: DSAuditConfig
): WrapperAnalysisResult {
  const wrappers: WrapperFinding[] = [];

  for (const profile of profiles) {
    if (!profile.wrapsApprovedComponent) continue;

    for (const base of profile.approvedBaseComponents) {
      // Skip utility primitives — every page uses Typography/Box, that's expected
      if (UTILITY_PRIMITIVES.has(base)) continue;

      // Only flag as a wrapper if the component's own name maps to the same
      // UI family as the base it wraps. e.g. PrimaryButton → "button" same as Button.
      // CheckoutPage wrapping TextField is NOT a wrapper — different families.
      const wrapperFamily = normalizeComponentName(profile.componentName);
      const baseFamily = normalizeComponentName(base);

      if (!wrapperFamily || !baseFamily || wrapperFamily !== baseFamily) continue;

      wrappers.push({
        filePath: profile.filePath,
        componentName: profile.componentName,
        wrapsComponent: base,
        isWrapperSprawl: false,
      });
    }
  }

  // Group by wrapped base component
  const sprawlGroups: Record<string, WrapperFinding[]> = {};
  for (const wrapper of wrappers) {
    const key = wrapper.wrapsComponent;
    if (!sprawlGroups[key]) sprawlGroups[key] = [];
    sprawlGroups[key].push(wrapper);
  }

  // Mark sprawl: 3+ same-family wrappers around the same approved component
  for (const [, group] of Object.entries(sprawlGroups)) {
    if (group.length >= 3) {
      for (const w of group) w.isWrapperSprawl = true;
    }
  }

  // Only surface groups with 2+ wrappers
  const filteredSprawl: Record<string, WrapperFinding[]> = {};
  for (const [key, group] of Object.entries(sprawlGroups)) {
    if (group.length >= 2) filteredSprawl[key] = group;
  }

  return { wrappers, sprawlGroups: filteredSprawl };
}
