// Template fill and plate format (public/sms-text.js). Shared by engine and browser.

import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTemplate, normalizePlate } from '../public/sms-text.js';
import { DEFAULT_TEMPLATE } from '../lib/store.js';

const customer = {
  name: 'Иван Петров', carModel: 'VW Golf 7', carPlate: 'PB1234AB',
  nextServiceDate: '2026-11-24', phone: '+359881234567',
};

test('the Bulgarian template names fill', () => {
  assert.equal(
    fillTemplate('{{име}}|{{модел}}|{{номер}}|{{дата}}|{{телефон}}', customer),
    'Иван Петров|VW Golf 7|PB1234AB|24.11.2026|+359881234567');
});

test('the old English template names still fill', () => {
  assert.equal(
    fillTemplate('{{name}}|{{carModel}}|{{carPlate}}|{{serviceDate}}|{{phone}}', customer),
    'Иван Петров|VW Golf 7|PB1234AB|24.11.2026|+359881234567');
});

test('an unknown name, or a name of an object property, stays as it is', () => {
  assert.equal(fillTemplate('{{адрес}} {{toString}} {{ име }}', customer), '{{адрес}} {{toString}} {{ име }}');
});

test('a value with "{{…}}" in it is not filled a second time', () => {
  assert.equal(fillTemplate('{{име}}', { ...customer, name: '{{телефон}}' }), '{{телефон}}');
});

test('the default template uses the Bulgarian names and fills', () => {
  assert.match(DEFAULT_TEMPLATE, /{{номер}}/);
  assert.match(DEFAULT_TEMPLATE, /{{дата}}/);
  assert.equal(fillTemplate(DEFAULT_TEMPLATE, customer),
    'ЕГЕР ООД: ГТП на PB1234AB изтича 24.11.2026. Запазете час');
});

test('normalizePlate removes all spaces and makes capitals', () => {
  assert.equal(normalizePlate('PB 1234 AB'), 'PB1234AB');
  assert.equal(normalizePlate(' pb  1234\tab '), 'PB1234AB');
  assert.equal(normalizePlate('PB1234AB'), 'PB1234AB');
  assert.equal(normalizePlate(null), '');
  assert.equal(normalizePlate(undefined), '');
});

test('an old row with spaces in the plate gives the plate with no spaces in the SMS', () => {
  assert.equal(fillTemplate('ГТП на {{номер}}', { ...customer, carPlate: 'pb 1234 ab' }), 'ГТП на PB1234AB');
});
