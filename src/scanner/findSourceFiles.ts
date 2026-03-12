import fg from 'fast-glob';
import * as path from 'path';
import { isIgnored } from '../utils/pathHelpers';

/** Convert Windows backslashes to forward slashes for fast-glob */
function toGlobPath(p: string): string {
  return p.replace(/\\/g, '/');
}

export async function findSourceFiles(
  targetDir: string,
  ignorePaths: string[]
): Promise<string[]> {
  const absoluteDir = path.resolve(targetDir);
  // fast-glob requires forward slashes even on Windows
  const globDir = toGlobPath(absoluteDir);

  const patterns = [
    `${globDir}/**/*.tsx`,
    `${globDir}/**/*.jsx`,
  ];

  const ignorePatterns = ignorePaths.map((p) => `**/${p}/**`);

  const files = await fg(patterns, {
    ignore: ignorePatterns,
    absolute: true,
    followSymbolicLinks: false,
  });

  // Normalise returned paths to OS separators, then filter
  const normalised = files.map((f) => path.normalize(f));
  return normalised.filter((f) => !isIgnored(f, ignorePaths));
}
