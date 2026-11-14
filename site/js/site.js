// ЕГЕР ООД — public site script (home page only): open/closed status, calendar, map.
// No visible text lives here. Each text is in the HTML, so a second language can be added (specs.md section 4).

// The station is in Bulgaria. A visitor abroad must see the Sofia day and time, not their own.
// Built from Intl parts, never from toISOString() (specs.md section 5).
function sofiaNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Sofia', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).formatToParts(new Date());
  const p = {};
  for (const part of parts) p[part.type] = part.value;
  const y = Number(p.year), m = Number(p.month), d = Number(p.day);
  return {
    year: y, month: m - 1, day: d,
    iso: `${p.year}-${p.month}-${p.day}`,
    dow: new Date(y, m - 1, d).getDay(),
    time: `${p.hour}:${p.minute}`
  };
}

function isoDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

async function loadHolidays() {
  try {
    const res = await fetch('holidays.json');
    if (!res.ok) throw new Error(`holidays.json: ${res.status}`);
    const data = await res.json();
    return data.holidays || [];
  } catch (err) {
    // Without the list the page still works; only holidays show as work days.
    console.warn(err);
    return [];
  }
}

// ── Open / closed status ─────────────────────────────────────────────
// data-sched="2,3,4,5=08:00-18:00;6=09:00-14:00"  (0 = Sunday)
function parseSchedule(text) {
  const byDay = {};
  for (const rule of text.split(';')) {
    const [days, hours] = rule.split('=');
    const [open, close] = hours.split('-');
    for (const day of days.split(',')) byDay[Number(day)] = { open, close };
  }
  return byDay;
}

function showStatus(holidays) {
  const now = sofiaNow();
  for (const row of document.querySelectorAll('[data-sched]')) {
    const today = parseSchedule(row.dataset.sched)[now.dow];
    const holiday = row.dataset.holidays === 'closed' && holidays.includes(now.iso);
    const open = Boolean(today) && !holiday && now.time >= today.open && now.time < today.close;
    row.querySelector('.status-open').hidden = !open;
    row.querySelector('.status-closed').hidden = open;
  }
}

// ── Calendar ─────────────────────────────────────────────────────────
function initCalendar(holidays) {
  const grid = document.getElementById('cal-grid');
  if (!grid) return;
  const label = document.getElementById('cal-month');
  const monthName = new Intl.DateTimeFormat(document.documentElement.lang || 'bg', { month: 'long' });
  const today = sofiaNow();
  let year = today.year, month = today.month;

  function render() {
    label.textContent = `${monthName.format(new Date(year, month, 1))} ${year}`;
    grid.replaceChildren();

    const firstDow = new Date(year, month, 1).getDay();
    const blanks = firstDow === 0 ? 6 : firstDow - 1;       // the week starts on Monday
    const days = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < blanks; i++) grid.appendChild(document.createElement('div'));

    for (let d = 1; d <= days; d++) {
      const iso = isoDate(year, month, d);
      const dow = new Date(year, month, d).getDay();
      let kind = 'work';
      if (iso === today.iso) kind = 'today';
      else if (iso < today.iso) kind = 'past';
      else if (dow === 0 || dow === 1) kind = 'off';
      else if (holidays.includes(iso)) kind = 'holiday';

      const cell = document.createElement('div');
      cell.className = `cal-day cal-${kind}`;
      cell.textContent = d;
      // Tooltip texts sit on the grid element in the HTML.
      const title = grid.dataset[`t${kind[0].toUpperCase()}${kind.slice(1)}`];
      if (title) cell.title = title;
      grid.appendChild(cell);
    }
  }

  document.getElementById('cal-prev').addEventListener('click', () => {
    if (month === 0) { month = 11; year--; } else month--;
    render();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    if (month === 11) { month = 0; year++; } else month++;
    render();
  });
  render();
}

// ── Map (specs.md D15) ───────────────────────────────────────────────
function initMap() {
  const el = document.getElementById('map');
  if (!el || !window.L) return;
  const pos = [Number(el.dataset.lat), Number(el.dataset.lon)];
  // One-finger drag on a phone would trap the page scroll; zoom buttons still work.
  const map = L.map(el, { scrollWheelZoom: false, dragging: !L.Browser.mobile })
    .setView(pos, Number(el.dataset.zoom));
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  L.marker(pos).addTo(map)
    .bindPopup(document.getElementById('map-popup').innerHTML).openPopup();
}

initMap();
loadHolidays().then((holidays) => {
  showStatus(holidays);
  initCalendar(holidays);
});
