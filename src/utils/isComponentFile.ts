import * as path from 'path';
import { isTestOrStoryFile } from './pathHelpers';

/**
 * Returns true if the file is likely a React component file.
 * Requires .tsx or .jsx extension, not a test/story.
 * Accepts both PascalCase (Button.tsx) and lowercase (button.tsx) filenames —
 * many repos (e.g. Plane, shadcn) use lowercase file names for components.
 * The .tsx/.jsx extension is the primary signal; downstream analyzers
 * (normalizeComponentName, isPrimitiveLike) handle further filtering.
 */
export function isComponentFile(filePath: string): boolean {
  const ext = path.extname(filePath);
  if (ext !== '.tsx' && ext !== '.jsx') return false;
  if (isTestOrStoryFile(filePath)) return false;
  return true;
}
