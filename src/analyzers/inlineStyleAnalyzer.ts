import { ComponentProfile } from '../types';

export interface InlineStyleResult {
  totalInlineStyles: number;
  totalSxOverrides: number;
  totalHardcodedColors: number;
  totalHardcodedSpacing: number;
  worstOffenders: Array<{ filePath: string; count: number }>;
  uniqueHardcodedColors: string[];
}

export function analyzeInlineStyles(profiles: ComponentProfile[]): InlineStyleResult {
  let totalInlineStyles = 0;
  let totalSxOverrides = 0;
  let totalHardcodedColors = 0;
  let totalHardcodedSpacing = 0;
  const allColors = new Set<string>();

  const offenders: Array<{ filePath: string; count: number }> = [];

  for (const profile of profiles) {
    totalInlineStyles += profile.inlineStyleCount;
    totalSxOverrides += profile.sxOverrideCount;
    totalHardcodedColors += profile.hardcodedColors.length;
    totalHardcodedSpacing += profile.hardcodedSpacingCount;

    for (const color of profile.hardcodedColors) {
      allColors.add(color.toLowerCase());
    }

    const totalViolations =
      profile.inlineStyleCount +
      profile.sxOverrideCount +
      profile.hardcodedColors.length +
      profile.hardcodedSpacingCount;

    if (totalViolations > 0) {
      offenders.push({ filePath: profile.filePath, count: totalViolations });
    }
  }

  offenders.sort((a, b) => b.count - a.count);

  return {
    totalInlineStyles,
    totalSxOverrides,
    totalHardcodedColors,
    totalHardcodedSpacing,
    worstOffenders: offenders.slice(0, 5),
    uniqueHardcodedColors: [...allColors].slice(0, 20),
  };
}
