import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampProgressPercent,
  getFlashProgressMeta,
  isFlashingActive,
  isIndeterminateFlashPhase,
} from './flashProgress';

test('isFlashingActive identifies active and terminal phases accurately', () => {
  assert.equal(isFlashingActive('downloading'), true);
  assert.equal(isFlashingActive('preparing'), true);
  assert.equal(isFlashingActive('writing'), true);
  assert.equal(isFlashingActive('verifying'), true);

  assert.equal(isFlashingActive('idle'), false);
  assert.equal(isFlashingActive('completed'), false);
  assert.equal(isFlashingActive('error'), false);
});

test('isIndeterminateFlashPhase marks preparing, downloading, and unknown-size streams as indeterminate', () => {
  assert.equal(isIndeterminateFlashPhase('preparing', 'curated'), true);
  assert.equal(isIndeterminateFlashPhase('downloading', 'github'), true);
  assert.equal(isIndeterminateFlashPhase('writing', 'github', true), true);
  assert.equal(isIndeterminateFlashPhase('writing', 'github', false), false);
  assert.equal(isIndeterminateFlashPhase('writing', 'curated', false), false);
  assert.equal(isIndeterminateFlashPhase('verifying', 'curated'), false);
  assert.equal(isIndeterminateFlashPhase('completed', 'curated'), false);
});

test('clampProgressPercent clamps out-of-range and non-finite inputs', () => {
  assert.equal(clampProgressPercent(-12), 0);
  assert.equal(clampProgressPercent(42.6), 43);
  assert.equal(clampProgressPercent(145), 100);
  assert.equal(clampProgressPercent(Number.NaN), 0);
});

test('getFlashProgressMeta returns accessible indeterminate metadata for preparing and downloading', () => {
  const prep = getFlashProgressMeta('preparing', 4, 'curated');
  assert.equal(prep.active, true);
  assert.equal(prep.indeterminate, true);
  assert.equal(prep.ariaValueNow, undefined);
  assert.equal(prep.readout, 'Working…');
  assert.equal(prep.tone, 'info');

  const download = getFlashProgressMeta('downloading', 12, 'github');
  assert.equal(download.active, true);
  assert.equal(download.indeterminate, true);
  assert.equal(download.ariaValueNow, undefined);
  assert.equal(download.readout, 'Working…');
});

test('getFlashProgressMeta returns determinate percentage and tone for writing, verifying, completed, and error', () => {
  const writing = getFlashProgressMeta('writing', 64, 'local');
  assert.equal(writing.active, true);
  assert.equal(writing.indeterminate, false);
  assert.equal(writing.ariaValueNow, 64);
  assert.equal(writing.readout, '64%');

  const done = getFlashProgressMeta('completed', 100, 'curated');
  assert.equal(done.active, false);
  assert.equal(done.indeterminate, false);
  assert.equal(done.ariaValueNow, 100);
  assert.equal(done.tone, 'success');
  assert.equal(done.readout, '100%');

  const err = getFlashProgressMeta('error', 30, 'curated');
  assert.equal(err.active, false);
  assert.equal(err.tone, 'error');
  assert.equal(err.readout, 'Error');
});
