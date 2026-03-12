import * as fs from 'fs';
import * as path from 'path';
import { parse } from '@babel/parser';
import { ComponentProfile, ImportInfo } from '../types';
import { componentNameFromPath } from '../utils/normalizeComponentName';

// Known color CSS properties
const COLOR_PROPS = new Set([
  'color', 'background', 'backgroundcolor', 'bgcolor',
  'bordercolor', 'outlinecolor', 'fill', 'stroke',
  'boxshadow',
]);

// Known spacing/sizing CSS properties
const SPACING_PROPS = new Set([
  'margin', 'margintop', 'marginbottom', 'marginleft', 'marginright',
  'marginx', 'marginy', 'mx', 'my', 'mt', 'mb', 'ml', 'mr',
  'padding', 'paddingtop', 'paddingbottom', 'paddingleft', 'paddingright',
  'paddingx', 'paddingy', 'px', 'py', 'pt', 'pb', 'pl', 'pr',
  'top', 'bottom', 'left', 'right',
  'width', 'height', 'minwidth', 'maxwidth', 'minheight', 'maxheight',
  'gap', 'rowgap', 'columngap',
  'fontsize', 'lineheight', 'letterspacing', 'borderradius',
  'borderwidth', 'border',
]);

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_COLOR_RE = /^rgba?\(/;

// ─── Simple AST walker ────────────────────────────────────────────────────────

type Visitor = (node: any, parent: any) => void;

function walk(node: any, visitor: Visitor, parent: any = null): void {
  if (!node || typeof node !== 'object') return;
  visitor(node, parent);
  for (const key of Object.keys(node)) {
    if (key === 'parent' || key === 'loc' || key === 'start' || key === 'end' || key === 'range') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === 'object' && item.type) {
          walk(item, visitor, node);
        }
      }
    } else if (child && typeof child === 'object' && child.type) {
      walk(child, visitor, node);
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getJsxElementName(nameNode: any): string | null {
  if (!nameNode) return null;
  if (nameNode.type === 'JSXIdentifier') return nameNode.name;
  if (nameNode.type === 'JSXMemberExpression') {
    return `${getJsxElementName(nameNode.object)}.${nameNode.property.name}`;
  }
  return null;
}

function isHardcodedColor(value: string): boolean {
  return HEX_COLOR_RE.test(value.trim()) || RGB_COLOR_RE.test(value.trim().toLowerCase());
}

function analyzeStyleObject(
  objNode: any,
  result: { hardcodedColors: string[]; hardcodedSpacingCount: number }
): void {
  if (!objNode || objNode.type !== 'ObjectExpression') return;

  for (const prop of objNode.properties || []) {
    if (prop.type !== 'ObjectProperty' && prop.type !== 'Property') continue;

    const keyName =
      prop.key?.name?.toLowerCase() ||
      prop.key?.value?.toLowerCase() ||
      '';

    const val = prop.value;

    // Hardcoded color check
    if (COLOR_PROPS.has(keyName)) {
      if (val?.type === 'StringLiteral' || val?.type === 'Literal') {
        const strVal = val.value as string;
        if (typeof strVal === 'string' && isHardcodedColor(strVal)) {
          result.hardcodedColors.push(strVal);
        }
      }
    }

    // Hardcoded spacing check (numeric literals on spacing properties)
    if (SPACING_PROPS.has(keyName)) {
      if (val?.type === 'NumericLiteral' || (val?.type === 'Literal' && typeof val.value === 'number')) {
        const num = val.value as number;
        // Only flag non-zero values that look like raw pixel values (not 0, 1, -1)
        if (num !== 0 && Math.abs(num) > 1) {
          result.hardcodedSpacingCount++;
        }
      }
      // Also catch string pixel values like "13px"
      if (val?.type === 'StringLiteral' || (val?.type === 'Literal' && typeof val.value === 'string')) {
        const strVal = val.value as string;
        if (typeof strVal === 'string' && /^\d+px$/.test(strVal)) {
          result.hardcodedSpacingCount++;
        }
      }
    }
  }
}

// ─── Main analyzer ────────────────────────────────────────────────────────────

export function analyzeFile(
  filePath: string,
  designSystemImports: string[]
): ComponentProfile | null {
  let source: string;
  try {
    source = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }

  let ast: any;
  try {
    ast = parse(source, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx', 'decorators-legacy', 'classProperties'],
      errorRecovery: true,
    });
  } catch {
    // If parsing fails entirely, skip the file
    return null;
  }

  const imports: ImportInfo[] = [];
  const jsxElements: string[] = [];
  const props: string[] = [];
  let exportedName: string | undefined;
  let inlineStyleCount = 0;
  let sxOverrideCount = 0;
  const hardcodedColors: string[] = [];
  let hardcodedSpacingCount = 0;

  walk(ast, (node) => {
    // ── Collect imports ──
    if (node.type === 'ImportDeclaration') {
      const source = node.source?.value as string;
      const specifiers: string[] = (node.specifiers || []).map((s: any) => {
        if (s.type === 'ImportDefaultSpecifier') {
          // Use the local binding name — e.g. `import PrimaryButton from '...'` → 'PrimaryButton'
          return s.local?.name || 'default';
        }
        if (s.type === 'ImportNamespaceSpecifier') return '*';
        return s.imported?.name || s.local?.name || '';
      });
      imports.push({ source, specifiers });
    }

    // ── Collect exported component name ──
    if (node.type === 'ExportDefaultDeclaration') {
      const decl = node.declaration;
      if (decl?.type === 'FunctionDeclaration' && decl.id?.name) {
        exportedName = decl.id.name;
      } else if (decl?.type === 'Identifier') {
        exportedName = decl.name;
      } else if (
        (decl?.type === 'ArrowFunctionExpression' || decl?.type === 'FunctionExpression') &&
        decl.id?.name
      ) {
        exportedName = decl.id.name;
      }
    }

    // Named exports
    if (node.type === 'ExportNamedDeclaration' && !exportedName) {
      const decl = node.declaration;
      if (decl?.type === 'FunctionDeclaration' && decl.id?.name) {
        if (/^[A-Z]/.test(decl.id.name)) exportedName = decl.id.name;
      }
      if (decl?.type === 'VariableDeclaration') {
        for (const declarator of decl.declarations || []) {
          if (
            declarator.id?.name &&
            /^[A-Z]/.test(declarator.id.name) &&
            (declarator.init?.type === 'ArrowFunctionExpression' ||
              declarator.init?.type === 'FunctionExpression')
          ) {
            if (!exportedName) exportedName = declarator.id.name;
          }
        }
      }
    }

    // ── Collect props from function parameters ──
    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'ArrowFunctionExpression' ||
      node.type === 'FunctionExpression'
    ) {
      const firstParam = node.params?.[0];
      if (firstParam?.type === 'ObjectPattern') {
        for (const prop of firstParam.properties || []) {
          const name = prop.key?.name || prop.key?.value;
          if (name) props.push(name);
        }
      }
      // Props typed as an identifier (e.g. function Button(props: ButtonProps))
    }

    // ── Collect JSX elements ──
    if (node.type === 'JSXOpeningElement' || node.type === 'JSXSelfClosingElement') {
      const name = getJsxElementName(node.name);
      if (name && /^[A-Z]/.test(name)) {
        jsxElements.push(name);
      }
    }

    // ── Detect inline styles and sx overrides ──
    if (node.type === 'JSXAttribute') {
      const attrName = node.name?.name as string;

      if (attrName === 'style') {
        // style={{ ... }}
        const expr = node.value;
        if (expr?.type === 'JSXExpressionContainer') {
          const obj = expr.expression;
          if (obj?.type === 'ObjectExpression') {
            inlineStyleCount++;
            analyzeStyleObject(obj, { hardcodedColors, hardcodedSpacingCount: 0 });
            // Re-count spacing from the same object
            const spacingResult = { hardcodedColors: [], hardcodedSpacingCount: 0 };
            analyzeStyleObject(obj, spacingResult);
            hardcodedSpacingCount += spacingResult.hardcodedSpacingCount;
          }
        }
      }

      if (attrName === 'sx') {
        const expr = node.value;
        if (expr?.type === 'JSXExpressionContainer') {
          const obj = expr.expression;
          if (obj?.type === 'ObjectExpression') {
            sxOverrideCount++;
            const styleResult = { hardcodedColors: [] as string[], hardcodedSpacingCount: 0 };
            analyzeStyleObject(obj, styleResult);
            hardcodedColors.push(...styleResult.hardcodedColors);
            hardcodedSpacingCount += styleResult.hardcodedSpacingCount;
          }
        }
      }
    }
  });

  const componentName = exportedName || componentNameFromPath(filePath);
  const fileName = path.basename(filePath);

  // Determine if this component wraps an approved design system component
  const approvedBaseComponents: string[] = [];

  for (const importInfo of imports) {
    const isApproved = designSystemImports.some((ds) =>
      importInfo.source.startsWith(ds)
    );
    if (isApproved) {
      // Include all specifiers — after the previous fix, default imports now carry
      // their local binding name (e.g. 'MuiButton'), so filter out only '*'
      approvedBaseComponents.push(...importInfo.specifiers.filter((s) => s !== '*'));
    }
  }

  const wrapsApprovedComponent =
    approvedBaseComponents.length > 0 &&
    approvedBaseComponents.some((base) =>
      jsxElements.some((el) => el === base || el.endsWith(`.${base}`))
    );

  return {
    filePath,
    fileName,
    componentName,
    exportedName,
    props: [...new Set(props)],
    imports,
    jsxElements: [...new Set(jsxElements)],
    wrapsApprovedComponent,
    approvedBaseComponents,
    inlineStyleCount,
    sxOverrideCount,
    hardcodedColors,
    hardcodedSpacingCount,
  };
}
