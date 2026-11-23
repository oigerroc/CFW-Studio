import test from 'node:test';
import assert from 'node:assert/strict';
import { HANDHELD_OS_CATALOG } from '../data/osCatalog';
import { suggestBestOsByDevice } from './osRecommender';

test('suggestBestOsByDevice recommends NextUI (balanced) and Knulli (features) for TrimUI Brick', () => {
  const balanced = suggestBestOsByDevice(HANDHELD_OS_CATALOG, 'TrimUI Brick', 'balanced');
  assert.ok(balanced);
  assert.equal(balanced.chipset, 'Allwinner A133P');
  assert.equal(balanced.primary.os.id, 'nextui');
  assert.ok(balanced.alternatives.some((a) => a.os.id === 'knulli'));

  const features = suggestBestOsByDevice(HANDHELD_OS_CATALOG, 'TrimUI Brick', 'features');
  assert.ok(features);
  assert.equal(features.primary.os.id, 'knulli');
});

test('suggestBestOsByDevice recommends muOS or Knulli for Anbernic H700 Linux devices', () => {
  const cubeBalanced = suggestBestOsByDevice(HANDHELD_OS_CATALOG, 'Anbernic RG CubeXX', 'balanced');
  assert.ok(cubeBalanced);
  assert.equal(cubeBalanced.chipset, 'Allwinner H700');
  assert.equal(cubeBalanced.primary.os.id, 'muos');

  const rg34xxFeatures = suggestBestOsByDevice(HANDHELD_OS_CATALOG, 'Anbernic RG34XX', 'features');
  assert.ok(rg34xxFeatures);
  assert.equal(rg34xxFeatures.primary.os.id, 'knulli');
});

test('suggestBestOsByDevice recommends ArkOS/ROCKNIX for RK3566 and AmberELEC/GarlicOS for legacy Anbernic models', () => {
  const rg353 = suggestBestOsByDevice(
    HANDHELD_OS_CATALOG,
    'Anbernic RG353V / VS / M / P',
    'balanced'
  );
  assert.ok(rg353);
  assert.equal(rg353.primary.os.id, 'arkos');
  assert.equal(rg353.alternatives[0].os.id, 'rocknix');

  const rgArc = suggestBestOsByDevice(HANDHELD_OS_CATALOG, 'Anbernic RG ARC-D / ARC-S', 'balanced');
  assert.ok(rgArc);
  assert.equal(rgArc.primary.os.id, 'rocknix');

  const rg351 = suggestBestOsByDevice(HANDHELD_OS_CATALOG, 'Anbernic RG351V / MP', 'beginner');
  assert.ok(rg351);
  assert.equal(rg351.primary.os.id, 'amberelec');

  const rg35xx2022 = suggestBestOsByDevice(
    HANDHELD_OS_CATALOG,
    'Anbernic RG35XX (2022 Original)',
    'balanced'
  );
  assert.ok(rg35xx2022);
  assert.equal(rg35xx2022.primary.os.id, 'garlicos');
});

test('suggestBestOsByDevice recommends ROCKNIX/ArkOS/AmberELEC for Powkiddy Linux devices', () => {
  const rgb30 = suggestBestOsByDevice(HANDHELD_OS_CATALOG, 'Powkiddy RGB30', 'balanced');
  assert.ok(rgb30);
  assert.equal(rgb30.chipset, 'Rockchip RK3566');
  assert.equal(rgb30.primary.os.id, 'rocknix');
  assert.ok(rgb30.alternatives.some((a) => a.os.id === 'arkos'));

  const x55 = suggestBestOsByDevice(HANDHELD_OS_CATALOG, 'Powkiddy X55', 'balanced');
  assert.ok(x55);
  assert.equal(x55.primary.os.id, 'rocknix');

  const v10 = suggestBestOsByDevice(HANDHELD_OS_CATALOG, 'Powkiddy V10', 'beginner');
  assert.ok(v10);
  assert.equal(v10.chipset, 'Rockchip RK3326');
  assert.equal(v10.primary.os.id, 'amberelec');
});

test('suggestBestOsByDevice recommends Armada OS, ROCKNIX, and LineageOS for AYN and Retroid devices', () => {
  const odin2 = suggestBestOsByDevice(
    HANDHELD_OS_CATALOG,
    'AYN Odin 2 / Odin 2 Mini / Portal',
    'balanced'
  );
  assert.ok(odin2);
  assert.equal(odin2.chipset, 'Snapdragon 8 Gen 2');
  assert.equal(odin2.primary.os.id, 'armadaos');
  assert.ok(odin2.alternatives.some((a) => a.os.id === 'rocknix'));
  assert.ok(odin2.alternatives.some((a) => a.os.id === 'lineageos'));

  const rp5 = suggestBestOsByDevice(HANDHELD_OS_CATALOG, 'Retroid Pocket 5', 'balanced');
  assert.ok(rp5);
  assert.equal(rp5.chipset, 'Snapdragon 865');
  assert.equal(rp5.primary.os.id, 'rocknix');
  assert.ok(rp5.alternatives.some((a) => a.os.id === 'armadaos'));
  assert.ok(rp5.alternatives.some((a) => a.os.id === 'lineageos'));

  const rp5Features = suggestBestOsByDevice(HANDHELD_OS_CATALOG, 'Retroid Pocket 5', 'features');
  assert.ok(rp5Features);
  assert.equal(rp5Features.primary.os.id, 'lineageos');

  const rp6 = suggestBestOsByDevice(HANDHELD_OS_CATALOG, 'Retroid Pocket 6', 'balanced');
  assert.ok(rp6);
  assert.equal(rp6.chipset, 'Snapdragon 8 Gen 2');
  assert.equal(rp6.primary.os.id, 'rocknix');
  assert.ok(rp6.alternatives.some((a) => a.os.id === 'armadaos'));
  assert.ok(rp6.alternatives.some((a) => a.os.id === 'lineageos'));

  const rp4 = suggestBestOsByDevice(HANDHELD_OS_CATALOG, 'Retroid Pocket 4 / 4 Pro', 'balanced');
  assert.ok(rp4);
  assert.equal(rp4.chipset, 'MediaTek Dimensity 900 / 1100');
  assert.equal(rp4.primary.os.id, 'lineageos');

  const rp3Plus = suggestBestOsByDevice(HANDHELD_OS_CATALOG, 'Retroid Pocket 3+ / Flip', 'balanced');
  assert.ok(rp3Plus);
  assert.equal(rp3Plus.primary.os.id, 'lineageos');
});

test('suggestBestOsByDevice returns null for removed NX device and unknown device names', () => {
  const nxRemoved = suggestBestOsByDevice(
    HANDHELD_OS_CATALOG,
    'NX Handheld (V1 / OLED / Lite)',
    'balanced'
  );
  assert.equal(nxRemoved, null);

  const unknown = suggestBestOsByDevice(HANDHELD_OS_CATALOG, 'Unknown Handheld XYZ', 'balanced');
  assert.equal(unknown, null);
});


