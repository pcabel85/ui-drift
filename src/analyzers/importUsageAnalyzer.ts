import { ComponentProfile, DSAuditConfig } from '../types';
import { normalizeComponentName } from '../utils/normalizeComponentName';

export interface ImportUsageResult {
  approvedImportCounts: Record<string, number>;
  localUiImportCounts: Record<string, number>;
  totalApproved: number;
  totalLocal: number;
  adoptionRatio: number;
}

/**
 * Returns true only when `segment` appears as a proper path segment within
 * `normalizedPath` — i.e. bounded by `/` or string boundaries. Prevents
 * `"components"` from matching `"_components"` or `"some-components"`.
 */
function matchesPathSegment(normalizedPath: string, segment: string): boolean {
  return (
    normalizedPath === segment ||
    normalizedPath.startsWith(`${segment}/`) ||
    normalizedPath.includes(`/${segment}/`) ||
    normalizedPath.endsWith(`/${segment}`)
  );
}

export function analyzeImportUsage(
  profiles: ComponentProfile[],
  config: DSAuditConfig
): ImportUsageResult {
  const approvedImportCounts: Record<string, number> = {};
  const localUiImportCounts: Record<string, number> = {};
  const internalDSPaths = config.internalDSPaths ?? [];

  for (const profile of profiles) {
    // Files that live inside an internalDSPaths directory are part of the DS itself —
    // skip their imports entirely to avoid inflating local UI counts.
    const normalizedFilePath = profile.filePath.replace(/\\/g, '/');
    if (internalDSPaths.some((p) => matchesPathSegment(normalizedFilePath, p))) continue;

    for (const importInfo of profile.imports) {
      const src = importInfo.source;

      // Check if this is an approved design system import
      const matchedDS = config.designSystemImports.find((ds) =>
        src === ds || src.startsWith(`${ds}/`) || src.startsWith(`${ds}`)
      );

      if (matchedDS) {
        // Count per-specifier for detailed breakdown
        for (const specifier of importInfo.specifiers) {
          if (specifier === 'default' || specifier === '*') {
            const key = src;
            approvedImportCounts[key] = (approvedImportCounts[key] || 0) + 1;
          } else {
            const key = `${src}/${specifier}`;
            approvedImportCounts[key] = (approvedImportCounts[key] || 0) + 1;
          }
        }
        continue;
      }

      // Check if this import resolves through an internalDSPaths segment
      const normalizedSrc = src.replace(/\\/g, '/');
      const matchedInternal = internalDSPaths.find((p) => matchesPathSegment(normalizedSrc, p));
      if (matchedInternal) {
        for (const specifier of importInfo.specifiers) {
          if (specifier === 'default' || specifier === '*') {
            const key = src;
            approvedImportCounts[key] = (approvedImportCounts[key] || 0) + 1;
          } else {
            const key = `${src}/${specifier}`;
            approvedImportCounts[key] = (approvedImportCounts[key] || 0) + 1;
          }
        }
        continue;
      }

      // Check if this is a local import that looks like a UI component
      const isRelative = src.startsWith('.') || src.startsWith('/');
      if (!isRelative) continue;

      for (const specifier of importInfo.specifiers) {
        if (specifier === 'default' || specifier === '*') continue;
        // Only flag specifiers that look like component names (PascalCase)
        if (!/^[A-Z]/.test(specifier)) continue;

        const family = normalizeComponentName(specifier);
        if (family) {
          localUiImportCounts[specifier] = (localUiImportCounts[specifier] || 0) + 1;
        }
      }
    }
  }

  const totalApproved = Object.values(approvedImportCounts).reduce((a, b) => a + b, 0);
  const totalLocal = Object.values(localUiImportCounts).reduce((a, b) => a + b, 0);
  const total = totalApproved + totalLocal;
  const adoptionRatio = total === 0 ? 0 : totalApproved / total;

  return {
    approvedImportCounts,
    localUiImportCounts,
    totalApproved,
    totalLocal,
    adoptionRatio,
  };
}
