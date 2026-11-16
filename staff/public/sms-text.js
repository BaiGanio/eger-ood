// ─── SMS text helpers ────────────────────────────────────────────────────────
// Shared by the engine (lib/sms.js) and the browser (see index.html).
//
// Why this exists: a Cyrillic message is sent as UCS-2, so ONE SMS holds only
// 70 characters, not 160. Go over that and the carrier bills two messages, over
// 134 and it bills three. The counter in the dashboard uses this to show the
// real cost before anything is sent.

const GSM_BASIC = new Set((
    '@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡'
  + 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
  + '\n\r'
).split(''));

// These cost 2 characters each (escape + character).
const GSM_EXT = new Set(['\f', '^', '{', '}', '\\', '[', '~', ']', '|', '€']);

const GSM_SINGLE = 160, GSM_MULTI = 153;   // multipart steals 7 chars for the header
const UCS_SINGLE =  70, UCS_MULTI =  67;

/**
 * Work out how a message will actually be billed.
 * Returns { encoding, chars, billedUnits, segments, limit, over }
 *   chars       — characters a human sees
 *   billedUnits — what the carrier counts (GSM extended chars count twice)
 *   segments    — how many SMS this becomes, i.e. how many times you pay
 *   over        — the count that the text went over to cost this many SMS
 *                 (Cyrillic: 70, 134, 201…; Latin only: 160, 306…), or null
 *                 for one SMS. The warning in the dashboard shows it.
 */
export function measureSms(text) {
  const str = String(text ?? '');

  let units = 0, isGsm = true;
  for (const ch of str) {
    if (GSM_BASIC.has(ch))    { units += 1; continue; }
    if (GSM_EXT.has(ch))      { units += 2; continue; }
    isGsm = false;
    break;
  }

  if (!isGsm) units = str.length;          // UTF-16 code units, what UCS-2 bills

  const single = isGsm ? GSM_SINGLE : UCS_SINGLE;
  const multi  = isGsm ? GSM_MULTI  : UCS_MULTI;
  const segments = units === 0 ? 1 : (units <= single ? 1 : Math.ceil(units / multi));

  return {
    encoding: isGsm ? 'GSM-7' : 'UCS-2',
    chars: [...str].length,
    billedUnits: units,
    segments,
    limit: segments === 1 ? single : multi,
    over: segments === 1 ? null : (segments === 2 ? single : (segments - 1) * multi)
  };
}

/** "YYYY-MM-DD" → "DD.MM.YYYY". */
export function formatDateBg(dateText) {
  // By hand, not with toLocaleDateString('bg-BG'): that adds " г.", which
  // reads badly ("2026 г..") and uses 3 of the 70 characters.
  const [y, m, d] = String(dateText ?? '').split('-');
  return d ? `${d}.${m}.${y}` : '';
}

/** "pb 1234 ab" → "PB1234AB". The staff want the plate written as one word. */
export function normalizePlate(plate) {
  return String(plate ?? '').replace(/\s+/g, '').toUpperCase();
}

// The staff see and type the Bulgarian names. The English names stay, so a
// template that was saved before the change still fills.
const TEMPLATE_KEYS = {
  'име': 'name',      name: 'name',
  'модел': 'carModel', carModel: 'carModel',
  'номер': 'carPlate', carPlate: 'carPlate',
  'дата': 'serviceDate', serviceDate: 'serviceDate',
  'телефон': 'phone',  phone: 'phone',
};

// Not `\w`: it does not match Cyrillic letters.
const TEMPLATE_NAME = /{{([^{}\s]+)}}/g;

/** The `{{…}}` names in the template that the app does not fill. No doubles. */
export function unknownTemplateNames(template) {
  const names = [...String(template ?? '').matchAll(TEMPLATE_NAME)].map(m => m[1]);
  return [...new Set(names.filter(name => !Object.hasOwn(TEMPLATE_KEYS, name)))];
}

/** Put the customer's values into the template. */
export function fillTemplate(template, customer) {
  const values = {
    name: customer.name,
    carModel: customer.carModel,
    // Old rows can still have spaces in the plate.
    carPlate: normalizePlate(customer.carPlate),
    serviceDate: formatDateBg(customer.nextServiceDate),
    phone: customer.phone,
  };
  // One pass: a value that has "{{…}}" in it is not filled a second time.
  return String(template ?? '').replace(TEMPLATE_NAME, (whole, key) => {
    const field = Object.hasOwn(TEMPLATE_KEYS, key) ? TEMPLATE_KEYS[key] : null;
    return field ? String(values[field] ?? '') : whole;
  });
}
