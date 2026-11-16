// Input checks. Pure functions (specs section 6).
//
// A request body is not trusted. Each function takes only the fields it knows
// and ignores all others. It returns `{ value }` or `{ error }`. The error is
// a Bulgarian text that the user can see.

import { isDateText } from './dates.js';
import { normalizePlate, unknownTemplateNames } from '../public/sms-text.js';

/** E.164 phone: "+", country code, 8 to 15 digits in all. */
export const PHONE = /^\+[1-9]\d{7,14}$/;

export const TEMPLATE_MAX = 500;
// More than any real list. It only stops a request that fills the file.
export const HOLIDAYS_MAX = 500;
const PRICE_MAX = 100;

// The only fields that a request can set, with the longest text for each.
const CUSTOMER_FIELDS = {
  name: 100, phone: 20, address: 200, carModel: 100, carPlate: 20, lastServiceDate: 10,
};

// A Bulgarian plate has only the 12 letters that look the same in both
// alphabets. The staff can type them on the Cyrillic keyboard. For the
// compare, a Cyrillic letter counts as its Latin twin.
const CYRILLIC_TWINS = {
  'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H',
  'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'У': 'Y', 'Х': 'X',
};

/** The form of a plate for a compare only. The saved plate stays as typed. */
export function plateKey(plate) {
  return normalizePlate(plate).replace(/[АВЕКМНОРСТУХ]/g, letter => CYRILLIC_TWINS[letter]);
}

/** The customer who has this plate, or null. `exceptId`: the row in edit. */
export function samePlateCustomer(customers, plate, exceptId = null) {
  const key = plateKey(plate);
  return customers.find(c => c.id !== exceptId && plateKey(c.carPlate) === key) ?? null;
}

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Check the customer fields of a request body.
 *
 * `existing` is the saved customer for an edit, null for a new customer. A
 * field that the body does not have keeps its saved value. `today` is
 * "YYYY-MM-DD". `customers` are the saved customers: one plate = one row
 * (specs D28).
 */
export function checkCustomer(body, { existing = null, today, customers = [] }) {
  if (!isObject(body)) return { error: 'Невалидна заявка.' };

  const value = {};
  for (const [field, max] of Object.entries(CUSTOMER_FIELDS)) {
    const given = Object.hasOwn(body, field) ? body[field] : existing?.[field] ?? '';
    if (typeof given !== 'string') return { error: 'Невалидна заявка.' };
    value[field] = given.trim();
    if (value[field].length > max) return { error: 'Текстът в някое от полетата е твърде дълъг.' };
  }

  // The same clean-up as for a row that comes from the Excel file.
  value.phone = value.phone.replace(/[\s-]/g, '');
  value.carPlate = normalizePlate(value.carPlate);

  if (!value.name || !value.phone || !value.carModel || !value.carPlate || !value.lastServiceDate) {
    return { error: 'Попълнете всички задължителни полета.' };
  }
  if (!PHONE.test(value.phone)) {
    return { error: 'Телефонът трябва да е във вида +359881234567.' };
  }
  if (!isDateText(value.lastServiceDate)) {
    return { error: 'Датата на последния преглед не е валидна.' };
  }
  // A date that is already in the file stays editable: the staff must be able
  // to correct the other fields of that row.
  const dateChanged = value.lastServiceDate !== existing?.lastServiceDate;
  if (dateChanged && value.lastServiceDate > today) {
    return { error: 'Датата на последния преглед не може да е в бъдещето.' };
  }
  const twin = samePlateCustomer(customers, value.carPlate, existing?.id ?? null);
  if (twin) {
    return {
      error: `Вече има клиент с рег. номер ${twin.carPlate}: ${twin.name}. ` +
        'Един автомобил се записва само един път.',
    };
  }
  return { value };
}

/** Check the holiday list. The value has no doubles and is in date order. */
export function checkHolidays(holidays) {
  if (!Array.isArray(holidays) || holidays.length > HOLIDAYS_MAX) {
    return { error: 'Списъкът с почивни дни не е валиден.' };
  }
  if (!holidays.every(isDateText)) {
    return { error: 'В списъка с почивни дни има невалидна дата.' };
  }
  return { value: [...new Set(holidays)].sort() };
}

/**
 * Check the SMS template and the price.
 * `unknownNames` are the `{{…}}` names that the app does not fill. They are a
 * warning, not an error: the text is saved.
 */
export function checkTemplate(body) {
  if (!isObject(body) || typeof body.template !== 'string' || !body.template.trim()) {
    return { error: 'Шаблонът е празен.' };
  }
  if (body.template.length > TEMPLATE_MAX) {
    return { error: `Шаблонът е твърде дълъг. Най-много ${TEMPLATE_MAX} знака.` };
  }
  const price = body.pricePerSegment;
  const priceOk = typeof price === 'number' && Number.isFinite(price) && price >= 0 && price <= PRICE_MAX;
  return {
    value: {
      template: body.template,
      // A price that is not valid changes nothing.
      pricePerSegment: priceOk ? price : null,
    },
    unknownNames: unknownTemplateNames(body.template),
  };
}
