// ══════════════════════════════════════════
//  Пробация КР — Frontend
// ══════════════════════════════════════════

let currentSection = 'employees';
let currentEditId  = null;
let cache = {};

// ── НАВИГАЦИЯ ────────────────────────────
function show(sec, btn, title, breadcrumb) {
  // Скрыть все секции
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  // Убрать active у всех кнопок
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  // Показать нужную секцию
  document.getElementById('sec-' + sec).classList.add('active');
  if (btn) btn.classList.add('active');
  // Обновить заголовок
  document.getElementById('pageTitle').textContent  = title || sec;
  document.getElementById('breadcrumb').textContent = breadcrumb || '';
  currentSection = sec;
  // Карта — отдельная логика
  if (sec === 'monitoring') { initMap(); return; }
  loadSection(sec);
}

// ── ЗАГРУЗКА ДАННЫХ ─────────────────────
async function loadSection(sec) {
  try {
    const res  = await fetch('/api/' + sec);
    const data = await res.json();
    cache[sec] = data;
    renderSection(sec, data);
    setTotal(sec, data.length);
    setNavCount(sec, data.length);
  } catch(e) {
    showToast('Ошибка загрузки', 'error');
  }
}

async function loadStats() {
  try {
    const res   = await fetch('/api/stats');
    const stats = await res.json();
    for (const [t, n] of Object.entries(stats)) setNavCount(t, n);
  } catch(e) {}
}

function setNavCount(sec, n) {
  const el = document.getElementById('cnt-' + sec);
  if (el) el.textContent = n;
}

const LABELS = {
  employees:'сотрудников', departments:'отделов', clients:'подопечных',
  events:'мероприятий', partners:'партнёров', normdocs:'документов',
  appeals:'обращений', mto:'позиций'
};

function setTotal(sec, n) {
  const el = document.getElementById(sec + '-total');
  if (el) el.textContent = n + ' ' + (LABELS[sec] || '');
}

// ── РЕНДЕР ТАБЛИЦ ───────────────────────
const ROW = {
  employees:   r => `<td>${r.name}</td><td>${r.post}</td><td>${r.dept}</td><td>${r.phone}</td><td>${r.email}</td><td>${r.exp} лет</td>`,
  departments: r => `<td>${r.name}</td><td>${r.head}</td><td>${r.staff}</td><td>${r.phone}</td><td>${r.address}</td><td>${badge(r.status)}</td>`,
  clients:     r => `<td>${r.name}</td><td>${r.born}</td><td><span class="ch-pill ${catClass(r.cat)}">${r.cat}</span></td><td>${r.start}</td><td>${r.end}</td><td>${r.insp}</td><td>${badge(r.status)}</td>`,
  events:      r => `<td>${r.title}</td><td>${r.date}</td><td>${r.type}</td><td>${r.org}</td><td>${r.participants}</td><td>${badge(r.status)}</td>`,
  partners:    r => `<td>${r.name}</td><td>${r.type}</td><td>${r.contact}</td><td>${r.phone}</td><td>${r.area}</td><td>${r.since}</td><td>${badge(r.status)}</td>`,
  normdocs:    r => `<td>${r.title}</td><td>${r.num}</td><td>${r.date}</td><td>${r.type}</td><td>${r.org}</td><td>${badge(r.status)}</td>`,
  appeals:     r => `<td>${r.name}</td><td>${r.date}</td><td>${r.type}</td><td style="max-width:160px;white-space:normal">${r.desc}</td><td>${r.insp}</td><td>${badge(r.status)}</td>`,
  mto:         r => `<td>${r.name}</td><td>${r.cat}</td><td>${r.qty}</td><td>${r.unit}</td><td>${badge(r.condition)}</td><td>${r.location}</td>`,
};

function renderSection(sec, data) {
  const tbody = document.getElementById(sec + '-body');
  if (!tbody) return;
  if (!data || !data.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:40px">Нет записей</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(r => `
    <tr>
      ${ROW[sec](r)}
      <td>
        <button class="btn-edit"   onclick="openModal('${sec}',${r.id})">✏️</button>
        <button class="btn-delete" onclick="deleteRecord('${sec}',${r.id})">🗑️</button>
      </td>
    </tr>`).join('');
}

function catClass(cat) {
  return cat === 'Условный срок' ? 'ch-blue' : cat === 'Исправительные работы' ? 'ch-orange' : 'ch-pur';
}

function badge(val) {
  const map = {
    'Активный':'#22c55e','Завершён':'#94a3b8','Завершено':'#94a3b8',
    'Планируется':'#3b82f6','Рассматривается':'#f59e0b',
    'Действует':'#22c55e','Утратил силу':'#94a3b8','Проект':'#f59e0b',
    'Новое':'#3b82f6','Хорошее':'#22c55e','Удовлетворительное':'#f59e0b','Требует ремонта':'#ef4444',
  };
  const c = map[val] || '#64748b';
  return `<span style="background:${c}20;color:${c};padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600">${val}</span>`;
}

// ── ПОИСК ───────────────────────────────
function searchTable(sec, q) {
  const data = cache[sec] || [];
  const out  = q ? data.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q.toLowerCase()))) : data;
  renderSection(sec, out);
}

// ── МОДАЛЬНОЕ ОКНО ───────────────────────
const FIELDS = {
  employees: [
    {k:'name',l:'ФИО',t:'text'},{k:'post',l:'Должность',t:'text'},
    {k:'dept',l:'Отдел',t:'text'},{k:'phone',l:'Телефон',t:'text'},
    {k:'email',l:'Email',t:'email'},{k:'exp',l:'Стаж (лет)',t:'number'},
  ],
  departments: [
    {k:'name',l:'Название',t:'text'},{k:'head',l:'Руководитель',t:'text'},
    {k:'staff',l:'Сотрудников',t:'number'},{k:'phone',l:'Телефон',t:'text'},
    {k:'address',l:'Адрес',t:'text'},
    {k:'status',l:'Статус',t:'select',opts:['Активный','Неактивный']},
  ],
  clients: [
    {k:'name',l:'ФИО',t:'text'},{k:'born',l:'Год рождения',t:'number'},
    {k:'cat',l:'Категория',t:'select',opts:['Условный срок','Исправительные работы','Отсрочка приговора']},
    {k:'start',l:'Дата начала',t:'text'},{k:'end',l:'Дата окончания',t:'text'},
    {k:'insp',l:'Инспектор',t:'text'},
    {k:'status',l:'Статус',t:'select',opts:['Активный','Завершён']},
  ],
  events: [
    {k:'title',l:'Название',t:'text'},{k:'date',l:'Дата',t:'text'},
    {k:'type',l:'Тип',t:'select',opts:['Обучение','Инспекция','Совещание','Отчётность','Тестирование','Реабилитация','Аналитика']},
    {k:'org',l:'Организатор',t:'text'},{k:'participants',l:'Участников',t:'number'},
    {k:'status',l:'Статус',t:'select',opts:['Планируется','Активный','Завершён']},
  ],
  partners: [
    {k:'name',l:'Организация',t:'text'},{k:'type',l:'Тип',t:'text'},
    {k:'contact',l:'Контактное лицо',t:'text'},{k:'phone',l:'Телефон',t:'text'},
    {k:'email',l:'Email',t:'email'},{k:'area',l:'Направление',t:'text'},
    {k:'since',l:'Сотрудничество с',t:'text'},
    {k:'status',l:'Статус',t:'select',opts:['Активный','Неактивный']},
  ],
  normdocs: [
    {k:'title',l:'Название',t:'text'},{k:'num',l:'Номер',t:'text'},
    {k:'date',l:'Дата',t:'text'},{k:'type',l:'Тип документа',t:'text'},
    {k:'org',l:'Орган',t:'text'},
    {k:'status',l:'Статус',t:'select',opts:['Действует','Утратил силу','Проект']},
  ],
  appeals: [
    {k:'name',l:'Заявитель',t:'text'},{k:'date',l:'Дата',t:'text'},
    {k:'type',l:'Тип',t:'select',opts:['Жалоба','Заявление','Обращение']},
    {k:'desc',l:'Описание',t:'textarea'},{k:'insp',l:'Инспектор',t:'text'},
    {k:'status',l:'Статус',t:'select',opts:['Рассматривается','Завершено']},
  ],
  mto: [
    {k:'name',l:'Наименование',t:'text'},{k:'cat',l:'Категория',t:'text'},
    {k:'qty',l:'Количество',t:'number'},{k:'unit',l:'Единица',t:'text'},
    {k:'condition',l:'Состояние',t:'select',opts:['Новое','Хорошее','Удовлетворительное','Требует ремонта']},
    {k:'location',l:'Местонахождение',t:'text'},{k:'note',l:'Примечание',t:'text'},
  ],
};

async function openModal(sec, id=null) {
  currentEditId = id;
  document.getElementById('modalTitle').textContent = id ? 'Редактировать' : 'Новая запись';

  let record = {};
  if (id && cache[sec]) record = cache[sec].find(r => r.id === id) || {};

  const fields = FIELDS[sec] || [];
  document.getElementById('modalBody').innerHTML =
    '<div class="form-grid">' + fields.map(f => {
      if (f.t === 'select') {
        const opts = f.opts.map(o => `<option value="${o}"${record[f.k]===o?' selected':''}>${o}</option>`).join('');
        return `<div class="form-group"><label>${f.l}</label><select name="${f.k}" class="form-select">${opts}</select></div>`;
      }
      if (f.t === 'textarea') {
        return `<div class="form-group" style="grid-column:1/-1"><label>${f.l}</label><textarea name="${f.k}" class="form-input" rows="3" style="resize:vertical">${record[f.k]||''}</textarea></div>`;
      }
      return `<div class="form-group"><label>${f.l}</label><input type="${f.t}" name="${f.k}" class="form-input" value="${record[f.k]||''}"></div>`;
    }).join('') + '</div>';

  document.getElementById('modal').setAttribute('data-sec', sec);
  document.getElementById('modalOverlay').style.display = 'block';
  document.getElementById('modal').style.display = 'block';
  requestAnimationFrame(() => {
    document.getElementById('modalOverlay').style.opacity = '1';
    document.getElementById('modal').style.transform = 'translateY(0)';
  });
}

function closeModal() {
  document.getElementById('modalOverlay').style.opacity = '0';
  document.getElementById('modal').style.transform = 'translateY(20px)';
  setTimeout(() => {
    document.getElementById('modalOverlay').style.display = 'none';
    document.getElementById('modal').style.display = 'none';
  }, 200);
}

async function saveRecord() {
  const modal = document.getElementById('modal');
  const sec   = modal.getAttribute('data-sec');
  const data  = {};
  (FIELDS[sec] || []).forEach(f => {
    const el = modal.querySelector(`[name="${f.k}"]`);
    if (el) data[f.k] = f.t === 'number' ? Number(el.value) : el.value;
  });

  try {
    const url    = currentEditId ? `/api/${sec}/${currentEditId}` : `/api/${sec}`;
    const method = currentEditId ? 'PUT' : 'POST';
    const res    = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
    if (!res.ok) throw new Error();
    closeModal();
    await loadSection(sec);
    showSaveBadge();
    showToast(currentEditId ? 'Обновлено ✓' : 'Добавлено ✓');
  } catch(e) {
    showToast('Ошибка сохранения', 'error');
  }
}

async function deleteRecord(sec, id) {
  if (!confirm('Удалить запись?')) return;
  try {
    await fetch(`/api/${sec}/${id}`, { method: 'DELETE' });
    await loadSection(sec);
    showSaveBadge();
    showToast('Удалено ✓');
  } catch(e) {
    showToast('Ошибка удаления', 'error');
  }
}

// ── УВЕДОМЛЕНИЯ ─────────────────────────
function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent  = msg;
  t.style.background = type === 'error' ? '#ef4444' : '#22c55e';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function showSaveBadge() {
  const el = document.getElementById('saveBadge');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

// ── ИНИЦИАЛИЗАЦИЯ ────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadStats();
  await loadSection('employees');
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
});
