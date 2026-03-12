// Prefixes/suffixes to strip when looking for the core UI noun
const STRIP_WORDS = [
  'primary', 'secondary', 'tertiary', 'cta', 'base', 'custom', 'shared',
  'common', 'app', 'main', 'default', 'new', 'old', 'legacy', 'v2', 'v3',
  'enhanced', 'extended', 'simple', 'basic', 'outline', 'outlined', 'filled',
  'ghost', 'solid', 'flat', 'rounded', 'small', 'large', 'medium', 'mini',
  'compact', 'full', 'page', 'section', 'widget', 'component', 'element',
  'item', 'action', 'hero', 'promo', 'product', 'user', 'auth', 'checkout',
  'feature', 'marketing', 'global', 'local', 'inner', 'outer', 'wrapper',
  'container', 'layout', 'styled',
];

/**
 * Given a PascalCase component name, returns a normalized family noun (lowercase)
 * or null if no known UI noun is found.
 */
export function normalizeComponentName(name: string): string | null {
  // Split PascalCase into words
  const words = name
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase()
    .split(/\s+/);

  // Remove strip words to find the core noun
  const coreWords = words.filter((w) => !STRIP_WORDS.includes(w));

  // Check against known UI nouns (longer matches first to avoid partial matches)
  const UI_NOUNS = [
    'accordion', 'alert', 'avatar', 'badge', 'breadcrumb', 'button',
    'card', 'checkbox', 'chip', 'container', 'dialog', 'divider',
    'drawer', 'dropdown', 'form', 'grid', 'heading', 'icon',
    'input', 'label', 'link', 'list', 'loader', 'menu', 'modal',
    'nav', 'pagination', 'popover', 'radio', 'select', 'skeleton',
    'slider', 'spinner', 'stack', 'stepper', 'switch', 'tab', 'tabs',
    'table', 'tag', 'text', 'textarea', 'toggle', 'tooltip', 'box',
  ];

  // Try core words first, then all words
  for (const wordSet of [coreWords, words]) {
    for (const noun of UI_NOUNS) {
      if (wordSet.includes(noun)) return noun;
      // Partial match: a word contains the noun (e.g. "buttons" -> "button")
      for (const w of wordSet) {
        if (w === noun || w.startsWith(noun)) return noun;
      }
    }
  }

  return null;
}

/**
 * Extract a component name from a file path, trying index files intelligently.
 */
export function componentNameFromPath(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  const fileName = parts[parts.length - 1].replace(/\.(tsx|jsx|ts|js)$/, '');

  if (fileName === 'index' && parts.length >= 2) {
    // Use parent folder name for index files
    return parts[parts.length - 2];
  }
  return fileName;
}
