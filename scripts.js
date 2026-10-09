// ─── State ──────────────────────────────────────────────────────────
let customers = [];
let smsTemplate = '';
let holidays = [];
let pendingSendId = null;

const TODAY = new Date().toISOString().split('T')[0];

// Bootstrap modal instances (initialised after DOM ready)
let bsCustomerModal, bsSmsPreviewModal;

// ─── Init ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  bsCustomerModal   = new bootstrap.Modal(document.getElementById('customer-modal'));
  bsSmsPreviewModal = new bootstrap.Modal(document.getElementById('sms-preview-modal'));
  init();
});

async function init() {
  await Promise.all([loadCustomers(), loadTemplate(), loadHolidays()]);
}

async function loadCustomers() {
  try {
    const res  = await fetch('/api/customers');
    const data = await res.json();
    customers  = data.customers || [];
    renderTable();
    renderStats();
    renderSettingsTable();
  } catch (e) {
    toast('Грешка при зареждане на клиентите', 'danger');
  }
}

async function loadTemplate() {
  try {
    const res  = await fetch('/api/template');
    const data = await res.json();
    smsTemplate = data.template || '';
    document.getElementById('sms-template-input').value = smsTemplate;
    updatePreview();
  } catch (e) {}
}

async function loadHolidays() {
  try {
    const res  = await fetch('/api/holidays');
    const data = await res.json();
    holidays = data.holidays || [];
    renderHolidays();
  } catch (e) {}
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

// ─── Stats ───────────────────────────────────────────────────────────
function renderStats() {
  const total    = customers.length;
  const pending  = customers.filter(c => !c.disabled && c.status === 'pending').length;
  const sent     = customers.filter(c => c.status === 'sent').length;
  const overdue  = customers.filter(c => !c.disabled && c.status === 'pending' && c.nextReminderDate < TODAY).length;
  const dueToday = customers.filter(c => !c.disabled && c.status === 'pending' && c.nextReminderDate === TODAY).length;

  document.getElementById('stat-total').textContent   = total;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-sent').textContent    = sent;
  document.getElementById('stat-overdue').textContent = overdue;
  document.getElementById('stat-today').textContent   = dueToday;
}

// ─── Dashboard table ─────────────────────────────────────────────────
function renderTable() {
  const search       = document.getElementById('search-input').value.toLowerCase();
  const filterStatus = document.getElementById('filter-status').value;

  let filtered = customers.filter(c => {
    const matchText = !search ||
      c.name.toLowerCase().includes(search) ||
      c.carPlate.toLowerCase().includes(search) ||
      c.carModel.toLowerCase().includes(search);

    const effStatus = effectiveStatus(c);
    const matchStatus = !filterStatus || effStatus === filterStatus;
    return matchText && matchStatus;
  });

  // Sort: overdue first, then by reminder date ascending
  filtered.sort((a, b) => {
    const ra = a.nextReminderDate, rb = b.nextReminderDate;
    if (ra < TODAY && rb >= TODAY) return -1;
    if (ra >= TODAY && rb < TODAY) return  1;
    return ra.localeCompare(rb);
  });

  const tbody = document.getElementById('table-body');

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-5">
      <i class="bi bi-inbox d-block mb-2 fs-3 opacity-25"></i>Няма намерени клиенти</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(c => {
    const eff = effectiveStatus(c);

    const badge = {
      pending:  `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                   <i class="bi bi-clock me-1"></i>Очаква</span>`,
      sent:     `<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle">
                   <i class="bi bi-check-circle me-1"></i>Изпратен</span>`,
      disabled: `<span class="badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle">
                   <i class="bi bi-pause-circle me-1"></i>Деактивиран</span>`,
      overdue:  `<span class="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                   <i class="bi bi-exclamation-triangle me-1"></i>Просрочен</span>`,
    }[eff] || '';

    const rDate   = c.nextReminderDate;
    const rdClass = rDate === TODAY ? 'date-today'
                  : (rDate < TODAY && eff !== 'sent') ? 'date-overdue'
                  : (daysDiff(rDate) <= 7 ? 'date-soon' : '');
    const rdLabel = rDate === TODAY
      ? `<strong>${formatDate(rDate)}</strong> <span class="badge bg-primary ms-1">днес</span>`
      : formatDate(rDate);

    const canSend = !c.disabled && eff !== 'sent';

    return `
    <tr class="${c.disabled ? 'row-disabled' : ''}" id="row-${c.id}">
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
      <td>${formatDate(c.nextServiceDate)}</td>
      <td>${badge}</td>
      <td>
        <div class="d-flex gap-1 flex-wrap">
          ${canSend
            ? `<button class="btn btn-primary btn-sm d-flex align-items-center gap-1"
                       onclick="previewSms('${c.id}')">
                 <i class="bi bi-send"></i> Изпрати
               </button>`
            : `<button class="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1" disabled>
                 <i class="bi bi-send"></i> Изпрати
               </button>`
          }
          <button class="btn btn-outline-secondary btn-sm" onclick="openEditModal('${c.id}')"
                  title="Редактирай"><i class="bi bi-pencil"></i></button>
          <button class="btn ${c.disabled ? 'btn-outline-success' : 'btn-outline-warning'} btn-sm"
                  onclick="toggleDisabled('${c.id}')"
                  title="${c.disabled ? 'Активирай' : 'Деактивирай'}">
            <i class="bi bi-${c.disabled ? 'play-circle' : 'pause-circle'}"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ─── Settings table ──────────────────────────────────────────────────
function renderSettingsTable() {
  const tbody = document.getElementById('settings-table-body');
  if (!customers.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-5">
      <i class="bi bi-person-x d-block mb-2 fs-3 opacity-25"></i>Няма клиенти</td></tr>`;
    return;
  }
  tbody.innerHTML = customers.map(c => `
    <tr>
      <td><div class="fw-semibold">${escHtml(c.name)}</div></td>
      <td>
        <span class="badge bg-light text-dark border">
          <i class="bi bi-car-front me-1"></i>${escHtml(c.carModel)}
        </span>
        <span class="text-muted ms-1" style="font-size:11px;">${escHtml(c.carPlate)}</span>
      </td>
      <td><code class="text-body">${escHtml(c.phone)}</code></td>
      <td>${formatDate(c.lastServiceDate)}</td>
      <td>
        <div class="d-flex gap-1">
          <button class="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                  onclick="openEditModal('${c.id}')">
            <i class="bi bi-pencil"></i> Редактирай
          </button>
          <button class="btn btn-outline-danger btn-sm"
                  onclick="deleteCustomer('${c.id}', '${escHtml(c.name).replace(/'/g, "\\'")}')">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ─── SMS send flow ────────────────────────────────────────────────────
async function previewSms(id) {
  try {
    const res  = await fetch(`/api/preview-sms/${id}`, { method: 'POST' });
    const data = await res.json();
    document.getElementById('preview-modal-body').textContent  = data.body;
    document.getElementById('preview-modal-count').textContent = `${data.body.length} знака`;
    pendingSendId = id;
    bsSmsPreviewModal.show();
  } catch (e) {
    toast('Грешка при зареждане на SMS преглед', 'danger');
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
    const res  = await fetch(`/api/customers/${pendingSendId}/send-sms`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const idx = customers.findIndex(c => c.id === pendingSendId);
    if (idx !== -1) customers[idx] = data.customer;

    closeSmsPreviewModal();
    renderTable();
    renderStats();
    renderSettingsTable();
    toast(`SMS изпратен до ${data.customer.name}!`, 'success');
  } catch (e) {
    toast('Грешка при изпращане: ' + e.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-send"></i> Изпрати SMS`;
  }
}

// ─── Toggle disabled ──────────────────────────────────────────────────
async function toggleDisabled(id) {
  try {
    const res     = await fetch(`/api/customers/${id}/toggle-disabled`, { method: 'PATCH' });
    const updated = await res.json();
    const idx = customers.findIndex(c => c.id === id);
    if (idx !== -1) customers[idx] = updated;
    renderTable();
    renderStats();
    renderSettingsTable();
    toast(updated.disabled ? 'Клиентът е деактивиран' : 'Клиентът е активиран', 'info');
  } catch (e) {
    toast('Грешка при промяна на статуса', 'danger');
  }
}

// ─── Delete customer ──────────────────────────────────────────────────
async function deleteCustomer(id, name) {
  if (!confirm(`Изтриване на клиент "${name}"? Действието е необратимо.`)) return;
  try {
    await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    customers = customers.filter(c => c.id !== id);
    renderTable();
    renderStats();
    renderSettingsTable();
    toast(`Клиент ${name} е изтрит`, 'secondary');
  } catch (e) {
    toast('Грешка при изтриване', 'danger');
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
  bsCustomerModal.show();
}

function closeModal() { bsCustomerModal.hide(); }

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

  try {
    let res, data;
    if (id) {
      res  = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      data = await res.json();
      const idx = customers.findIndex(c => c.id === id);
      if (idx !== -1) customers[idx] = data;
      toast('Клиентът е обновен', 'success');
    } else {
      res  = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      data = await res.json();
      customers.push(data);
      toast('Клиентът е добавен', 'success');
    }
    closeModal();
    renderTable();
    renderStats();
    renderSettingsTable();
  } catch (e) {
    toast('Грешка при запазване: ' + e.message, 'danger');
  }
}

// ─── Template ─────────────────────────────────────────────────────────
function updatePreview() {
  const tmpl = document.getElementById('sms-template-input').value;
  smsTemplate = tmpl;
  const sample = {
    name:            'Иван Петров',
    carModel:        'VW Golf 7',
    carPlate:        'PB 1234 AB',
    nextServiceDate: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
    phone:           '+359881234567'
  };
  const preview = tmpl
    .replace(/{{name}}/g,        sample.name)
    .replace(/{{carModel}}/g,    sample.carModel)
    .replace(/{{carPlate}}/g,    sample.carPlate)
    .replace(/{{serviceDate}}/g, formatDate(sample.nextServiceDate))
    .replace(/{{phone}}/g,       sample.phone);
  document.getElementById('sms-preview-box').textContent  = preview || '—';
  document.getElementById('sms-char-count').textContent   = `${preview.length} знака`;
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
    await fetch('/api/template', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template })
    });
    smsTemplate = template;
    toast('Шаблонът е запазен!', 'success');
  } catch (e) {
    toast('Грешка при запазване', 'danger');
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
      <button class="btn btn-link btn-sm text-danger p-0 ms-2" onclick="removeHoliday('${h}')" title="Премахни">
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
  holidays.push(val);
  await saveHolidays();
  renderHolidays();
  input.value = '';
}

async function removeHoliday(date) {
  holidays = holidays.filter(h => h !== date);
  await saveHolidays();
  renderHolidays();
}

async function saveHolidays() {
  try {
    await fetch('/api/holidays', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ holidays })
    });
  } catch (e) {
    toast('Грешка при запазване на почивните дни', 'danger');
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────
function effectiveStatus(c) {
  if (c.disabled) return 'disabled';
  if (c.status === 'pending' && c.nextReminderDate < TODAY) return 'overdue';
  return c.status;
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
    .replace(/"/g, '&quot;');
}

// Bootstrap toast helper
function toast(msg, type = 'secondary') {
  const container = document.getElementById('toast-container');
  const id  = 'toast-' + Date.now();
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
  const bsT  = new bootstrap.Toast(el, { delay: 3500 });
  bsT.show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}