import * as path from 'path';
import { isTestOrStoryFile } from './pathHelpers';

/**
 * Returns true if the file is likely a React component file.
 * Requires .tsx or .jsx extension, PascalCase filename, not a test/story.
 */
export function isComponentFile(filePath: string): boolean {
  const ext = path.extname(filePath);
  if (ext !== '.tsx' && ext !== '.jsx') return false;
  if (isTestOrStoryFile(filePath)) return false;

  const base = path.basename(filePath, ext);

  // Allow PascalCase component files AND index files (index.tsx in a component folder)
  if (base === 'index') return true;
  return /^[A-Z]/.test(base);
}
