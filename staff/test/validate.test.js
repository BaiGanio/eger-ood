import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCustomer, checkHolidays, checkTemplate, TEMPLATE_MAX } from '../lib/validate.js';
import { unknownTemplateNames } from '../public/sms-text.js';

const TODAY = '2026-11-15';

const good = (extra = {}) => ({
  name: 'Test Client', phone: '+359880000001', address: '',
  carModel: 'Test Model', carPlate: 'PB0001TT', lastServiceDate: '2026-11-01',
  ...extra,
});

test('a good customer passes, with clean phone and plate', () => {
  const { value, error } = checkCustomer(
    good({ name: '  Test Client ', phone: '+359 88-000 0001', carPlate: 'pb 0001 tt' }), { today: TODAY });
  assert.equal(error, undefined);
  assert.equal(value.name, 'Test Client');
  assert.equal(value.phone, '+359880000001');
  assert.equal(value.carPlate, 'PB0001TT');
});

test('fields that are not on the list are ignored', () => {
  const { value } = checkCustomer(
    good({ id: 'x', smsSentAt: '2000-01-01', disabled: true, status: 'sent' }), { today: TODAY });
  assert.deepEqual(Object.keys(value).sort(),
    ['address', 'carModel', 'carPlate', 'lastServiceDate', 'name', 'phone']);
});

test('a bad phone gives a Bulgarian message', () => {
  for (const phone of ['0880000001', '+0880000001', '+35988', '+359880000001x', '359880000001']) {
    const { error } = checkCustomer(good({ phone }), { today: TODAY });
    assert.match(error, /Телефонът/, phone);
  }
});

test('a missing field, a wrong type and a long text are refused', () => {
  assert.ok(checkCustomer(good({ name: '  ' }), { today: TODAY }).error);
  assert.ok(checkCustomer(good({ name: { a: 1 } }), { today: TODAY }).error);
  assert.ok(checkCustomer(good({ name: 'a'.repeat(101) }), { today: TODAY }).error);
  assert.ok(checkCustomer(null, { today: TODAY }).error);
  assert.ok(checkCustomer([], { today: TODAY }).error);
});

test('the inspection date must be real and not in the future', () => {
  assert.ok(checkCustomer(good({ lastServiceDate: '2026-02-30' }), { today: TODAY }).error);
  assert.ok(checkCustomer(good({ lastServiceDate: '15.11.2026' }), { today: TODAY }).error);
  assert.match(checkCustomer(good({ lastServiceDate: '2026-11-16' }), { today: TODAY }).error, /бъдещето/);
  assert.equal(checkCustomer(good({ lastServiceDate: TODAY }), { today: TODAY }).error, undefined);
});

test('an edit keeps the saved value of a field that the body does not have', () => {
  const existing = { ...good(), id: 'c001', smsSentAt: null, disabled: false };
  const { value } = checkCustomer({ name: 'New Name' }, { existing, today: TODAY });
  assert.equal(value.name, 'New Name');
  assert.equal(value.phone, existing.phone);
  assert.equal(value.lastServiceDate, existing.lastServiceDate);
});

test('an edit can keep a future date that is already in the file, but cannot set one', () => {
  const existing = { ...good({ lastServiceDate: '2027-12-29' }), id: 'c001' };
  assert.equal(checkCustomer({ name: 'New Name' }, { existing, today: TODAY }).error, undefined);
  assert.ok(checkCustomer({ lastServiceDate: '2027-12-30' }, { existing, today: TODAY }).error);
});

test('holidays: real dates only, no doubles, in order', () => {
  assert.deepEqual(checkHolidays(['2026-12-25', '2026-03-03', '2026-12-25']).value,
    ['2026-03-03', '2026-12-25']);
  assert.ok(checkHolidays(['2026-02-30']).error);
  assert.ok(checkHolidays(['<script>']).error);
  assert.ok(checkHolidays([20261225]).error);
  assert.ok(checkHolidays('2026-12-25').error);
  assert.ok(checkHolidays(undefined).error);
});

test('template: not empty, not too long, unknown names are a warning', () => {
  assert.ok(checkTemplate({ template: '   ' }).error);
  assert.ok(checkTemplate({ template: 42 }).error);
  assert.ok(checkTemplate({ template: 'a'.repeat(TEMPLATE_MAX + 1) }).error);
  assert.equal(checkTemplate({ template: 'a'.repeat(TEMPLATE_MAX) }).error, undefined);

  const result = checkTemplate({ template: 'Hi {{име}} {{name}} {{имее}} {{plate}} {{plate}}', pricePerSegment: 0.2 });
  assert.equal(result.error, undefined);
  assert.deepEqual(result.unknownNames, ['имее', 'plate']);
  assert.equal(result.value.pricePerSegment, 0.2);
});

test('template: a price that is not valid changes nothing', () => {
  for (const pricePerSegment of [-1, '0.2', NaN, 1000, undefined]) {
    assert.equal(checkTemplate({ template: 'Hi', pricePerSegment }).value.pricePerSegment, null);
  }
});

test('unknownTemplateNames: all known names give an empty list', () => {
  assert.deepEqual(unknownTemplateNames('{{име}} {{модел}} {{номер}} {{дата}} {{телефон}} {{carPlate}}'), []);
});
