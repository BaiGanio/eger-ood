// The parts of the guide pages that come from the task list (tasks.js):
// the contents list (index.html), and on a task page its number and the
// "back / next" links. A module: the server refuses inline scripts.
import { HELP_TASKS } from './tasks.js';

// A link to a task page. The pages are one folder up (help/), so it works on
// the contents page and on each task page.
const taskUrl = task => new URL(`../${task.page}`, import.meta.url).href;

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// index.html: one line for each task. A task that is not written is grey.
function renderContents(list) {
  list.innerHTML = HELP_TASKS.map((task, i) => task.ready
    ? `<li><a href="${taskUrl(task)}">${escHtml(task.title)}</a></li>`
    : `<li class="text-muted">${escHtml(task.title)} <span class="badge text-bg-light border">скоро</span></li>`
  ).join('');
}

// A task page: its number, and links to the written tasks before and after it.
function renderTaskPage(nav) {
  const file  = location.pathname.split('/').pop();
  const index = HELP_TASKS.findIndex(t => t.page === file);
  if (index === -1) return;
  document.querySelectorAll('.task-no').forEach(el => { el.textContent = index + 1; });

  const ready = (from, step) => {
    for (let i = from + step; i >= 0 && i < HELP_TASKS.length; i += step) {
      if (HELP_TASKS[i].ready) return i;
    }
    return -1;
  };
  const link = (i, before) => i === -1 ? '<span></span>' : before
    ? `<a class="btn btn-outline-secondary" href="${taskUrl(HELP_TASKS[i])}"><i class="bi bi-arrow-left"></i> ${i + 1}. ${escHtml(HELP_TASKS[i].short)}</a>`
    : `<a class="btn btn-outline-primary" href="${taskUrl(HELP_TASKS[i])}">Следваща тема: ${i + 1}. ${escHtml(HELP_TASKS[i].short)} <i class="bi bi-arrow-right"></i></a>`;
  nav.innerHTML = link(ready(index, -1), true) + link(ready(index, 1), false);
}

const list = document.getElementById('task-list');
if (list) renderContents(list);
const nav = document.getElementById('task-nav');
if (nav) renderTaskPage(nav);
