// The tasks of the staff guide, in order (specs D11). The one home of the
// list: the sidebar of the dashboard (scripts.js), the contents page
// (help.html) and the "back / next" links of each task page read it.
// The number of a task is its place in this list.
//
// `page`  — the file in public/help/.
// `short` — the name in the sidebar (short: the sidebar is 220 px).
// `title` — the title of the task page and of the contents line.
// `ready` — false: the page is not written yet. It shows grey, with no link.
export const HELP_TASKS = [
  { page: 'sms.html',      ready: true,  short: 'Изпращане на SMS',      title: 'Как да изпратя SMS напомняне' },
  { page: 'add.html',      ready: true,  short: 'Нов клиент',            title: 'Как да добавя клиент' },
  { page: 'edit.html',     ready: true,  short: 'Промяна и изтриване',   title: 'Как да променя или изтрия клиент' },
  { page: 'passed.html',   ready: true,  short: 'Минал преглед',         title: 'Клиентът мина прегледа' },
  { page: 'cards.html',    ready: true,  short: 'Карти и периодите',    title: 'Кой трябва да получи SMS днес' },
  { page: 'overdue.html',  ready: true, short: 'Просрочени',            title: 'Какво значи „Просрочени“' },
  { page: 'days-off.html', ready: true, short: 'Почивни дни',           title: 'Почивни дни и защо SMS идва по-рано' },
  { page: 'template.html', ready: true, short: 'SMS шаблон и цена',     title: 'SMS шаблон и цена' },
  { page: 'file.html',     ready: true,  short: 'Файл и копия',         title: 'Къде е файлът с клиентите' },
  { page: 'errors.html',   ready: false, short: 'Ако нещо не работи',    title: 'Ако нещо не работи' },
];
