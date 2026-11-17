/* شغلي — Frontend (واجهة فيسبوك-ستايل + إشعارات داخل التطبيق)
 * يجلب الوظائف من Worker API على /api/jobs، ولو فشل يعرض بيانات تجريبية واقعية الشكل.
 * الإشعارات: نفس الوظائف الجديدة التي تطلق تنبيه الإيميل تظهر هنا أيضاً
 * (جرس + قائمة منسدلة + Toast + إشعار متصفح إن كان مسموحاً به مسبقاً).
 */
'use strict';

/* ===== الإعدادات ===== */
const API_BASE = 'https://sho8ly.emailsaty.workers.dev';
const JOBS_ENDPOINT = API_BASE + '/api/jobs';
const FETCH_TIMEOUT_MS = 15000; // بيانات الموبايل البطيئة: 5 ثوانٍ كانت تقطع التحميل
const POLL_INTERVAL_MS = 60000;
const STORAGE_KEY = 'cjt_saved_v1';
const LIKED_KEY = 'sho8ly_liked_v1';
const NOTES_KEY = 'sho8ly_notes_v1';
const SEEN_KEY = 'sho8ly_seen_v1';
const NOTIF_READ_KEY = 'sho8ly_notif_read_v1';

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
const STORY_SOURCES = ['LinkedIn', 'Bayt', 'Tanqeeb', 'Indeed'];

/* ===== الحالة ===== */
const state = {
  jobs: [],
  isDemo: false,
  apiError: false,
  stale: false, // فشل تحديث دوري بينما توجد وظائف معروضة بالفعل
  lastSyncAt: null, // آخر تحميل ناجح من الـ API
  filters: { subject: 'all', location: 'all', mode: 'all', type: 'all', source: 'all', savedOnly: false, q: '' },
  saved: new Set(),
  liked: new Set(),
  notes: {}
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
// أسماء المصادر للعرض: الـ API يعيد معرّفات صغيرة (linkedin, tanqeeb, bayt)
// بينما بيانات العرض تستخدم الأسماء الكبيرة — التوحيد هنا يصلح عدّادات
// الستوريز والفلترة بالمصدر (كانت تظهر "0 وظيفة" رغم وجود وظائف).
const SOURCE_LABELS = { linkedin: 'LinkedIn', bayt: 'Bayt', tanqeeb: 'Tanqeeb', indeed: 'Indeed', preply: 'Preply' };
function sourceLabel(source) {
  const s = String(source || '').trim();
  return SOURCE_LABELS[s.toLowerCase()] || s || 'مصدر غير معروف';
}
// شعارات المصادر الحقيقية: صورة الشعار داخل إطار دائري أبيض (نمط فيسبوك).
// المصدر الأول: خدمة أيقونات Google — تم التحقق بـ curl أنها ترجع 200 PNG
// (128×128) لكل من linkedin.com وbayt.com وsaudi.tanqeeb.com وindeed.com
// وpreply.com. خدمة Clearbit محجوبة من هذا الجهاز (curl 000) لكنها تعمل
// على الشبكات العادية، فهي المصدر الاحتياطي الثاني؛ وإن فشل الاثنان
// تظهر أيقونة 💼 المحايدة. اسم المصدر يظهر نصاً بجانب الشعار دائماً.
const SOURCE_DOMAINS = {
  linkedin: 'linkedin.com', bayt: 'bayt.com', tanqeeb: 'saudi.tanqeeb.com',
  indeed: 'indeed.com', preply: 'preply.com',
  'منصة نفهم': 'nafeham.com', 'منصة مدرستي': 'madrasati.sa'
};
function sourceDomain(source) {
  const s = String(source || '').trim();
  return SOURCE_DOMAINS[s.toLowerCase()] || SOURCE_DOMAINS[s] || '';
}
function logoUrl(source, stage) {
  const d = sourceDomain(source);
  if (!d) return '';
  return stage === 0
    ? 'https://www.google.com/s2/favicons?domain=' + d + '&sz=128'
    : 'https://logo.clearbit.com/' + d;
}
function sourceAvatarHTML(source, wrapperClass) {
  const cls = wrapperClass || 'source-logo';
  const d = sourceDomain(source);
  if (!d) return '<span class="' + cls + ' avatar-fallback" aria-hidden="true">💼</span>';
  return '<span class="' + cls + '" aria-hidden="true">' +
    '<img class="logo-img" src="' + logoUrl(source, 0) + '" data-domain="' + esc(d) + '" data-stage="0" alt="" loading="lazy">' +
    '</span>';
}
function safeScroll(el) {
  if (!el) return;
  try { if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { /* بيئة بلا تمرير */ }
}

/* معرّف مستقر للوظيفة: هاش من الرابط + العنوان (الـ API لا يعيد حقل id).
 * نفس الرابط + نفس العنوان يعطيان دائماً نفس المعرّف، فالحفظ والإعجاب
 * والإشعارات تبقى سليمة بين الزيارات والفحوصات. */
function stableId(url, title) {
  const s = String(url || '') + '|' + String(title || '');
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h + s.charCodeAt(i)) >>> 0);
  }
  return 'u' + h.toString(36);
}

function daysBetween(dateStr) {
  const t = Date.parse(dateStr);
  if (isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function inferSubject(j) {
  if (['chem', 'phys', 'bio'].includes(j.subject)) return j.subject;
  const subs = Array.isArray(j.subjects) ? j.subjects.join(' ') : '';
  const hay = (subs + ' ' + (j.title || '') + ' ' + (j.description || '')).toLowerCase();
  if (/chem|كيمياء|كيميا/.test(hay)) return 'chem';
  if (/phys|فيزياء|فيزيا/.test(hay)) return 'phys';
  if (/bio|أحياء|احياء|biology/.test(hay)) return 'bio';
  return 'chem';
}

function inferType(j) {
  if (['private', 'remedial', 'institute', 'school', 'platform'].includes(j.type)) return j.type;
  const hay = ((j.title || '') + ' ' + (j.description || ''));
  if (/خصوصي|private tutor|tutoring/i.test(hay)) return 'private';
  if (/تقوية|remedial/i.test(hay)) return 'remedial';
  if (/معهد|institute/i.test(hay)) return 'institute';
  if (/مدرسة|مدارس|school/i.test(hay)) return 'school';
  if (/منصة|platform/i.test(hay)) return 'platform';
  return 'platform';
}

function inferMode(j) {
  if (j.mode === 'onsite' || j.mode === 'online') return j.mode;
  if (j.locationMode === 'onsite') return 'onsite';
  if (j.locationMode === 'online') return 'online';
  const loc = String(j.location || '');
  if (loc && loc !== 'عن بُعد' && loc !== 'Remote') return 'onsite';
  return 'online';
}

/* المكان المعروض في الكرت والإشعارات والفلاتر: الوظيفة الأونلاين تُعرض
 * «أونلاين» حتى لو كان المعلن في مدينة (مثلاً إعلان حراج من جدة يعرض
 * «أونلاين زووم» أيضاً) — المدينة مقر المعلن للحضوري، والوظيفة نفسها عن بُعد. */
function displayLocation(j) {
  if (j.mode === 'online' || j.locationMode === 'online') return 'أونلاين';
  const loc = String(j.location || '').trim();
  return loc || 'غير محدد';
}

/* ===== التخزين المحلي ===== */
function loadSet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) { return null; }
}
function persistSet(key, set) {
  try { localStorage.setItem(key, JSON.stringify(Array.from(set))); } catch (e) { /* تجاهل */ }
}
function loadSaved() { return loadSet(STORAGE_KEY) || new Set(); }
function loadLiked() { return loadSet(LIKED_KEY) || new Set(); }
function loadNotes() {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return (obj && typeof obj === 'object') ? obj : {};
  } catch (e) { return {}; }
}
function persistNotes() {
  try { localStorage.setItem(NOTES_KEY, JSON.stringify(state.notes)); } catch (e) { /* تجاهل */ }
}
function loadSeen() { return loadSet(SEEN_KEY); }
function persistSeen(set) { persistSet(SEEN_KEY, set); }
function loadNotifRead() { return loadSet(NOTIF_READ_KEY) || new Set(); }
function persistNotifRead(set) { persistSet(NOTIF_READ_KEY, set); }

function toggleSave(id, btn) {
  if (state.saved.has(id)) state.saved.delete(id);
  else state.saved.add(id);
  persistSet(STORAGE_KEY, state.saved);
  renderAll();
  if (btn) btn.focus();
}
function toggleLike(id) {
  if (state.liked.has(id)) state.liked.delete(id);
  else state.liked.add(id);
  persistSet(LIKED_KEY, state.liked);
  renderJobs();
}

/* ===== جلب البيانات + كشف الجديد ===== */
function normalizeJob(j, i) {
  const isDemo = typeof j.id === 'string' && j.id.indexOf('demo-') === 0;
  const id = isDemo ? j.id : stableId(j.url, j.title);
  // عدد الأيام منذ أول ظهور: من firstSeenAt أولاً، ثم postedAt، ثم القيمة الجاهزة.
  let days = typeof j.postedDaysAgo === 'number' ? j.postedDaysAgo : 0;
  const fromFirstSeen = j.firstSeenAt ? daysBetween(j.firstSeenAt) : null;
  const fromPosted = j.postedAt ? daysBetween(j.postedAt) : null;
  if (fromFirstSeen !== null) days = fromFirstSeen;
  else if (fromPosted !== null) days = fromPosted;
  return {
    id: id,
    title: j.title || 'وظيفة بدون عنوان',
    company: j.company || '',
    subject: inferSubject(j),
    location: j.location || 'عن بُعد',
    mode: inferMode(j),
    type: inferType(j),
    source: sourceLabel(j.source),
    url: j.url || '#',
    summary: j.description || j.summary || '',
    score: typeof j.score === 'number' ? Math.max(0, Math.min(100, Math.round(j.score))) : 70,
    postedDaysAgo: days,
    salary: j.salary || '',
    firstSeenAt: j.firstSeenAt || j.postedAt || null,
    locationMode: j.locationMode || null,
    locationReason: j.locationReason || ''
  };
}

async function loadJobs() {
  let list;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, FETCH_TIMEOUT_MS);
    const res = await fetch(JOBS_ENDPOINT, { signal: ctrl.signal, headers: { 'Accept': 'application/json' } });
    clearTimeout(timer);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    list = Array.isArray(data) ? data : (Array.isArray(data.jobs) ? data.jobs : (Array.isArray(data.data) ? data.data : null));
    if (!list || list.length === 0) throw new Error('empty jobs');
    state.isDemo = false;
  } catch (e) {
    // فشل الاتصال بالـ API (شبكة / CORS / مهلة):
    // - إن كانت توجد وظائف معروضة بالفعل (فشل تحديث دوري أو إعادة تحميل
    //   يدوية بينما النت ضعيف): لا نمسحها أبداً ولا نعرض بطاقة الخطأ
    //   الكبيرة — نكتفي بشريط "بيانات قديمة" صغير مع زر إعادة محاولة،
    //   والوظائف تظل ظاهرة. (هذا ما حدث للمستخدم: تحديث دوري فشل بينما
    //   النت 0 K/s فمُسحت الوظائف وظهرت بطاقة الخطأ رغم أن السيرفر سليم.)
    // - إن لم توجد وظائف أصلاً (فشل التحميل الأول): بطاقة الخطأ الكبيرة
    //   مع زر إعادة محاولة، والبيانات التجريبية اختيار صريح فقط.
    if (state.jobs.length > 0) {
      state.stale = true;
      state.apiError = false;
      updateNotifBadge();
      renderAll();
      return;
    }
    state.jobs = [];
    state.isDemo = false;
    state.apiError = true;
    state.stale = false;
    $('#demoBanner').hidden = true;
    updateNotifBadge();
    renderAll();
    return;
  }
  const normalized = list.map(normalizeJob);
  state.apiError = false;
  state.stale = false;
  state.lastSyncAt = new Date();

  // كشف الوظائف الجديدة مقارنة بما رأيناه من قبل.
  const prevSeen = loadSeen(); // null في أول زيارة
  const isFirstVisit = prevSeen === null;
  const newOnes = isFirstVisit ? [] : normalized.filter(function (j) { return !prevSeen.has(j.id); });

  const seen = prevSeen || new Set();
  normalized.forEach(function (j) { seen.add(j.id); });
  persistSeen(seen);

  if (isFirstVisit) {
    // أول زيارة: تسجيل صامت — لا فيض من 19 إشعاراً عن وظائف قديمة.
    persistNotifRead(new Set(normalized.map(function (j) { return j.id; })));
  } else {
    newOnes.forEach(function (j) { notifyNewJob(j); });
  }

  state.jobs = normalized;
  $('#demoBanner').hidden = !state.isDemo;
  updateNotifBadge();
  renderAll();
}

/* البيانات التجريبية اختيار صريح فقط (من حالة الخطأ) — لا إشعارات عنها. */
function showDemo() {
  state.jobs = DEMO_JOBS.map(normalizeJob);
  state.isDemo = true;
  state.apiError = false;
  state.stale = false;
  const prevSeen = loadSeen();
  if (prevSeen === null) {
    persistSeen(new Set(state.jobs.map(function (j) { return j.id; })));
    persistNotifRead(new Set(state.jobs.map(function (j) { return j.id; })));
  } else {
    // البيانات التجريبية لا تولّد إشعارات أبداً: تسجيل صامت في seen وفي read.
    const read = loadNotifRead();
    state.jobs.forEach(function (j) { prevSeen.add(j.id); read.add(j.id); });
    persistSeen(prevSeen);
    persistNotifRead(read);
  }
  $('#demoBanner').hidden = false;
  updateNotifBadge();
  renderAll();
}

/* ===== الإشعارات داخل التطبيق ===== */
function getUnreadJobs() {
  const read = loadNotifRead();
  return state.jobs.filter(function (j) { return !read.has(j.id); });
}
function updateNotifBadge() {
  const unread = getUnreadJobs().length;
  const badge = $('#notifBadge');
  badge.textContent = unread > 99 ? '99+' : String(unread);
  badge.hidden = unread === 0;
  const menuCount = $('#notifMenuCount');
  menuCount.textContent = badge.textContent;
  menuCount.hidden = unread === 0;
}
function showToast(msg) {
  const wrap = $('#toastWrap');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  wrap.appendChild(el);
  while (wrap.children.length > 3) wrap.removeChild(wrap.firstChild);
  setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 5000);
}
function maybeBrowserNotify(job) {
  // إشعار متصفح فقط إن كان الإذن ممنوحاً مسبقاً — لا نطلب الإذن تلقائياً أبداً.
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('🎯 وظيفة جديدة: ' + job.title, { body: job.source + ' • ' + displayLocation(job) });
    }
  } catch (e) { /* تجاهل */ }
}
function notifyNewJob(job) {
  showToast('🎯 وظيفة جديدة: ' + job.title + ' — ' + job.source);
  maybeBrowserNotify(job);
}
function renderNotifs() {
  const unread = getUnreadJobs().slice().sort(function (a, b) { return (a.postedDaysAgo - b.postedDaysAgo); });
  const list = $('#notifList');
  const empty = $('#notifEmpty');
  empty.hidden = unread.length !== 0;
  list.innerHTML = unread.map(function (j) {
    return '' +
    '<button type="button" class="notif-item is-unread" data-notif-id="' + esc(j.id) + '">' +
      sourceAvatarHTML(j.source, 'source-logo source-logo-sm') +
      '<span class="notif-body">' +
        '<span class="notif-title">وظيفة جديدة: ' + esc(j.title) + '</span>' +
        '<span class="notif-meta">' + esc(j.source) + ' • ' + esc(displayLocation(j)) + ' • ' + esc(postedLabel(j.postedDaysAgo)) + '</span>' +
      '</span>' +
      '<span class="unread-dot" aria-hidden="true"></span>' +
    '</button>';
  }).join('');
}
function openNotifDropdown() {
  renderNotifs();
  const dd = $('#notifDropdown');
  dd.hidden = false;
  $('#bellBtn').setAttribute('aria-expanded', 'true');
  const row = $('#enableBrowserNotif');
  try {
    row.hidden = (typeof Notification === 'undefined') || Notification.permission === 'granted';
  } catch (e) { row.hidden = true; }
}
function closeNotifDropdown() {
  $('#notifDropdown').hidden = true;
  $('#bellBtn').setAttribute('aria-expanded', 'false');
}
function markNotifRead(id) {
  const read = loadNotifRead();
  read.add(id);
  persistNotifRead(read);
  updateNotifBadge();
  renderNotifs();
}
function markAllNotifsRead() {
  persistNotifRead(new Set(state.jobs.map(function (j) { return j.id; })));
  updateNotifBadge();
  renderNotifs();
}
function goToJob(id) {
  closeNotifDropdown();
  // الوظيفة قد تكون مخفية بفلتر — نعيد التعيين أولاً لضمان ظهورها.
  if (!document.querySelector('.job-card[data-id="' + id + '"]')) resetFilters();
  const card = document.querySelector('.job-card[data-id="' + id + '"]');
  if (!card) return;
  safeScroll(card);
  card.classList.remove('flash');
  void card.offsetWidth; // إعادة تشغيل الحركة
  card.classList.add('flash');
  setTimeout(function () { card.classList.remove('flash'); }, 2500);
}

/* محاكاة وظيفة جديدة (للاختبار الآلي عبر window.__cjt.injectJob) */
function injectJob(raw) {
  const j = normalizeJob(raw, state.jobs.length);
  const seen = loadSeen() || new Set();
  const isNew = !seen.has(j.id);
  state.jobs.unshift(j);
  if (isNew) {
    seen.add(j.id);
    persistSeen(seen);
    notifyNewJob(j);
  }
  updateNotifBadge();
  renderAll();
  return j;
}

/* ===== الفلترة (منطق نقي — قابل للاختبار) ===== */
function applyFilters(jobs, filters, saved) {
  const q = normalizeArabic((filters.q || '').trim());
  return jobs.filter(function (j) {
    if (filters.subject !== 'all' && j.subject !== filters.subject) return false;
    if (filters.location !== 'all' && displayLocation(j) !== filters.location) return false;
    if (filters.mode !== 'all' && j.mode !== filters.mode) return false;
    if (filters.type !== 'all' && j.type !== filters.type) return false;
    if (filters.source !== 'all' && j.source !== filters.source) return false;
    if (filters.savedOnly && !saved.has(j.id)) return false;
    if (q) {
      const hay = normalizeArabic([j.title, j.summary, j.source, j.company, j.location, SUBJECT_LABELS[j.subject], TYPE_LABELS[j.type], MODE_LABELS[j.mode], j.salary].join(' '));
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
}

/* ===== العرض ===== */
function jobCardHTML(j) {
  const isSaved = state.saved.has(j.id);
  const isLiked = state.liked.has(j.id);
  const note = state.notes[j.id] || '';
  const modeClass = j.mode === 'online' ? 'mode-online' : 'mode-onsite';
  const companyLine = j.company ? ' • ' + esc(j.company) : '';
  return '' +
  '<article class="job-card" data-id="' + esc(j.id) + '">' +
    '<div class="post-head">' +
      sourceAvatarHTML(j.source, 'source-logo') +
      '<div class="post-head-text">' +
        '<strong class="post-source">' + esc(j.source) + '</strong>' +
        '<span class="post-meta">' + esc(postedLabel(j.postedDaysAgo)) + ' • 📍 ' + esc(displayLocation(j)) + ' • 🌍 ' + esc(MODE_LABELS[j.mode]) + companyLine + '</span>' +
      '</div>' +
    '</div>' +
    '<h2 class="post-text">' + esc(j.title) + '</h2>' +
    (j.summary ? '<p class="job-summary">' + esc(j.summary) + '</p>' : '') +
    '<div class="job-meta">' +
      '<span class="tag">' + esc(SUBJECT_LABELS[j.subject]) + '</span>' +
      '<span class="tag ' + modeClass + '">' + esc(MODE_LABELS[j.mode]) + '</span>' +
      '<span class="tag">📍 ' + esc(displayLocation(j)) + '</span>' +
      '<span class="tag">' + esc(TYPE_LABELS[j.type]) + '</span>' +
      (j.salary ? '<span class="tag">💰 ' + esc(j.salary) + '</span>' : '') +
    '</div>' +
    '<div class="post-stats">' +
      (isLiked ? '<span>👍 أعجبك هذا</span>' : '<span>👍</span>') +
      (note ? '<span>💬 تعليق واحد</span>' : '') +
      (isSaved ? '<span>⭐ محفوظة</span>' : '') +
      '<span class="score">مطابقة <b>' + j.score + '%</b><span class="score-bar"><i style="width:' + j.score + '%"></i></span></span>' +
    '</div>' +
    '<div class="post-actions">' +
      '<button type="button" class="action-btn' + (isLiked ? ' is-liked' : '') + '" data-action="like" data-id="' + esc(j.id) + '" aria-pressed="' + isLiked + '">👍 أعجبني</button>' +
      '<button type="button" class="action-btn" data-action="comment" data-id="' + esc(j.id) + '">💬 تعليق</button>' +
      '<button type="button" class="action-btn" data-action="share" data-id="' + esc(j.id) + '">↗️ مشاركة</button>' +
      '<button type="button" class="action-btn' + (isSaved ? ' is-saved' : '') + '" data-action="save" data-id="' + esc(j.id) + '" aria-pressed="' + isSaved + '">' + (isSaved ? '⭐ محفوظة' : '☆ حفظ') + '</button>' +
      '<a class="btn btn-apply" href="' + esc(j.url) + '" target="_blank" rel="noopener noreferrer">تقديم ←</a>' +
    '</div>' +
    '<div class="comment-box" data-comment-box="' + esc(j.id) + '" hidden>' +
      '<input type="text" placeholder="اكتب ملاحظة على هذه الوظيفة…" value="' + esc(note) + '" data-note-input="' + esc(j.id) + '" aria-label="ملاحظة على الوظيفة">' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="save-note" data-id="' + esc(j.id) + '">حفظ الملاحظة</button>' +
      (note ? '<p class="saved-note">💬 ' + esc(note) + '</p>' : '') +
    '</div>' +
  '</article>';
}

function renderJobs() {
  const filtered = applyFilters(state.jobs, state.filters, state.saved);
  const list = $('#jobsList');
  list.innerHTML = filtered.map(jobCardHTML).join('');
  $('#apiErrorState').hidden = !state.apiError;
  const staleEl = $('#staleBanner');
  if (staleEl) {
    staleEl.hidden = !state.stale;
    const t = $('#staleTime');
    if (t && state.lastSyncAt) t.textContent = state.lastSyncAt.toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' });
  }
  $('#emptyState').hidden = state.apiError || filtered.length !== 0;
  $('#resultCount').textContent = filtered.length + ' وظيفة' + (filtered.length !== state.jobs.length ? ' من أصل ' + state.jobs.length : '');
  const active = [];
  if (state.filters.subject !== 'all') active.push('المادة: ' + SUBJECT_LABELS[state.filters.subject]);
  if (state.filters.location !== 'all') active.push('المكان: ' + state.filters.location);
  if (state.filters.mode !== 'all') active.push(MODE_LABELS[state.filters.mode]);
  if (state.filters.type !== 'all') active.push(TYPE_LABELS[state.filters.type]);
  if (state.filters.source !== 'all') active.push('المصدر: ' + state.filters.source);
  if (state.filters.savedOnly) active.push('المحفوظة فقط');
  if (state.filters.q.trim()) active.push('بحث: «' + state.filters.q.trim() + '»');
  $('#activeFilters').textContent = active.length ? 'الفلاتر النشطة: ' + active.join(' • ') : '';
  return filtered;
}

function renderStories() {
  const counts = {};
  state.jobs.forEach(function (j) { counts[j.source] = (counts[j.source] || 0) + 1; });
  const row = $('#storiesRow');
  let html = '' +
  '<button type="button" class="story-card story-create' + (state.filters.source === 'all' ? ' is-active' : '') + '" data-story="all">' +
    '<span class="story-create-top"><span class="story-plus" aria-hidden="true">＋</span></span>' +
    '<span class="story-label">مصدر جديد؟</span>' +
    '<span class="story-sub">اعرض كل المصادر</span>' +
  '</button>';
  STORY_SOURCES.forEach(function (src) {
    const n = counts[src] || 0;
    html += '' +
    '<button type="button" class="story-card' + (state.filters.source === src ? ' is-active' : '') + '" data-story="' + esc(src) + '">' +
      sourceAvatarHTML(src, 'story-avatar') +
      '<span class="story-label">' + esc(src) + '</span>' +
      '<span class="story-sub">' + n + ' وظيفة</span>' +
    '</button>';
  });
  row.innerHTML = html;
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
  $('#sourceList').innerHTML = ranked.map(function (r) {
    return '' +
    '<li><button type="button" class="source-row' + (state.filters.source === r[0] ? ' is-active' : '') + '" data-source-filter="' + esc(r[0]) + '">' +
      sourceAvatarHTML(r[0], 'source-logo source-logo-sm') +
      '<span class="source-row-name">' + esc(r[0]) + '</span>' +
      '<span class="online-dot" aria-hidden="true"></span>' +
      '<strong class="source-row-count">' + r[1] + '</strong>' +
    '</button></li>';
  }).join('');
  $('#lastUpdated').textContent = new Date().toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' });
}

function renderAll() {
  renderStories();
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
function setSourceFilter(source) {
  state.filters.source = source;
  renderAll();
}

function resetFilters() {
  state.filters = { subject: 'all', location: 'all', mode: 'all', type: 'all', source: 'all', savedOnly: false, q: '' };
  document.querySelectorAll('.chip-row .chip').forEach(function (c) {
    c.classList.toggle('is-active', c.dataset.value === 'all');
  });
  $('#savedOnly').checked = false;
  setNavActive('home');
  const si = $('#searchInput');
  si.value = '';
  $('#clearSearch').hidden = true;
  renderAll();
}

function setNavActive(which) {
  document.querySelectorAll('.nav-item').forEach(function (n) {
    n.classList.toggle('is-active', n.dataset.nav === which);
  });
  document.querySelectorAll('.side-menu .menu-item').forEach(function (m) {
    m.classList.toggle('is-active', m.dataset.menu === which);
  });
}

function toggleSavedView(on) {
  state.filters.savedOnly = on;
  $('#savedOnly').checked = on;
  setNavActive(on ? 'saved' : 'home');
  renderAll();
}

/* ===== درج القائمة (موبايل) + زر البحث ===== */
function openDrawer() {
  document.body.classList.add('drawer-open');
  const b = $('#menuBtn');
  if (b) b.setAttribute('aria-expanded', 'true');
  const o = $('#drawerOverlay');
  if (o) o.hidden = false;
}
function closeDrawer() {
  document.body.classList.remove('drawer-open');
  const b = $('#menuBtn');
  if (b) b.setAttribute('aria-expanded', 'false');
  const o = $('#drawerOverlay');
  if (o) o.hidden = true;
}
function toggleDrawer() {
  if (document.body.classList.contains('drawer-open')) closeDrawer();
  else openDrawer();
}
function showFilters() {
  // على الموبايل: الفلاتر تعيش في الدرج؛ على الديسكتوب: تمرير لبطاقة الفلاتر.
  if (window.innerWidth < 768) openDrawer();
  else safeScroll($('#filterCard'));
}

function shareJob(id) {
  const job = state.jobs.find(function (j) { return j.id === id; });
  const url = job ? job.url : '#';
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).catch(function () { /* تجاهل */ });
    }
  } catch (e) { /* تجاهل */ }
  showToast('تم النسخ: ' + url);
}

function bindEvents() {
  // سلسلة احتياط شعارات المصادر: Google favicons ← Clearbit ← 💼 المحايدة.
  // أحداث error لا تنتشر (bubbling) لكنها تُلتقط في مرحلة الالتقاط.
  document.addEventListener('error', function (e) {
    const img = e.target;
    if (!img || img.tagName !== 'IMG' || !img.classList || !img.classList.contains('logo-img')) return;
    const stage = parseInt(img.dataset.stage || '0', 10);
    if (stage === 0 && img.dataset.domain) {
      img.dataset.stage = '1';
      img.src = 'https://logo.clearbit.com/' + img.dataset.domain;
    } else {
      const wrap = img.parentNode;
      if (wrap) { wrap.classList.add('avatar-fallback'); wrap.textContent = '💼'; }
    }
  }, true);

  // درج القائمة (موبايل): همبرغر، غطاء، Esc، وأي نقرة داخل القائمة تغلقه.
  const menuBtn = $('#menuBtn');
  if (menuBtn) menuBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleDrawer(); });
  const overlay = $('#drawerOverlay');
  if (overlay) overlay.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeDrawer(); closeNotifDropdown(); } });
  const sideMenu = document.querySelector('.sidebar-menu');
  if (sideMenu) sideMenu.addEventListener('click', function (e) {
    if (e.target.closest('a, button') && document.body.classList.contains('drawer-open')) closeDrawer();
  });

  // زر البحث (موبايل): يفتح صف بحث كامل العرض تحت الشريط العلوي.
  const searchToggle = $('#searchToggleBtn');
  if (searchToggle) searchToggle.addEventListener('click', function () {
    document.body.classList.toggle('search-expanded');
    if (document.body.classList.contains('search-expanded')) $('#searchInput').focus();
  });

  document.querySelectorAll('.chip-row').forEach(function (row) {
    row.addEventListener('click', function (e) {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      setFilter(row.dataset.filter, btn.dataset.value);
    });
  });

  $('#savedOnly').addEventListener('change', function (e) {
    toggleSavedView(e.target.checked);
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

  // الستوريز: فلترة حسب المصدر
  $('#storiesRow').addEventListener('click', function (e) {
    const card = e.target.closest('[data-story]');
    if (!card) return;
    setSourceFilter(card.dataset.story);
  });
  // قائمة المصادر في السايدبار الأيسر
  $('#sourceList').addEventListener('click', function (e) {
    const row = e.target.closest('[data-source-filter]');
    if (!row) return;
    const src = row.dataset.sourceFilter;
    setSourceFilter(state.filters.source === src ? 'all' : src);
  });

  // التنقل العلوي
  $('#navHome').addEventListener('click', function () { resetFilters(); safeScroll($('.feed')); });
  $('#navSaved').addEventListener('click', function () { toggleSavedView(!state.filters.savedOnly); safeScroll($('.feed')); });
  $('#navSources').addEventListener('click', function () { setNavActive('sources'); safeScroll($('#sourcesCard')); });
  $('#navAbout').addEventListener('click', function () { setNavActive('about'); safeScroll($('#aboutCard')); });
  // القائمة الجانبية
  $('#menuHome').addEventListener('click', function () { resetFilters(); safeScroll($('.feed')); });
  $('#menuSaved').addEventListener('click', function () { toggleSavedView(!state.filters.savedOnly); safeScroll($('.feed')); });
  $('#menuFilters').addEventListener('click', function () { setNavActive('home'); showFilters(); });
  $('#menuNotifs').addEventListener('click', function () { openNotifDropdown(); });

  // صندوق النشر
  const focusSearch = function () { searchInput.focus(); safeScroll(searchInput); };
  $('#composerSearch').addEventListener('click', focusSearch);
  $('#composerSearchBtn').addEventListener('click', focusSearch);
  $('#composerFilterBtn').addEventListener('click', function () { showFilters(); });
  $('#composerRefreshBtn').addEventListener('click', async function () { await loadJobs(); showToast('تم التحديث'); });

  // الجرس والقائمة المنسدلة
  $('#bellBtn').addEventListener('click', function (e) {
    e.stopPropagation();
    if ($('#notifDropdown').hidden) openNotifDropdown();
    else closeNotifDropdown();
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#notifWrap')) closeNotifDropdown();
  });
  $('#markAllRead').addEventListener('click', function () { markAllNotifsRead(); });
  $('#enableBrowserNotif').addEventListener('click', function () {
    try {
      if (typeof Notification !== 'undefined' && Notification.requestPermission) {
        Notification.requestPermission().then(function () { openNotifDropdown(); });
      }
    } catch (e) { /* تجاهل */ }
  });
  $('#notifList').addEventListener('click', function (e) {
    const item = e.target.closest('[data-notif-id]');
    if (!item) return;
    markNotifRead(item.dataset.notifId);
    goToJob(item.dataset.notifId);
  });

  // أفعال كرت الوظيفة (نمط منشور فيسبوك)
  $('#jobsList').addEventListener('click', function (e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const id = el.dataset.id;
    const action = el.dataset.action;
    if (action === 'save') toggleSave(id, el);
    else if (action === 'like') toggleLike(id);
    else if (action === 'share') shareJob(id);
    else if (action === 'comment') {
      const box = document.querySelector('[data-comment-box="' + id + '"]');
      if (box) {
        box.hidden = !box.hidden;
        if (!box.hidden) {
          const input = box.querySelector('input');
          if (input) input.focus();
        }
      }
    } else if (action === 'save-note') {
      const input = document.querySelector('[data-note-input="' + id + '"]');
      const val = input ? input.value.trim() : '';
      if (val) state.notes[id] = val;
      else delete state.notes[id];
      persistNotes();
      renderJobs();
    }
  });

  $('#resetFilters').addEventListener('click', resetFilters);
  $('#emptyReset').addEventListener('click', resetFilters);

  // حالة خطأ الـ API: إعادة محاولة، أو عرض تجريبي اختياري صريح
  $('#retryApiBtn').addEventListener('click', async function () { await loadJobs(); });
  const staleRetry = $('#staleRetryBtn');
  if (staleRetry) staleRetry.addEventListener('click', async function () { await loadJobs(); });
  $('#showDemoBtn').addEventListener('click', function () { showDemo(); });
}

/* ===== إقلاع ===== */
document.addEventListener('DOMContentLoaded', async function () {
  state.saved = loadSaved();
  state.liked = loadLiked();
  state.notes = loadNotes();
  // PWA: تسجيل الـ Service Worker (كاش للأصول + شبكة أولاً للوظائف).
  try {
    if ('serviceWorker' in navigator && window.location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* تجاهل: لا SW */ });
    }
  } catch (e) { /* تجاهل */ }
  bindEvents();
  await loadJobs();
  // فحص دوري كل 60 ثانية: أي وظيفة جديدة تظهر إشعاراً + Toast.
  setInterval(function () { loadJobs(); }, POLL_INTERVAL_MS);
});

// للاختبار الآلي: منطق الفلترة والبيانات التجريبية مكشوفة
window.__cjt = {
  applyFilters: applyFilters,
  displayLocation: displayLocation,
  DEMO_JOBS: DEMO_JOBS,
  state: state,
  SUBJECT_LABELS: SUBJECT_LABELS,
  normalizeJob: normalizeJob,
  stableId: stableId,
  injectJob: injectJob,
  showDemo: showDemo,
  getUnreadCount: function () { return getUnreadJobs().length; },
  loadJobs: loadJobs,
  sourceAvatarHTML: sourceAvatarHTML,
  logoUrl: logoUrl,
  sourceDomain: sourceDomain,
  openDrawer: openDrawer,
  closeDrawer: closeDrawer
};
