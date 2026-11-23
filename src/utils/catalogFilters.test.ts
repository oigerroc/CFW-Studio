import test from 'node:test';
import assert from 'node:assert/strict';
import { HANDHELD_OS_CATALOG } from '../data/osCatalog';
import { filterAndSortOsCatalog, getUniqueDeviceModels } from './catalogFilters';

test('getUniqueDeviceModels puts TrimUI Brick first, excludes NX device, and includes Powkiddy Linux devices', () => {
  const models = getUniqueDeviceModels(HANDHELD_OS_CATALOG);
  assert.equal(models[0], 'TrimUI Brick');
  assert.ok(models.includes('Miyoo A30'));
  assert.ok(models.includes('Anbernic RG35XX Plus / H / SP'));
  assert.ok(models.includes('Powkiddy RGB30'));
  assert.ok(models.includes('Powkiddy X55'));
  assert.ok(models.includes('Powkiddy V10'));
  assert.equal(models.some((m) => m.includes('NX Handheld')), false);
});

test('filterAndSortOsCatalog filters cleanly by TrimUI Brick device model and includes nxRedux', () => {
  const brickList = filterAndSortOsCatalog(HANDHELD_OS_CATALOG, {
    query: '',
    methodFilter: 'all',
    deviceModel: 'TrimUI Brick',
    sortBy: 'name',
    sortDirection: 'asc',
  });

  assert.ok(brickList.length >= 6);
  for (const os of brickList) {
    assert.ok(os.devices.some((d) => d.name === 'TrimUI Brick'));
  }
  assert.equal(brickList.some((os) => os.id === 'nxredux'), true);
  assert.equal(brickList.some((os) => os.id === 'onionos'), false);
});

test('filterAndSortOsCatalog sorts by recommendedCardGb and imageSizeBytes', () => {
  const byCardAsc = filterAndSortOsCatalog(HANDHELD_OS_CATALOG, {
    query: '',
    methodFilter: 'all',
    deviceModel: 'all',
    sortBy: 'recommendedCardGb',
    sortDirection: 'asc',
  });
  for (let i = 1; i < byCardAsc.length; i++) {
    assert.ok(byCardAsc[i].recommendedCardGb >= byCardAsc[i - 1].recommendedCardGb);
  }

  const bySizeDesc = filterAndSortOsCatalog(HANDHELD_OS_CATALOG, {
    query: '',
    methodFilter: 'all',
    deviceModel: 'all',
    sortBy: 'imageSizeBytes',
    sortDirection: 'desc',
  });
  for (let i = 1; i < bySizeDesc.length; i++) {
    assert.ok(bySizeDesc[i].imageSizeBytes <= bySizeDesc[i - 1].imageSizeBytes);
  }
});

test('filterAndSortOsCatalog searches across known issues and flashing instructions', () => {
  const ledMatches = filterAndSortOsCatalog(HANDHELD_OS_CATALOG, {
    query: 'LED',
    methodFilter: 'all',
    deviceModel: 'TrimUI Brick',
    sortBy: 'name',
    sortDirection: 'asc',
  });
  assert.ok(ledMatches.length >= 2);
});

test('filterAndSortOsCatalog brandFilter anbernic excludes incompatible OSes', () => {
  const anbernicList = filterAndSortOsCatalog(HANDHELD_OS_CATALOG, {
    query: '',
    methodFilter: 'all',
    deviceModel: 'all',
    brandFilter: 'anbernic',
    sortBy: 'name',
    sortDirection: 'asc',
  });

  assert.equal(anbernicList.length, 6);
  for (const os of anbernicList) {
    assert.ok(os.devices.some((d) => d.name.startsWith('Anbernic')));
  }
  assert.equal(anbernicList.some((os) => os.id === 'nxredux'), false);
  assert.equal(anbernicList.some((os) => os.id === 'onionos'), false);
});

test('filterAndSortOsCatalog brandFilter powkiddy matches Powkiddy Linux OSes only', () => {
  const powkiddyList = filterAndSortOsCatalog(HANDHELD_OS_CATALOG, {
    query: '',
    methodFilter: 'all',
    deviceModel: 'all',
    brandFilter: 'powkiddy',
    sortBy: 'name',
    sortDirection: 'asc',
  });

  assert.equal(powkiddyList.length, 4);
  for (const os of powkiddyList) {
    assert.ok(os.devices.some((d) => d.name.startsWith('Powkiddy')));
  }
  assert.equal(powkiddyList.some((os) => os.id === 'rocknix'), true);
  assert.equal(powkiddyList.some((os) => os.id === 'arkos'), true);
  assert.equal(powkiddyList.some((os) => os.id === 'amberelec'), true);
  assert.equal(powkiddyList.some((os) => os.id === 'knulli'), true);
  assert.equal(powkiddyList.some((os) => os.id === 'muos'), false);
  assert.equal(powkiddyList.some((os) => os.id === 'nxredux'), false);
});

test('filterAndSortOsCatalog brandFilter ayn-retroid matches Armada OS, ROCKNIX, and LineageOS', () => {
  const models = getUniqueDeviceModels(HANDHELD_OS_CATALOG);
  assert.ok(models.includes('AYN Odin 2 / Odin 2 Mini / Portal'));
  assert.ok(models.includes('AYN Odin (Base / Pro)'));
  assert.ok(models.includes('Retroid Pocket 6'));
  assert.ok(models.includes('Retroid Pocket 5'));
  assert.ok(models.includes('Retroid Pocket 4 / 4 Pro'));
  assert.ok(models.includes('Retroid Pocket Mini'));
  assert.ok(models.includes('Retroid Pocket Flip 2'));
  assert.ok(models.includes('Retroid Pocket 3+ / Flip'));

  const aynRetroidList = filterAndSortOsCatalog(HANDHELD_OS_CATALOG, {
    query: '',
    methodFilter: 'all',
    deviceModel: 'all',
    brandFilter: 'ayn-retroid',
    sortBy: 'name',
    sortDirection: 'asc',
  });

  assert.equal(aynRetroidList.length, 3);
  assert.deepEqual(
    aynRetroidList.map((os) => os.id),
    ['armadaos', 'lineageos', 'rocknix']
  );

  const rp6List = filterAndSortOsCatalog(HANDHELD_OS_CATALOG, {
    query: '',
    methodFilter: 'all',
    deviceModel: 'Retroid Pocket 6',
    sortBy: 'name',
    sortDirection: 'asc',
  });
  assert.deepEqual(
    rp6List.map((os) => os.id),
    ['armadaos', 'lineageos', 'rocknix']
  );

  const rp4List = filterAndSortOsCatalog(HANDHELD_OS_CATALOG, {
    query: '',
    methodFilter: 'all',
    deviceModel: 'Retroid Pocket 4 / 4 Pro',
    sortBy: 'name',
    sortDirection: 'asc',
  });
  assert.deepEqual(
    rp4List.map((os) => os.id),
    ['lineageos']
  );
});

