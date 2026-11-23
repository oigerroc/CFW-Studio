import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveInitialTheme } from './themePreference';

test('resolveInitialTheme honors explicit stored preference over OS preference', () => {
  assert.equal(resolveInitialTheme('dark', false), 'dark');
  assert.equal(resolveInitialTheme('light', true), 'light');
});

test('resolveInitialTheme falls back to system prefers-color-scheme when unset or invalid', () => {
  assert.equal(resolveInitialTheme(null, true), 'dark');
  assert.equal(resolveInitialTheme(null, false), 'light');
  assert.equal(resolveInitialTheme('sepia', true), 'dark');
});
