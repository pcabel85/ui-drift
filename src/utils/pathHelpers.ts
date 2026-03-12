import * as path from 'path';

export function toRelativePath(filePath: string, baseDir: string): string {
  return path.relative(baseDir, filePath);
}

export function isIgnored(filePath: string, ignorePaths: string[]): boolean {
  // Normalise to forward slashes for consistent matching on all platforms
  const normalized = filePath.replace(/\\/g, '/');
  return ignorePaths.some((ignored) =>
    normalized.includes(`/${ignored}/`) ||
    normalized.endsWith(`/${ignored}`)
  );
}

export function getBaseName(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

export function isTestOrStoryFile(filePath: string): boolean {
  return /\.(test|spec|stories|story)\.(tsx|jsx|ts|js)$/.test(filePath) ||
    filePath.includes('__tests__') ||
    filePath.includes('__mocks__') ||
    filePath.includes('.storybook');
}
