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

// Generic UI modifiers that do not indicate domain specificity
const GENERIC_MODIFIERS = [
  'primary', 'secondary', 'tertiary', 'ghost', 'outlined', 'outline', 'filled',
  'solid', 'flat', 'rounded', 'icon', 'link', 'split', 'arrow',
  'cta', 'base', 'custom', 'shared', 'common', 'app', 'main', 'default',
  'new', 'old', 'legacy', 'v2', 'v3', 'enhanced', 'extended', 'simple', 'basic',
  'small', 'large', 'medium', 'mini', 'compact', 'full', 'page', 'section',
  'widget', 'component', 'element', 'item', 'action', 'hero', 'promo',
  'global', 'local', 'inner', 'outer', 'wrapper', 'container', 'layout', 'styled',
  'feature', 'marketing', 'product', 'user', 'auth',
];

const UI_NOUNS = [
  'accordion', 'alert', 'avatar', 'badge', 'breadcrumb', 'button',
  'card', 'checkbox', 'chip', 'container', 'dialog', 'divider',
  'drawer', 'dropdown', 'form', 'grid', 'heading', 'icon',
  'input', 'label', 'link', 'list', 'loader', 'menu', 'modal',
  'nav', 'pagination', 'popover', 'radio', 'select', 'skeleton',
  'slider', 'spinner', 'stack', 'stepper', 'switch', 'tab', 'tabs',
  'table', 'tag', 'text', 'textarea', 'toggle', 'tooltip', 'box',
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

  // Sort longest-first so more specific nouns win over prefixes
  // (e.g. "table" must match before "tab", "stepper" before "step")
  const sortedNouns = [...UI_NOUNS].sort((a, b) => b.length - a.length);

  // Try core words first, then all words
  for (const wordSet of [coreWords, words]) {
    for (const noun of sortedNouns) {
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
 * Returns true if the component name looks like a primitive/generic UI component
 * (e.g. PrimaryButton, GhostCard) rather than a domain-specific feature component
 * (e.g. AcceptBookingButton, CreateEventModal).
 *
 * Splits the PascalCase name into words, removes the UI family noun and generic
 * modifiers, and returns false (feature component) if 2 or more non-generic domain
 * words remain.
 */
export function isPrimitiveLike(componentName: string): boolean {
  const words = componentName
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase()
    .split(/\s+/);

  // Remove UI nouns and generic modifiers — what's left are domain-specific words
  const domainWords = words.filter(
    (w) => !UI_NOUNS.some((n) => w === n || w.startsWith(n)) && !GENERIC_MODIFIERS.includes(w)
  );

  // 2+ domain-specific words = feature component, not a primitive
  return domainWords.length < 2;
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
