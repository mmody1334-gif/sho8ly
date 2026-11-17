/* تراكر وظائف العلوم — Frontend
 * يجلب الوظائف من Worker API على /api/jobs، ولو فشل يعرض بيانات تجريبية واقعية الشكل.
 */
'use strict';

/* ===== الإعدادات =====
 * غيّر هذا الرابط لرابط الـ Worker الحقيقي بعد نشره، مثال:
 * const API_BASE = 'https://sho8ly.<subdomain>.workers.dev';
 */
const API_BASE = 'https://sho8ly....workers.dev';
const JOBS_ENDPOINT = API_BASE + '/api/jobs';
const FETCH_TIMEOUT_MS = 5000;
const STORAGE_KEY = 'cjt_saved_v1';

/* ===== بيانات تجريبية واقعية الشكل (تُعرض فقط لو الـ API مش جاهز) ===== */
const DEMO_JOBS = [
  { id: 'demo-1', title: 'معلم كيمياء للمرحلة الثانوية', subject: 'chem', location: 'الرياض', mode: 'onsite', type: 'school', source: 'LinkedIn', url: 'https://www.linkedin.com/jobs/', summary: 'مدارس المعرفة الأهلية بالرياض تبحث عن معلم كيمياء للمرحلتين المتوسطة والثانوية، خبرة لا تقل عن 3 سنوات، وإجادة استخدام المختبرات والتقنيات التعليمية.', score: 92, postedDaysAgo: 0, salary: 'راتب مجزٍ + بدل سكن' },
  { id: 'demo-2', title: 'مدرس فيزياء — دروس خصوصية أونلاين', subject: 'phys', location: 'عن بُعد', mode: 'online', type: 'private', source: 'Preply', url: 'https://preply.com/', summary: 'ابحث عن مدرس فيزياء لطلاب الثانوية والجامعة، حصص فردية عبر الإنترنت، جدول مرن، وأجر بالساعة يُتفق عليه حسب الخبرة.', score: 88, postedDaysAgo: 0, salary: 'بالساعة' },
  { id: 'demo-3', title: 'معلمة أحياء — معهد تقوية', subject: 'bio', location: 'البريمي', mode: 'onsite', type: 'institute', source: 'Bayt', url: 'https://www.bayt.com/', summary: 'معهد النخبة للتقوية في البريمي يحتاج معلمة أحياء لتدريس طلبة الصفوف 10–12، دوام مسائي، مع خبرة في المناهج العُمانية.', score: 85, postedDaysAgo: 1, salary: 'حسب الخبرة' },
  { id: 'demo-4', title: 'مدرس كيمياء أونلاين — منصة تعليمية', subject: 'chem', location: 'عن بُعد', mode: 'online', type: 'platform', source: 'منصة مدرستي', url: 'https://example.com/jobs/chem-online', summary: 'منصة تعليمية تبحث عن مدرس كيمياء لتسجيل دروس تفاعلية وشرح مباشر لطلاب الثانوية، مع إمكانية العمل من أي مكان.', score: 81, postedDaysAgo: 0, salary: 'راتب شهري' },
  { id: 'demo-5', title: 'معلم فيزياء — مدارس أهلية', subject: 'phys', location: 'الرياض', mode: 'onsite', type: 'school', source: 'Bayt', url: 'https://www.bayt.com/', summary: 'مدارس التربية النموذجية بالرياض تعلن عن وظيفة معلم فيزياء للمرحلة الثانوية، يشترط مؤهل تربوي وخبرة في إعداد الطلاب للاختبارات التحصيلية.', score: 90, postedDaysAgo: 2, salary: 'راتب مجزٍ' },
  { id: 'demo-6', title: 'معلم أحياء — مجموعات تقوية', subject: 'bio', location: 'البريمي', mode: 'onsite', type: 'remedial', source: 'Indeed', url: 'https://www.indeed.com/', summary: 'مركز التفوق التعليمي بالبريمي يبحث عن معلم أحياء لمجموعات تقوية صغيرة (5–8 طلاب)، دوام مسائي 3 أيام أسبوعياً.', score: 78, postedDaysAgo: 1, salary: 'بالساعة' },
  { id: 'demo-7', title: 'مدرس كيمياء خصوصي — طلاب دوليين', subject: 'chem', location: 'عن بُعد', mode: 'online', type: 'private', source: 'Preply', url: 'https://preply.com/', summary: 'طلاب دوليون يبحثون عن مدرس كيمياء (IGCSE وIB) بحصص فردية أونلاين، إجادة الإنجليزية ميزة إضافية، وأجر تنافسي بالساعة.', score: 95, postedDaysAgo: 3, salary: 'بالساعة — أجر تنافسي' },
  { id: 'demo-8', title: 'معلمة فيزياء — منصة شرح مرئي', subject: 'phys', location: 'عن بُعد', mode: 'online', type: 'platform', source: 'منصة نفهم', url: 'https://example.com/jobs/phys-platform', summary: 'منصة شرح مرئي تبحث عن معلمة فيزياء لتقديم دروس مصورة قصيرة للمرحلة الثانوية، مع خبرة في التبسيط والرسوم التوضيحية.', score: 83, postedDaysAgo: 2, salary: 'حسب عدد الدروس' },
  { id: 'demo-9', title: 'معلم أحياء — مدارس عالمية', subject: 'bio', location: 'الرياض', mode: 'onsite', type: 'school', source: 'LinkedIn', url: 'https://www.linkedin.com/jobs/', summary: 'مدارس الرياض العالمية تعلن عن وظيفة معلم أحياء (Biology) للمنهج الأمريكي، يشترط إجادة اللغة الإنجليزية وخبرة لا تقل عن سنتين.', score: 87, postedDaysAgo: 4, salary: 'راتب مجزٍ + تأمين' },
  { id: 'demo-10', title: 'معلم كيمياء — معهد علمي', subject: 'chem', location: 'البريمي', mode: 'onsite', type: 'institute', source: 'Bayt', url: 'https://www.bayt.com/', summary: 'معهد البريمي العلمي يحتاج معلم كيمياء لدورات تأسيسية لطلاب الجامعة، دوام جزئي مسائي، مع أولوية لحملة الماجستير.', score: 76, postedDaysAgo: 5, salary: 'بالساعة' }
];

const SUBJECT_LABELS = { chem: 'كيمياء', phys: 'فيزياء', bio: 'أحياء' };
const TYPE_LABELS = { private: 'دروس خصوصية', remedial: 'تقوية', institute: 'معاهد', school: 'مدارس', platform: 'منصات' };
const MODE_LABELS = { online: 'أونلاين', onsite: 'حضوري' };

/* ===== الحالة ===== */
const state = {
  jobs: [],
  isDemo: false,
  filters: { subject: 'all', location: 'all', mode: 'all', type: 'all', savedOnly: false, q: '' },
  saved: new Set()
};

/* ===== أدوات مساعدة ===== */
function $(sel) { return document.querySelector(sel); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function normalizeArabic(s) {
  return String(s || '').toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و');
}
function postedLabel(days) {
  if (days === 0) return 'اليوم';
  if (days === 1) return 'أمس';
  if (days === 2) return 'قبل يومين';
  return 'قبل ' + days + ' أيام';
}
function sourceInitial(source) {
  const s = String(source || '?').trim();
  return s.charAt(0);
}

/* ===== الحفظ (localStorage) ===== */
function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) { return new Set(); }
}
function persistSaved() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(state.saved))); } catch (e) { /* تجاهل: التخزين غير متاح */ }
}
function toggleSave(id, btn) {
  if (state.saved.has(id)) state.saved.delete(id);
  else state.saved.add(id);
  persistSaved();
  renderAll();
  if (btn) btn.focus();
}

/* ===== جلب البيانات ===== */
function normalizeJob(j, i) {
  const subject = ['chem', 'phys', 'bio'].includes(j.subject) ? j.subject : 'chem';
  return {
    id: String(j.id || ('job-' + i)),
    title: j.title || 'وظيفة بدون عنوان',
    subject: subject,
    location: j.location || 'عن بُعد',
    mode: j.mode === 'onsite' ? 'onsite' : 'online',
    type: ['private', 'remedial', 'institute', 'school', 'platform'].includes(j.type) ? j.type : 'platform',
    source: j.source || 'مصدر غير معروف',
    url: j.url || '#',
    summary: j.summary || '',
    score: typeof j.score === 'number' ? Math.max(0, Math.min(100, Math.round(j.score))) : 70,
    postedDaysAgo: typeof j.postedDaysAgo === 'number' ? j.postedDaysAgo : 0,
    salary: j.salary || ''
  };
}

async function loadJobs() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, FETCH_TIMEOUT_MS);
    const res = await fetch(JOBS_ENDPOINT, { signal: ctrl.signal, headers: { 'Accept': 'application/json' } });
    clearTimeout(timer);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const list = Array.isArray(data) ? data : (Array.isArray(data.jobs) ? data.jobs : (Array.isArray(data.data) ? data.data : null));
    if (!list || list.length === 0) throw new Error('empty jobs');
    state.jobs = list.map(normalizeJob);
    state.isDemo = false;
  } catch (e) {
    // الـ API مش جاهز أو فشل — fallback للبيانات التجريبية
    state.jobs = DEMO_JOBS.map(normalizeJob);
    state.isDemo = true;
  }
  $('#demoBanner').hidden = !state.isDemo;
}

/* ===== الفلترة (منطق نقي — قابل للاختبار) ===== */
function applyFilters(jobs, filters, saved) {
  const q = normalizeArabic((filters.q || '').trim());
  return jobs.filter(function (j) {
    if (filters.subject !== 'all' && j.subject !== filters.subject) return false;
    if (filters.location !== 'all' && j.location !== filters.location) return false;
    if (filters.mode !== 'all' && j.mode !== filters.mode) return false;
    if (filters.type !== 'all' && j.type !== filters.type) return false;
    if (filters.savedOnly && !saved.has(j.id)) return false;
    if (q) {
      const hay = normalizeArabic([j.title, j.summary, j.source, j.location, SUBJECT_LABELS[j.subject], TYPE_LABELS[j.type], MODE_LABELS[j.mode], j.salary].join(' '));
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
}

/* ===== العرض ===== */
function jobCardHTML(j) {
  const isSaved = state.saved.has(j.id);
  const modeClass = j.mode === 'online' ? 'mode-online' : 'mode-onsite';
  return '' +
  '<article class="job-card" data-id="' + esc(j.id) + '">' +
    '<div class="job-head">' +
      '<span class="source-logo" data-source="' + esc(j.source) + '" aria-hidden="true">' + esc(sourceInitial(j.source)) + '</span>' +
      '<div class="job-title-wrap">' +
        '<h2 class="job-title">' + esc(j.title) + '</h2>' +
        '<p class="job-source">' + esc(j.source) + ' • <span class="posted">' + esc(postedLabel(j.postedDaysAgo)) + '</span>' + (j.salary ? ' • ' + esc(j.salary) : '') + '</p>' +
      '</div>' +
    '</div>' +
    '<div class="job-meta">' +
      '<span class="tag">' + esc(SUBJECT_LABELS[j.subject]) + '</span>' +
      '<span class="tag ' + modeClass + '">' + esc(MODE_LABELS[j.mode]) + '</span>' +
      '<span class="tag">📍 ' + esc(j.location) + '</span>' +
      '<span class="tag">' + esc(TYPE_LABELS[j.type]) + '</span>' +
    '</div>' +
    '<p class="job-summary">' + esc(j.summary) + '</p>' +
    '<div class="job-foot">' +
      '<span class="score">مطابقة <b>' + j.score + '%</b><span class="score-bar"><i style="width:' + j.score + '%"></i></span></span>' +
      '<div class="job-actions">' +
        '<button type="button" class="btn btn-save' + (isSaved ? ' is-saved' : '') + '" data-action="save" data-id="' + esc(j.id) + '" aria-pressed="' + isSaved + '">' + (isSaved ? '⭐ محفوظة' : '☆ حفظ') + '</button>' +
        '<a class="btn btn-apply" href="' + esc(j.url) + '" target="_blank" rel="noopener noreferrer">تقديم ←</a>' +
      '</div>' +
    '</div>' +
  '</article>';
}

function renderJobs() {
  const filtered = applyFilters(state.jobs, state.filters, state.saved);
  const list = $('#jobsList');
  list.innerHTML = filtered.map(jobCardHTML).join('');
  $('#emptyState').hidden = filtered.length !== 0;
  $('#resultCount').textContent = filtered.length + ' وظيفة' + (filtered.length !== state.jobs.length ? ' من أصل ' + state.jobs.length : '');
  const active = [];
  if (state.filters.subject !== 'all') active.push('المادة: ' + SUBJECT_LABELS[state.filters.subject]);
  if (state.filters.location !== 'all') active.push('المكان: ' + state.filters.location);
  if (state.filters.mode !== 'all') active.push(MODE_LABELS[state.filters.mode]);
  if (state.filters.type !== 'all') active.push(TYPE_LABELS[state.filters.type]);
  if (state.filters.savedOnly) active.push('المحفوظة فقط');
  if (state.filters.q.trim()) active.push('بحث: «' + state.filters.q.trim() + '»');
  $('#activeFilters').textContent = active.length ? 'الفلاتر النشطة: ' + active.join(' • ') : '';
  return filtered;
}

function renderStats() {
  const today = state.jobs.filter(function (j) { return j.postedDaysAgo === 0; }).length;
  $('#statToday').textContent = today;
  $('#statTotal').textContent = state.jobs.length;
  $('#statSaved').textContent = state.saved.size;
  $('#savedTopCount').textContent = state.saved.size;
  const counts = {};
  state.jobs.forEach(function (j) { counts[j.source] = (counts[j.source] || 0) + 1; });
  const ranked = Object.keys(counts).map(function (k) { return [k, counts[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  if (ranked.length) {
    $('#statTopSource').textContent = ranked[0][0];
    $('#statTopSourceCount').textContent = ranked[0][1] + ' وظيفة';
  } else {
    $('#statTopSource').textContent = '—';
    $('#statTopSourceCount').textContent = '';
  }
  $('#sourceBreakdown').innerHTML = ranked.map(function (r) {
    return '<li><span>' + esc(r[0]) + '</span><strong>' + r[1] + '</strong></li>';
  }).join('');
  $('#lastUpdated').textContent = new Date().toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' });
}

function renderAll() {
  renderJobs();
  renderStats();
}

/* ===== ربط الأحداث ===== */
function setFilter(key, value) {
  state.filters[key] = value;
  document.querySelectorAll('.chip-row[data-filter="' + key + '"] .chip').forEach(function (c) {
    c.classList.toggle('is-active', c.dataset.value === value);
  });
  renderAll();
}

function resetFilters() {
  state.filters = { subject: 'all', location: 'all', mode: 'all', type: 'all', savedOnly: false, q: '' };
  document.querySelectorAll('.chip-row .chip').forEach(function (c) {
    c.classList.toggle('is-active', c.dataset.value === 'all');
  });
  $('#savedOnly').checked = false;
  $('#savedTopBtn').setAttribute('aria-pressed', 'false');
  const si = $('#searchInput');
  si.value = '';
  $('#clearSearch').hidden = true;
  renderAll();
}

function bindEvents() {
  document.querySelectorAll('.chip-row').forEach(function (row) {
    row.addEventListener('click', function (e) {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      setFilter(row.dataset.filter, btn.dataset.value);
    });
  });

  $('#savedOnly').addEventListener('change', function (e) {
    state.filters.savedOnly = e.target.checked;
    renderAll();
  });

  $('#savedTopBtn').addEventListener('click', function () {
    const on = !state.filters.savedOnly;
    state.filters.savedOnly = on;
    $('#savedOnly').checked = on;
    this.setAttribute('aria-pressed', String(on));
    renderAll();
    document.querySelector('.feed').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const searchInput = $('#searchInput');
  searchInput.addEventListener('input', function () {
    state.filters.q = searchInput.value;
    $('#clearSearch').hidden = !searchInput.value;
    renderAll();
  });
  $('#clearSearch').addEventListener('click', function () {
    searchInput.value = '';
    state.filters.q = '';
    this.hidden = true;
    searchInput.focus();
    renderAll();
  });

  $('#jobsList').addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action="save"]');
    if (!btn) return;
    toggleSave(btn.dataset.id, btn);
  });

  $('#resetFilters').addEventListener('click', resetFilters);
  $('#emptyReset').addEventListener('click', resetFilters);

  $('#refreshBtn').addEventListener('click', async function () {
    this.disabled = true;
    this.textContent = '⏳ جارٍ التحديث…';
    await loadJobs();
    renderAll();
    this.disabled = false;
    this.textContent = '↻ تحديث';
  });
}

/* ===== إقلاع ===== */
document.addEventListener('DOMContentLoaded', async function () {
  state.saved = loadSaved();
  bindEvents();
  await loadJobs();
  renderAll();
});

// للاختبار الآلي: منطق الفلترة والبيانات التجريبية مكشوفة
window.__cjt = { applyFilters: applyFilters, DEMO_JOBS: DEMO_JOBS, state: state, SUBJECT_LABELS: SUBJECT_LABELS };
