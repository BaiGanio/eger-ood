// The dates of the practice page (practice.html, plan/15-manual-tests.md).
// A step needs a date near today, so the page works the date out: a wrong
// date gives a wrong status, and the staff then think the app is broken.
// A module: the server refuses inline scripts.

const pad = n => String(n).padStart(2, '0');

/**
 * The day `days` after `today`, moved by `years`, as "DD.MM.YYYY".
 * `today` is a Date. Local date parts only (specs section 5).
 * 29 Feb in a year that has none → 28 Feb, the same rule as the engine.
 */
export function practiceDate(today, days, years = 0) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
  const month = d.getMonth();
  d.setFullYear(d.getFullYear() + years);
  if (d.getMonth() !== month) d.setDate(0);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

// <span class="practice-date" data-days="3" data-years="-1">…</span>
// The text in the page is the rule in words. It stays if this file does not run.
if (typeof document !== 'undefined') {
  const today = new Date();
  for (const el of document.querySelectorAll('.practice-date')) {
    el.textContent = practiceDate(today, Number(el.dataset.days || 0), Number(el.dataset.years || 0));
  }
}
