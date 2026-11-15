// A module: the page has no inline script, so the Content-Security-Policy of
// the server can refuse each inline script (specs section 6).
import { measureSms, fillTemplate } from './sms-text.js';
import {
  COMING_PERIODS, OVERDUE_PERIODS, SEND_PERIODS, SENT_PERIODS,
  inComingList, inOverdueList, inSendList, inSentList,
} from './card-lists.js';
import { PAGE_SIZES, clampPage, pageButtons, pageCount } from './pages.js';

// ─── State ──────────────────────────────────────────────────────────
let customers = [];
let smsTemplate = '';
// The price has one home: the engine (lib/store.js). It comes with the template.
let pricePerSegment = 0;
// The day of the statuses on the page. See reloadOnNewDay().
let dataDay = null;
let holidays = [];
let pendingSendId = null;
// The banners that the staff closed (showBanner).
const closedBanners = new Set();
// The page of the customer table and its rows per page (pages.js). Until a reload.
let page = 1;
let pageSize = PAGE_SIZES[0];

// Order of the rows: what the staff must do first is on top.
const STATUS_ORDER = { due: 0, pending: 1, sent: 2, overdue: 3 };

// Bootstrap modal instances (initialised after DOM ready)
let bsCustomerModal, bsSmsPreviewModal;

// The sidebar state is set here, before the first paint, so the page does not jump.
applySidebar(readSidebarClosed());

// ─── Init ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  bsCustomerModal   = new bootstrap.Modal(document.getElementById('customer-modal'));
  bsSmsPreviewModal = new bootstrap.Modal(document.getElementById('sms-preview-modal'));
  document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
  // One listener for all buttons, also for the rows that are drawn later.
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el || !Object.hasOwn(ACTIONS, el.dataset.action)) return;
    ACTIONS[el.dataset.action](el.dataset.arg);
  });
  document.getElementById('search-input').addEventListener('input', renderFirstPage);
  document.getElementById('filter-status').addEventListener('change', renderFirstPage);
  document.getElementById('page-size').addEventListener('change', e => {
    const size = Number(e.target.value);
    if (PAGE_SIZES.includes(size)) pageSize = size;
    renderFirstPage();
  });
  document.getElementById('sms-template-input').addEventListener('input', updatePreview);
  document.getElementById('f-price').addEventListener('input', updatePreview);
  document.getElementById('var-chips').addEventListener('click', e => {
    const chip = e.target.closest('[data-var]');
    if (chip) insertVar(chip.dataset.var);
  });
  const askDialog = document.getElementById('ask-dialog');
  document.getElementById('ask-yes').addEventListener('click', () => askDialog.close('yes'));
  document.getElementById('ask-no').addEventListener('click', () => askDialog.close('no'));
  init();
  setInterval(tick, SERVER_CHECK_MS);
  // A browser slows down timers in a hidden tab. Check at once when the staff come back.
  window.addEventListener('focus', tick);
});

async function init() {
  await Promise.all([loadCustomers(), loadTemplate(), loadHolidays(), checkServer()]);
}

// ─── Server state ─────────────────────────────────────────────────────
// The page stays open when the server window is closed. Only a request to the
// server shows if it still runs, so the page asks every few seconds.
const SERVER_CHECK_MS = 5000;
let serverUp = null;   // null = not checked yet

// fetch() that also updates the server state. A server that does not answer
// gives a Bulgarian error, so each action shows a red toast.
async function serverFetch(url, options) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (e) {
    console.error(e);
    setServerUp(false);
    throw new Error('Сървърът е спрян. Стартирайте програмата отново.');
  }
  setServerUp(true);
  return res;
}

// One call to the engine. It gives the answer as an object, or throws the
// Bulgarian text of the server. Each write goes out as JSON: the server
// refuses a write of another type (lib/guard.js).
async function api(method, path, body) {
  const options = { method };
  if (method !== 'GET') {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body ?? {});
  }
  return readReply(await serverFetch(path, options));
}

// What a button with `data-action` starts. `data-arg` is the one argument.
const ACTIONS = {
  showView, openAddModal, openEditModal, closeModal, saveCustomer,
  previewSms, closeSmsPreviewModal, confirmSend, deleteCustomer,
  saveTemplate, addHoliday, removeHoliday, showCardList, setPeriod,
  closeBanner, goToPage,
};

async function tick() {
  await checkServer();
  reloadOnNewDay();
}

// The engine computes each status for its "today". A page that stays open
// over midnight would show the statuses of the day before.
function reloadOnNewDay() {
  if (dataDay !== null && dataDay !== localDateInDays(0) && serverUp) loadCustomers();
}

async function checkServer() {
  try {
    const res = await serverFetch('/api/status', { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    const data = await readReply(res);
    // With no Twilio keys no SMS can go out. The banner says so.
    showBanner('sms-off', data.smsMode !== 'live');
  } catch (e) {
    // No toast: this runs every few seconds. The red box and the banner show it.
    console.error(e);
  }
}

function setServerUp(up) {
  const wasDown = serverUp === false;
  if (up === serverUp) return;
  serverUp = up;

  const box  = document.getElementById('server-state');
  const text = up ? 'Сървърът работи' : 'Сървърът е спрян';
  box.classList.remove('server-unknown', 'server-ok', 'server-down');
  box.classList.add(up ? 'server-ok' : 'server-down');
  box.title = text;
  document.getElementById('server-state-text').textContent = text;
  showBanner('server-down', !up);

  // The staff started the server again: show the data of now.
  if (up && wasDown) {
    toast('Сървърът работи отново', 'success');
    init();
  }
}

// ─── Sidebar ──────────────────────────────────────────────────────────
function readSidebarClosed() {
  try { return localStorage.getItem('sidebar') === 'closed'; }
  catch (e) { console.error(e); return false; }
}

function applySidebar(closed) {
  document.body.classList.toggle('sidebar-closed', closed);
  const btn = document.getElementById('sidebar-toggle');
  if (!btn) return;
  const label = closed ? 'Покажи менюто' : 'Скрий менюто';
  btn.title = label;
  btn.setAttribute('aria-label', label);
  btn.setAttribute('aria-expanded', String(!closed));
  btn.querySelector('.sidebar-label').textContent = label;
}

function toggleSidebar() {
  const closed = !document.body.classList.contains('sidebar-closed');
  applySidebar(closed);
  try { localStorage.setItem('sidebar', closed ? 'closed' : 'open'); }
  catch (e) { console.error(e); }
}

async function loadCustomers() {
  // Set before the answer: a load that fails must not start again every few seconds.
  dataDay = localDateInDays(0);
  try {
    const data = await api('GET', '/api/customers');
    customers  = data.customers || [];
    showBanner('data-error', false);
    refresh();
    loadDataProblems();
  } catch (e) {
    // The message stays on the page: a toast is gone after a few seconds.
    document.getElementById('data-error-text').textContent = e.message;
    showBanner('data-error', true);
    toast('Грешка при зареждане на клиентите: ' + e.message, 'danger');
  }
}

// Draw all that shows the customer list.
function refresh() {
  renderTable();
  renderStats();
}

// The answer of the server as an object. A failed request throws the
// Bulgarian text that the server sent (example: "Затворете файла в Excel…").
async function readReply(res) {
  let data = {};
  try { data = await res.json(); } catch (e) { /* no JSON body: the status decides */ }
  if (!res.ok) throw new Error(data.error || 'Сървърът върна грешка.');
  return data;
}

// Rows of the Excel file that did not load. The staff correct them in Excel.
async function loadDataProblems() {
  try {
    const data = await api('GET', '/api/data-problems');
    renderDataProblems(data.problems || []);
  } catch (e) {
    toast('Грешка при проверка на файла: ' + e.message, 'danger');
  }
}

function renderDataProblems(problems) {
  showBanner('data-problems', problems.length > 0);
  document.getElementById('data-problems-list').innerHTML = problems.map(p => `
    <li>Лист „${escHtml(p.sheet)}“${p.row ? `, ред ${escHtml(p.row)}` : ''}: ${escHtml(p.reason)}</li>
  `).join('');
}

async function loadTemplate() {
  try {
    const data = await api('GET', '/api/template');
    smsTemplate     = data.template || '';
    pricePerSegment = Number.isFinite(data.pricePerSegment) ? data.pricePerSegment : 0;

    document.getElementById('sms-template-input').value = smsTemplate;
    document.getElementById('f-price').value            = pricePerSegment;
    updatePreview();
  } catch (e) {
    toast('Грешка при зареждане на шаблона: ' + e.message, 'danger');
  }
}

async function loadHolidays() {
  try {
    const data = await api('GET', '/api/holidays');
    holidays = data.holidays || [];
    renderHolidays();
  } catch (e) {
    toast('Грешка при зареждане на почивните дни: ' + e.message, 'danger');
  }
}

// ─── View switcher ───────────────────────────────────────────────────
function showView(name) {
  document.getElementById('view-dashboard').style.display = name === 'dashboard' ? 'block' : 'none';
  document.getElementById('view-settings').style.display  = name === 'settings'  ? 'block' : 'none';

  const navDash = document.getElementById('nav-dashboard');
  const navSet  = document.getElementById('nav-settings');

  navDash.classList.toggle('active',    name === 'dashboard');
  navDash.classList.toggle('text-secondary', name !== 'dashboard');
  navSet.classList.toggle('active',     name === 'settings');
  navSet.classList.toggle('text-secondary',  name !== 'settings');
}

// ─── Banners ─────────────────────────────────────────────────────────
// The staff can close a banner when they know the problem. The checks run
// again every few seconds, so a closed banner must not come back at once.
// It comes back after a reload, or when its problem goes away and comes again.
function showBanner(id, problem) {
  if (!problem) closedBanners.delete(id);
  document.getElementById(id).classList.toggle('d-none', !problem || closedBanners.has(id));
}

function closeBanner(id) {
  if (!document.getElementById(id)?.classList.contains('alert')) return;
  closedBanners.add(id);
  document.getElementById(id).classList.add('d-none');
}

// ─── Cards with a list (card-lists.js) ───────────────────────────────
// A click on the card shows its customers. The buttons row changes the period;
// the card count changes with it. Before a holiday the staff send in advance
// with a longer period. The card keeps the chosen period, so its number and
// its list stay the same. The key is also the value in the status filter.
// `period` lives until a reload (specs D22).
const CARDS = {
  send:    { stat: 'stat-pending', periods: SEND_PERIODS,    period: 0, ahead: true,
             has: (c, p) => inSendList(c, localDateInDays(p)) },
  sentin:  { stat: 'stat-sent',    periods: SENT_PERIODS,    period: 0, ahead: false,
             has: (c, p) => inSentList(c, localDateInDays(-p)) },
  coming:  { stat: 'stat-coming',  periods: COMING_PERIODS,  period: 0, ahead: true,
             has: (c, p) => inComingList(c, localDateInDays(0), localDateInDays(p)) },
  expired: { stat: 'stat-overdue', periods: OVERDUE_PERIODS, period: 7, ahead: false,
             has: (c, p) => inOverdueList(c, localDateInDays(-p)) },
};

// The short text of a period under the card count.
// A month is 30 days, but 365 days is "12 месеца", not 12.17.
function periodText(days, ahead) {
  if (days === 0) return 'днес';
  if (days === 30) return ahead ? 'следващия месец' : 'последния месец';
  const span = days < 30 ? `${days} дни` : `${Math.round(days / 30)} месеца`;
  return (ahead ? 'следващите ' : 'последните ') + span;
}

function renderStats() {
  document.getElementById('stat-total').textContent = customers.length;
  for (const card of Object.values(CARDS)) {
    document.getElementById(card.stat).textContent =
      customers.filter(c => card.has(c, card.period)).length;
    document.getElementById(card.stat + '-period').textContent = periodText(card.period, card.ahead);
  }
}

// A second click on the active card shows all customers again.
// No scroll: the list is just under the cards. A scroll moved the page by a
// different amount for each list (a short list cannot scroll far), and it
// cut the page heading.
function showCardList(key) {
  if (!Object.hasOwn(CARDS, key)) return;
  const filter = document.getElementById('filter-status');
  filter.value = filter.value === key ? '' : key;
  renderFirstPage();
}

// `arg` = "card:days", from a button of a period row.
function setPeriod(arg) {
  const [key, value] = String(arg).split(':');
  const days = Number(value);
  if (!Object.hasOwn(CARDS, key) || !CARDS[key].periods.includes(days)) return;
  CARDS[key].period = days;
  page = 1;
  refresh();
}

// The period row and the "active" look of each card follow the filter.
function renderCardState(filterStatus) {
  for (const [key, card] of Object.entries(CARDS)) {
    const on = filterStatus === key;
    const row = document.getElementById(key + '-period');
    row.classList.toggle('d-none', !on);
    row.classList.toggle('d-flex', on);
    row.querySelectorAll('[data-arg]').forEach(btn => {
      const pressed = Number(btn.dataset.arg.split(':')[1]) === card.period;
      btn.classList.toggle('active', pressed);
      btn.setAttribute('aria-pressed', String(pressed));
    });
    const button = document.querySelector(`[data-action="showCardList"][data-arg="${key}"]`);
    button.classList.toggle('active', on);
    button.setAttribute('aria-pressed', String(on));
  }
}

// ─── Dashboard table ─────────────────────────────────────────────────
// A new search, filter or list starts on page 1. A send, an edit or a
// delete keeps the page (renderTable alone), so the staff do not lose their place.
function renderFirstPage() {
  page = 1;
  renderTable();
}

// `arg` = the page number, from a button of the pager.
function goToPage(arg) {
  const n = Number(arg);
  if (!Number.isInteger(n)) return;
  page = n;
  renderTable();
  // The pager is under the table: show the first row of the new page.
  const table = document.getElementById('table-body').closest('.card');
  if (table.getBoundingClientRect().top < 0) table.scrollIntoView({ block: 'start' });
}

// The text, the page buttons and the rows-per-page select under the table.
function renderPager(total) {
  const pager = document.getElementById('pager');
  pager.classList.toggle('d-none', total === 0);
  pager.classList.toggle('d-flex', total > 0);
  const count = pageCount(total, pageSize);
  const first = (page - 1) * pageSize + 1;
  const last  = Math.min(page * pageSize, total);
  document.getElementById('pager-text').textContent = `Показани ${first}–${last} от ${total}`;
  document.getElementById('page-size').value = String(pageSize);

  const item = (label, target, { active = false, disabled = false, title = '' } = {}) => `
    <li class="page-item${active ? ' active' : ''}${disabled ? ' disabled' : ''}">
      <button type="button" class="page-link"${disabled ? ' disabled' : ` data-action="goToPage" data-arg="${target}"`}
              ${active ? 'aria-current="page"' : ''}${title ? ` title="${title}" aria-label="${title}"` : ''}>${label}</button>
    </li>`;
  const pages = document.getElementById('pager-pages');
  pages.classList.toggle('d-none', count === 1);
  pages.innerHTML = [
    item('‹', page - 1, { disabled: page === 1, title: 'Предишна страница' }),
    ...pageButtons(page, count).map(p => p === null
      ? item('…', 0, { disabled: true })
      : item(String(p), p, { active: p === page })),
    item('›', page + 1, { disabled: page === count, title: 'Следваща страница' }),
  ].join('');
}

function renderTable() {
  const search       = document.getElementById('search-input').value.toLowerCase();
  const filterStatus = document.getElementById('filter-status').value;
  const card         = Object.hasOwn(CARDS, filterStatus) ? CARDS[filterStatus] : null;
  renderCardState(filterStatus);

  let filtered = customers.filter(c => {
    const matchText = !search ||
      c.name.toLowerCase().includes(search) ||
      c.carPlate.toLowerCase().includes(search) ||
      c.carModel.toLowerCase().includes(search);

    const matchStatus = card ? card.has(c, card.period)
                             : !filterStatus || c.status === filterStatus;
    return matchText && matchStatus;
  });

  // Sort: the SMS of now first, then by reminder date ascending. The
  // "Очаквани за преглед" list goes by the day the customer must come.
  filtered.sort(filterStatus === 'coming'
    ? (a, b) => a.nextServiceDate.localeCompare(b.nextServiceDate)
    : (a, b) => (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) ||
                a.nextReminderDate.localeCompare(b.nextReminderDate));

  const tbody = document.getElementById('table-body');
  page = clampPage(page, filtered.length, pageSize);
  renderPager(filtered.length);

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-5">
      <i class="bi bi-inbox d-block mb-2 fs-3 opacity-25"></i>Няма намерени клиенти</td></tr>`;
    return;
  }

  const today = localDateInDays(0);
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize);
  tbody.innerHTML = shown.map(c => {
    const eff = c.status;

    const badge = {
      pending:  `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                   <i class="bi bi-clock me-1"></i>Очаква</span>`,
      due:      `<span class="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle">
                   <i class="bi bi-bell me-1"></i>За днес</span>`,
      sent:     `<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle"
                       title="Изпратен на ${formatDateTime(c.smsSentAt)}">
                   <i class="bi bi-check-circle me-1"></i>Изпратен</span>`,
      overdue:  `<span class="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                   <i class="bi bi-exclamation-triangle me-1"></i>Просрочен</span>`,
    }[eff] || '';

    const rDate   = c.nextReminderDate;
    const rdClass = eff === 'due' ? 'date-today'
                  : (eff === 'pending' && daysDiff(rDate) <= 7 ? 'date-soon' : '');
    // "За днес" also covers a reminder day that the staff missed.
    const rdLabel = eff === 'due'
      ? `<strong>${formatDate(rDate)}</strong>` +
        (rDate === today ? ' <span class="badge bg-primary ms-1">днес</span>' : '')
      : formatDate(rDate);

    // One SMS for each year, and none after the expiry date. The engine
    // refuses these sends too (lib/reminders.js, sendBlock).
    const canSend = eff === 'due' || eff === 'pending';

    return `
    <tr>
      <td>
        <div class="fw-semibold">${escHtml(c.name)}</div>
        <div class="text-muted" style="font-size:11px;">${escHtml(c.address || '—')}</div>
      </td>
      <td>
        <span class="badge bg-light text-dark border">
          <i class="bi bi-car-front me-1"></i>${escHtml(c.carModel)}
        </span>
        <div class="text-muted mt-1" style="font-size:11px;">${escHtml(c.carPlate)}</div>
      </td>
      <td><code class="text-body">${escHtml(c.phone)}</code></td>
      <td><span class="${rdClass}">${rdLabel}</span></td>
      <td><span class="${eff === 'overdue' ? 'date-overdue' : ''}">${formatDate(c.nextServiceDate)}</span></td>
      <td>${badge}</td>
      <td>
        <div class="d-flex gap-1 flex-nowrap">
          ${canSend ? `<button class="btn btn-primary btn-sm d-flex align-items-center gap-1 text-nowrap"
                  data-action="previewSms" data-arg="${escHtml(c.id)}">
            <i class="bi bi-send"></i> Изпрати
          </button>` : ''}
          <button class="btn btn-outline-secondary btn-sm" data-action="openEditModal" data-arg="${escHtml(c.id)}"
                  title="Редактирай"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-outline-danger btn-sm" data-action="deleteCustomer" data-arg="${escHtml(c.id)}"
                  title="Изтрий"><i class="bi bi-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ─── SMS send flow ────────────────────────────────────────────────────
async function previewSms(id) {
  try {
    const data = await api('POST', `/api/preview-sms/${encodeURIComponent(id)}`);
    document.getElementById('preview-modal-body').textContent = data.body;
    renderCounter(
      document.getElementById('preview-modal-count'),
      data.body,
      Number.isFinite(data.pricePerSegment) ? data.pricePerSegment : pricePerSegment
    );
    pendingSendId = id;
    bsSmsPreviewModal.show();
  } catch (e) {
    toast('Грешка при зареждане на SMS преглед: ' + e.message, 'danger');
  }
}

function closeSmsPreviewModal() {
  bsSmsPreviewModal.hide();
  pendingSendId = null;
}

async function confirmSend() {
  if (!pendingSendId) return;
  const btn = document.getElementById('confirm-send-btn');
  btn.disabled = true;
  btn.innerHTML = `<i class="bi bi-arrow-repeat spin"></i> Изпращане…`;

  try {
    const idx = customers.findIndex(c => c.id === pendingSendId);
    const data = await api('POST', `/api/customers/${encodeURIComponent(pendingSendId)}/send-sms`);

    if (idx !== -1) customers[idx] = data.customer;

    closeSmsPreviewModal();
    refresh();
    toast(`SMS изпратен до ${data.customer.name}!`, 'success');
  } catch (e) {
    toast('Грешка при изпращане: ' + e.message, 'danger');
    // The file can hold more than this page shows (example: sent, not saved).
    loadCustomers();
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-send"></i> Изпрати SMS`;
  }
}

// ─── Delete customer ──────────────────────────────────────────────────
// Only the ID comes from the button. The name is read from the list, so no
// customer text is ever part of the page's code.
async function deleteCustomer(id) {
  const customer = customers.find(c => c.id === id);
  if (!customer) return;
  const name = customer.name;
  if (!await ask(`Изтриване на клиент "${name}"? Действието е необратимо.`, 'Изтрий', 'btn-danger')) return;
  try {
    await api('DELETE', `/api/customers/${encodeURIComponent(id)}`);
    customers = customers.filter(c => c.id !== id);
    refresh();
    toast(`Клиент ${name} е изтрит`, 'secondary');
  } catch (e) {
    toast('Грешка при изтриване: ' + e.message, 'danger');
  }
}

// ─── Add/Edit modal ───────────────────────────────────────────────────
function openAddModal() {
  document.getElementById('modal-title').textContent        = 'Добави клиент';
  document.getElementById('modal-save-label').textContent   = 'Добави клиент';
  document.getElementById('f-id').value = '';
  ['name','phone','address','carModel','carPlate'].forEach(f =>
    document.getElementById('f-' + f).value = '');
  document.getElementById('f-lastServiceDate').value = '';
  limitInspectionDate();
  bsCustomerModal.show();
}

function openEditModal(id) {
  const c = customers.find(x => x.id === id);
  if (!c) return;
  document.getElementById('modal-title').textContent       = 'Редактирай клиент';
  document.getElementById('modal-save-label').textContent  = 'Запази промените';
  document.getElementById('f-id').value              = c.id;
  document.getElementById('f-name').value            = c.name;
  document.getElementById('f-phone').value           = c.phone;
  document.getElementById('f-address').value         = c.address || '';
  document.getElementById('f-carModel').value        = c.carModel;
  document.getElementById('f-carPlate').value        = c.carPlate;
  document.getElementById('f-lastServiceDate').value = c.lastServiceDate;
  limitInspectionDate();
  bsCustomerModal.show();
}

function closeModal() { bsCustomerModal.hide(); }

// An inspection cannot be in the future. The server checks it too.
function limitInspectionDate() {
  document.getElementById('f-lastServiceDate').max = localDateInDays(0);
}

// "0887 123 456" → "+359887123456". Null when the text is not a Bulgarian
// number that starts with 0.
function bulgarianToE164(phone) {
  const digits = phone.replace(/[\s-]/g, '');
  return /^0\d{8,9}$/.test(digits) ? '+359' + digits.slice(1) : null;
}

async function saveCustomer() {
  const id   = document.getElementById('f-id').value;
  const body = {
    name:            document.getElementById('f-name').value.trim(),
    phone:           document.getElementById('f-phone').value.trim(),
    address:         document.getElementById('f-address').value.trim(),
    carModel:        document.getElementById('f-carModel').value.trim(),
    carPlate:        document.getElementById('f-carPlate').value.trim(),
    lastServiceDate: document.getElementById('f-lastServiceDate').value,
  };

  if (!body.name || !body.phone || !body.carModel || !body.carPlate || !body.lastServiceDate) {
    toast('Моля, попълнете всички задължителни полета', 'warning');
    return;
  }

  // Twilio needs the country code. The staff often type the number with 0.
  const e164 = bulgarianToE164(body.phone);
  if (e164) {
    if (!await ask(`Телефонът трябва да започва с +359. Да го променя ли на ${e164}?`, 'Промени')) return;
    body.phone = e164;
    document.getElementById('f-phone').value = e164;
  }

  try {
    let data;
    if (id) {
      data = await api('PUT', `/api/customers/${encodeURIComponent(id)}`, body);
      const idx = customers.findIndex(c => c.id === id);
      if (idx !== -1) customers[idx] = data;
      toast('Клиентът е обновен', 'success');
    } else {
      data = await api('POST', '/api/customers', body);
      customers.push(data);
      toast('Клиентът е добавен', 'success');
    }
    closeModal();
    refresh();
  } catch (e) {
    toast('Грешка при запазване: ' + e.message, 'danger');
  }
}

// ─── Template ─────────────────────────────────────────────────────────
function updatePreview() {
  const tmpl = document.getElementById('sms-template-input').value;
  smsTemplate     = tmpl;
  pricePerSegment = readPrice() ?? 0;

  const sample = {
    name:            'Иван Петров',
    carModel:        'VW Golf 7',
    carPlate:        'PB1234AB',
    nextServiceDate: localDateInDays(7),
    phone:           '+359881234567'
  };
  // The same function fills the real SMS in the engine.
  const preview = fillTemplate(tmpl, sample);

  document.getElementById('sms-preview-box').textContent = preview || '—';
  renderCounter(document.getElementById('sms-counter'), preview, pricePerSegment);
}

/**
 * Draw the letter / SMS / cost counter into `el`.
 * It is the only place that explains why a message suddenly costs 3x.
 */
function renderCounter(el, text, price) {
  const m    = measureSms(text);
  const cost = m.segments * (Number.isFinite(price) ? price : 0);
  const tone = m.segments === 1 ? 'success' : m.segments === 2 ? 'warning' : 'danger';
  const over = m.segments > 1;

  const used  = m.billedUnits;
  const total = m.segments * m.limit;
  const pct   = Math.min(100, Math.round((used / total) * 100));

  el.innerHTML = `
    <div class="d-flex align-items-center gap-2 flex-wrap" style="font-size:11px;">
      <span class="badge bg-${tone}-subtle text-${tone}-emphasis border border-${tone}-subtle">
        <i class="bi bi-envelope me-1"></i>${m.segments} SMS
      </span>
      <span class="text-muted">${used} / ${total} знака</span>
      <span class="badge bg-light text-dark border">${m.encoding}</span>
      <span class="text-muted ms-auto fw-semibold">≈ $${cost.toFixed(4)}</span>
    </div>
    <div class="progress mt-1" style="height:4px;">
      <div class="progress-bar bg-${tone}" style="width:${pct}%"></div>
    </div>
    ${over ? `<div class="text-${tone} mt-1" style="font-size:11px;">
      <i class="bi bi-exclamation-triangle me-1"></i>Над 70 знака — съобщението се
      таксува като ${m.segments} SMS. Съкратете текста, за да плащате един.
    </div>` : ''}`;
}

// The price in the field, or null when the field has no valid number.
function readPrice() {
  const price = parseFloat(document.getElementById('f-price').value);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

function insertVar(v) {
  const ta    = document.getElementById('sms-template-input');
  const start = ta.selectionStart, end = ta.selectionEnd;
  ta.value = ta.value.slice(0, start) + v + ta.value.slice(end);
  ta.selectionStart = ta.selectionEnd = start + v.length;
  ta.focus();
  updatePreview();
}

async function saveTemplate() {
  const template = document.getElementById('sms-template-input').value;
  try {
    // A null price changes nothing in the file (lib/validate.js). So an empty
    // field, or a page that did not load the price, never saves a price of 0.
    const data = await api('PUT', '/api/template', { template, pricePerSegment: readPrice() });
    smsTemplate = template;
    toast('Шаблонът е запазен!', 'success');
    // A name with a typing error stays in the SMS as it is. Say so.
    if (data.unknownNames?.length) {
      toast('Непознати променливи: ' + data.unknownNames.map(n => `{{${n}}}`).join(', ') +
            '. Те остават в SMS-а без промяна.', 'warning');
    }
  } catch (e) {
    toast('Грешка при запазване: ' + e.message, 'danger');
  }
}

// ─── Holidays ─────────────────────────────────────────────────────────
function renderHolidays() {
  const list = document.getElementById('holiday-list');
  if (!holidays.length) {
    list.innerHTML = `<p class="text-muted small mb-0">Няма добавени почивни дни</p>`;
    return;
  }
  list.innerHTML = [...holidays].sort().map(h => `
    <div class="d-flex align-items-center justify-content-between bg-light border rounded px-3 py-2">
      <span class="small"><i class="bi bi-calendar2-x text-danger me-2"></i>${formatDate(h)}</span>
      <button class="btn btn-link btn-sm text-danger p-0 ms-2" data-action="removeHoliday" data-arg="${escHtml(h)}" title="Премахни">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
  `).join('');
}

async function addHoliday() {
  const input = document.getElementById('new-holiday-input');
  const val   = input.value;
  if (!val) { toast('Изберете дата', 'warning'); return; }
  if (holidays.includes(val)) { toast('Датата вече е в списъка', 'info'); return; }
  if (await saveHolidays([...holidays, val])) input.value = '';
}

async function removeHoliday(date) {
  await saveHolidays(holidays.filter(h => h !== date));
}

// The list on the page changes only after the file has the new list. A save
// that failed leaves the page as it was. True when the save was good.
async function saveHolidays(next) {
  try {
    const data = await api('PUT', '/api/holidays', { holidays: next });
    holidays = data.holidays || next;
    renderHolidays();
    return true;
  } catch (e) {
    toast('Грешка при запазване на почивните дни: ' + e.message, 'danger');
    return false;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────
// "YYYY-MM-DD" of today + `days`, from local date parts. Not toISOString():
// that gives the day before in Sofia after midnight.
function localDateInDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "YYYY-MM-DDTHH:mm:ss" → "DD.MM.YYYY HH:mm"
function formatDateTime(str) {
  if (!str) return '—';
  const [date, time = ''] = str.split('T');
  return `${formatDate(date)} ${time.slice(0, 5)}`.trim();
}

function formatDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}.${m}.${y}`;
}

function daysDiff(dateStr) {
  const d   = new Date(dateStr + 'T00:00:00');
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.round((d - now) / 86400000);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// A yes / no question. It gives true for yes. A native <dialog>, not a
// Bootstrap modal: it must open on top of the customer window, and Bootstrap
// cannot show two modals at one time. Not the dialog of the browser: a
// browser can block it.
function ask(text, yesLabel, yesClass = 'btn-primary') {
  const dialog = document.getElementById('ask-dialog');
  const yes    = document.getElementById('ask-yes');
  document.getElementById('ask-text').textContent = text;
  yes.textContent = yesLabel;
  yes.className   = 'btn ' + yesClass;
  // Esc closes the dialog and keeps the old value. Start from "no".
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'yes'), { once: true });
  });
}

let toastCount = 0;

// Bootstrap toast helper
function toast(msg, type = 'secondary') {
  const container = document.getElementById('toast-container');
  // One failure can come from many requests at one time (example: the Excel
  // file is open). Show the same text one time.
  if ([...container.children].some(t => t.dataset.msg === msg)) return;
  const id  = 'toast-' + (++toastCount);
  const icon = {
    success:   'bi-check-circle-fill',
    danger:    'bi-x-circle-fill',
    warning:   'bi-exclamation-triangle-fill',
    info:      'bi-info-circle-fill',
    secondary: 'bi-info-circle-fill',
  }[type] || 'bi-info-circle-fill';

  container.insertAdjacentHTML('beforeend', `
    <div id="${id}" class="toast align-items-center text-bg-${type} border-0" role="alert" aria-live="assertive">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi ${icon}"></i> ${escHtml(msg)}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto"
                data-bs-dismiss="toast"></button>
      </div>
    </div>
  `);

  const el   = document.getElementById(id);
  el.dataset.msg = msg;
  const bsT  = new bootstrap.Toast(el, { delay: 3500 });
  bsT.show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}