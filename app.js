// ===== تعريف العادات =====
const PRAYERS = [
  { id: "fajr",    name: "الـفجر" },
  { id: "dhuhr",   name: "الـظهر" },
  { id: "asr",     name: "الـعصر" },
  { id: "maghrib", name: "الـمغرب" },
  { id: "isha",    name: "الـعشاء" },
];
const HABITS = [
  { id: "prayers", type: "group", name: "الـصلوات الـخمس", sub: "صلِّ كل فرض في وقته", emoji: "🕌", items: PRAYERS },
  { id: "food",    name: "الـأكل الـصحي",   sub: "وجبات متوازنة وماء كافٍ", emoji: "🥗" },
  { id: "sport",   name: "الـرياضة",       sub: "٣٠ دقيقة حركة على الأقل", emoji: "🏃" },
  { id: "book",    name: "قـراءة كـتاب",    sub: "بعض الصفحات كل يوم", emoji: "📖" },
  { id: "quran",   name: "صـفحة مـن الـقرآن", sub: "ورد يومي ثابت", emoji: "📿" },
];
const TOTAL = HABITS.length;
const STORE_KEY = "habits_app_v1";

// ===== أدوات التاريخ =====
const pad = (n) => String(n).padStart(2, "0");
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = () => keyOf(new Date());
function tomorrowKey() {
  const d = new Date(); d.setDate(d.getDate() + 1); return keyOf(d);
}
function addDays(base, n) { const d = new Date(base); d.setDate(d.getDate() + n); return d; }

const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

// ===== التخزين =====
function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
  catch { return {}; }
}
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

const state = load();
state.records = state.records || {}; // { "YYYY-MM-DD": { prayers:true, ... } }
state.tasks = state.tasks || {};     // { "YYYY-MM-DD": [ {id, text, done} ] }
state.bestStreak = state.bestStreak || 0;

// ===== منطق العادات =====
function dayRecord(k) { return state.records[k] || {}; }

// هل صلاة معينة مؤدّاة؟ (مع دعم البيانات القديمة حين كانت "prayers" قيمة واحدة)
function prayerDone(k, pid) {
  const r = dayRecord(k);
  const v = r["prayer_" + pid];
  return v !== undefined ? v : r.prayers === true;
}
// عدد الصلوات المؤدّاة في يوم
function prayersDoneCount(k) { return PRAYERS.filter(p => prayerDone(k, p.id)).length; }

// هل العادة (عادية أو مجموعة) مكتملة في هذا اليوم؟
function isHabitDone(k, habit) {
  if (habit.type === "group") return prayersDoneCount(k) === PRAYERS.length;
  return !!dayRecord(k)[habit.id];
}
function doneCount(k) { return HABITS.filter(h => isHabitDone(k, h)).length; }
function isFullDay(k) { return doneCount(k) === TOTAL; }

function toggleHabit(id) {
  const k = todayKey();
  state.records[k] = state.records[k] || {};
  state.records[k][id] = !state.records[k][id];
  save();
  renderHabits();
  renderDashboard();
}

function togglePrayer(pid) {
  const k = todayKey();
  state.records[k] = state.records[k] || {};
  state.records[k]["prayer_" + pid] = !prayerDone(k, pid);
  save();
  renderHabits();
  renderDashboard();
}

// ===== حساب الستريك (السلسلة) =====
function computeStreak() {
  const today = new Date();
  let start = 0;
  // إن لم يكتمل اليوم بعد، نبدأ العدّ من الأمس حتى لا تنكسر السلسلة أثناء اليوم
  if (!isFullDay(keyOf(today))) start = 1;
  let streak = 0;
  for (let i = start; i < 3650; i++) {
    if (isFullDay(keyOf(addDays(today, -i)))) streak++;
    else break;
  }
  if (streak > state.bestStreak) { state.bestStreak = streak; save(); }
  return streak;
}

// ===== رسم صفحة العادات =====
const habitsList = document.getElementById("habitsList");
function renderHabits() {
  const k = todayKey();
  const r = dayRecord(k);
  habitsList.innerHTML = HABITS.map(h => {
    if (h.type === "group") return renderPrayerGroup(k);
    return `
    <div class="habit ${r[h.id] ? "done" : ""}" data-id="${h.id}">
      <div class="habit-emoji">${h.emoji}</div>
      <div class="habit-body">
        <div class="habit-name">${h.name}</div>
        <div class="habit-sub">${h.sub}</div>
      </div>
      <div class="check"><span class="tick">✓</span></div>
    </div>`;
  }).join("");

  const done = doneCount(k);
  document.getElementById("habitsCount").textContent = `${done} / ${TOTAL}`;
  document.getElementById("habitsBar").style.width = `${(done / TOTAL) * 100}%`;
}

// صندوق الصلوات الخمس: عنوان واحد + كل صلاة على حدة
function renderPrayerGroup(k) {
  const g = HABITS.find(h => h.id === "prayers");
  const doneAll = isHabitDone(k, g);
  const count = prayersDoneCount(k);
  const items = PRAYERS.map(p => `
    <button type="button" class="prayer ${prayerDone(k, p.id) ? "done" : ""}" data-prayer="${p.id}">
      <span class="p-check">✓</span>
      <span class="p-name">${p.name}</span>
    </button>`).join("");
  return `
    <div class="habit-group ${doneAll ? "done" : ""}">
      <div class="group-head">
        <div class="habit-emoji">${g.emoji}</div>
        <div class="habit-body">
          <div class="habit-name">${g.name}</div>
          <div class="habit-sub">${g.sub}</div>
        </div>
        <span class="group-count">${count} / ${PRAYERS.length}</span>
      </div>
      <div class="prayers-grid">${items}</div>
    </div>`;
}

habitsList.addEventListener("click", (e) => {
  const prayerEl = e.target.closest(".prayer");
  if (prayerEl) { togglePrayer(prayerEl.dataset.prayer); return; }
  const el = e.target.closest(".habit");
  if (el) toggleHabit(el.dataset.id);
});

// ===== مهام الغد =====
const tasksList = document.getElementById("tasksList");
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const tasksEmpty = document.getElementById("tasksEmpty");

function renderTasks() {
  const k = tomorrowKey();
  const list = state.tasks[k] || [];
  tasksList.innerHTML = list.map(t => `
    <li class="task-item ${t.done ? "done" : ""}" data-id="${t.id}">
      <div class="task-check">${t.done ? "✓" : ""}</div>
      <span class="task-text">${escapeHtml(t.text)}</span>
      <button class="task-del" title="حذف">✕</button>
    </li>`).join("");
  tasksEmpty.classList.toggle("hide", list.length > 0);
}
taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;
  const k = tomorrowKey();
  state.tasks[k] = state.tasks[k] || [];
  // إضافة المهمة الجديدة في أعلى القائمة
  state.tasks[k].unshift({ id: Date.now(), text, done: false });
  taskInput.value = "";
  save();
  renderTasks();
});
tasksList.addEventListener("click", (e) => {
  const li = e.target.closest(".task-item");
  if (!li) return;
  const k = tomorrowKey();
  const id = Number(li.dataset.id);
  const list = state.tasks[k] || [];
  if (e.target.closest(".task-del")) {
    state.tasks[k] = list.filter(t => t.id !== id);
  } else {
    const t = list.find(x => x.id === id);
    if (t) t.done = !t.done;
  }
  save();
  renderTasks();
});

// ===== لوحة التحكم =====
function renderDashboard() {
  const k = todayKey();
  const done = doneCount(k);
  const pct = Math.round((done / TOTAL) * 100);

  // الحلقة
  const R = 52, C = 2 * Math.PI * R; // ≈ 326.7
  const ring = document.getElementById("ringFill");
  ring.style.strokeDashoffset = C * (1 - done / TOTAL);
  document.getElementById("ringPercent").textContent = `${pct}%`;

  // الستريك
  const streak = computeStreak();
  document.getElementById("streakNum").textContent = streak;
  document.getElementById("bestStreak").textContent = state.bestStreak;
  document.getElementById("flame").classList.toggle("cold", streak === 0);

  // الإحصائيات
  let week = 0, total = 0;
  Object.keys(state.records).forEach(dk => { total += doneCount(dk); });
  for (let i = 0; i < 7; i++) week += doneCount(keyOf(addDays(new Date(), -i)));
  document.getElementById("statToday").textContent = done;
  document.getElementById("statWeek").textContent = week;
  document.getElementById("statTotal").textContent = total;

  // أعمدة آخر 7 أيام
  const bars = document.getElementById("weekBars");
  let html = "";
  for (let i = 6; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    const c = doneCount(keyOf(d));
    const h = Math.round((c / TOTAL) * 100);
    const full = c === TOTAL;
    const isToday = i === 0;
    html += `
      <div class="day-col">
        <div class="day-bar-track">
          <div class="day-bar ${full ? "full" : ""}" style="height:${h}%"></div>
        </div>
        <div class="day-name ${isToday ? "today" : ""}">${DAY_NAMES[d.getDay()]}</div>
      </div>`;
  }
  bars.innerHTML = html;
}

// ===== التنقل بين الصفحات =====
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("page-" + tab.dataset.page).classList.add("active");
    if (tab.dataset.page === "dashboard") renderDashboard();
  });
});

// ===== أدوات مساعدة =====
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function setTodayDate() {
  const opts = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  document.getElementById("todayDate").textContent = new Date().toLocaleDateString("ar", opts);
  const t = addDays(new Date(), 1);
  document.getElementById("tasksDate").textContent = t.toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long" });
}

// ===== الإقلاع =====
setTodayDate();
renderHabits();
renderTasks();
renderDashboard();
