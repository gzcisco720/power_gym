/**
 * Stage 12 repo-guard tests — validate zero banned UI primitives remain in
 * src/screens/ and src/components/ (excluding components/ui/ which owns primitives).
 */

import { readdirSync, readFileSync } from 'fs';
import path from 'path';

function collectTsxFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsxFiles(full));
    } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.spec.tsx') && !entry.name.endsWith('.test.tsx')) {
      files.push(full);
    }
  }
  return files;
}

// __dirname = src/screens/__tests__
const SCREENS_DIR = path.join(__dirname, '..');
// src/components
const COMPONENTS_DIR = path.join(__dirname, '..', '..', 'components');
const COMPONENTS_UI_DIR = path.join(COMPONENTS_DIR, 'ui');

describe('repo-guard: zero ActivityIndicator outside charts', () => {
  it('no <ActivityIndicator in screen or component files (except inside components/ui/)', () => {
    const screenFiles = collectTsxFiles(SCREENS_DIR);
    // Components outside components/ui/
    const componentFiles = collectTsxFiles(COMPONENTS_DIR).filter(
      (f) => !f.startsWith(COMPONENTS_UI_DIR),
    );

    const violations: string[] = [];

    for (const file of [...screenFiles, ...componentFiles]) {
      const content = readFileSync(file, 'utf-8');
      if (content.includes('<ActivityIndicator')) {
        violations.push(path.relative(SCREENS_DIR, file));
      }
    }

    expect(violations).toHaveLength(0);
  });
});

describe('repo-guard: zero raw button-Pressable usage', () => {
  it('no banned react-native imports (ActivityIndicator, Switch) used as UI in screen files', () => {
    const screenFiles = collectTsxFiles(SCREENS_DIR);

    const violations: string[] = [];

    for (const file of screenFiles) {
      const content = readFileSync(file, 'utf-8');
      // Check for ActivityIndicator used in JSX (import or JSX usage)
      if (content.includes('<ActivityIndicator')) {
        violations.push(`${path.relative(SCREENS_DIR, file)} [ActivityIndicator]`);
      }
      // Check for react-native Switch used in JSX (not the Reusables Switch from ~/components/ui/switch)
      // Reusables Switch is imported from '~/components/ui/switch'
      // A native Switch would be: import { ..., Switch, ... } from 'react-native'
      const nativeSwitchImport = /import\s*\{[^}]*\bSwitch\b[^}]*\}\s*from\s*['"]react-native['"]/;
      if (nativeSwitchImport.test(content) && content.includes('<Switch')) {
        violations.push(`${path.relative(SCREENS_DIR, file)} [native Switch]`);
      }
    }

    expect(violations).toHaveLength(0);
  });
});
