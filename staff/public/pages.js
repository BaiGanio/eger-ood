// Page split of the customer table (specs D24). The page has all customers;
// only the rows of one page are drawn. No DOM here, so the tests can run it.

export const PAGE_SIZES = [25, 50, 100];

// The number of pages. An empty list has one (empty) page.
export function pageCount(total, size) {
  return Math.max(1, Math.ceil(total / size));
}

// A page number that exists, for a list that got shorter (example: a delete).
export function clampPage(page, total, size) {
  return Math.min(Math.max(1, page), pageCount(total, size));
}

// The page buttons: the first, the last, and two on each side of the
// present page. `null` is a gap ("…"). A gap of one page shows that page.
export function pageButtons(page, count) {
  const keep = new Set([1, count]);
  for (let p = page - 2; p <= page + 2; p++) if (p >= 1 && p <= count) keep.add(p);
  const sorted = [...keep].sort((a, b) => a - b);
  const out = [];
  for (const p of sorted) {
    const last = out[out.length - 1];
    if (last != null && p - last === 2) out.push(last + 1);
    else if (last != null && p - last > 2) out.push(null);
    out.push(p);
  }
  return out;
}
