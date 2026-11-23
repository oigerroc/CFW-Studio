import test from 'node:test';
import assert from 'node:assert/strict';
import { HANDHELD_OS_CATALOG } from '../data/osCatalog';
import { DEFAULT_VIRTUAL_CARDS } from './usbMassStorage';
import {
  APP_DIFFERENTIATORS,
  PUBLIC_RELEASE_NOTICES,
  findTrademarkedVirtualTargets,
  validateCatalogCredits,
} from './releaseCompliance';

test('every listed OS in HANDHELD_OS_CATALOG includes verified creator credits, license, and HTTPS project link', () => {
  const report = validateCatalogCredits(HANDHELD_OS_CATALOG);
  assert.equal(report.valid, true, report.issues.join('; '));
  assert.equal(HANDHELD_OS_CATALOG.length, 14);
});

test('virtual OTG sample cards avoid third-party consumer SD card trademarks', () => {
  const flagged = findTrademarkedVirtualTargets(DEFAULT_VIRTUAL_CARDS);
  assert.deepEqual(flagged, []);
});

test('differentiation matrix and public release notices are populated for UI display', () => {
  assert.ok(APP_DIFFERENTIATORS.length >= 4);
  for (const row of APP_DIFFERENTIATORS) {
    assert.ok(row.capability.trim().length > 0);
    assert.ok(row.cfwStudio.trim().length > 0);
  }
  assert.ok(PUBLIC_RELEASE_NOTICES.length >= 4);
});
