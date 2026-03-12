import * as fs from 'fs';
import * as path from 'path';
import { DSAuditConfig } from '../types';
import { defaultConfig } from './defaultConfig';

export function loadConfig(configPath?: string, targetDir?: string): DSAuditConfig {
  const candidates = configPath
    ? [configPath]
    : [
        path.join(targetDir || process.cwd(), 'ui-drift.config.json'),
        path.join(process.cwd(), 'ui-drift.config.json'),
      ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, 'utf-8');
        const parsed = JSON.parse(raw);
        return deepMerge(defaultConfig, parsed);
      } catch (err) {
        console.warn(`⚠ Could not parse config at ${candidate}: ${(err as Error).message}`);
      }
    }
  }

  return { ...defaultConfig };
}

function deepMerge<T extends Record<string, any>>(base: T, override: Partial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(override) as (keyof T)[]) {
    const overrideVal = override[key];
    const baseVal = base[key];
    if (
      overrideVal !== null &&
      typeof overrideVal === 'object' &&
      !Array.isArray(overrideVal) &&
      typeof baseVal === 'object' &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(baseVal, overrideVal as any);
    } else if (overrideVal !== undefined) {
      result[key] = overrideVal as T[keyof T];
    }
  }
  return result;
}
