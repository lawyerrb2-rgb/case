// =============================================================
// ui/calendar.js — ปฏิทินรายเดือนแสดงนัดหมายที่ยังมาไม่ถึงทั้งหมด
// =============================================================
// ดึงข้อมูลทีละเดือน (ไม่โหลดทั้งระบบรวดเดียว) เพื่อให้ยังเร็วเมื่อองค์กรมีนัดหมายจำนวนมาก
// วันที่ผ่านมาแล้วจะไม่แสดงนัด เพราะเป็นมุมมอง "ที่ยังมาไม่ถึง" เหมือนกล่องบนแดชบอร์ด
import { listUpcomingSchedulesInRange } from "../api/schedules.js";
import { escapeHtml, formatDateTimeTH } from "../utils.js";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MAX_CHIPS_PER_DAY = 2;

const cal = {
  year: 0,
  month: 0, // 0-11
  eventsByDay: {}, // "YYYY-MM-DD" (เวลาท้องถิ่น) -> [schedule]
  selectedDay: null,
};

const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const isOpen = () => !document.getElementById("calendarModal").classList.contains("hidden");

export function initCalendar() {
  document.getElementById("btnOpenCalendar").addEventListener("click", openCalendar);
  document.getElementById("btnCloseCalendar").addEventListener("click", closeCalendar);
  document.getElementById("btnCalendarPrev").addEventListener("click", () => shiftMonth(-1));
  document.getElementById("btnCalendarNext").addEventListener("click", () => shiftMonth(1));
  document.getElementById("btnCalendarToday").addEventListener("click", goToCurrentMonth);

  document.getElementById("calendarGrid").addEventListener("click", (e) => {
    const cell = e.target.closest("[data-day]");
    if (!cell) return;
    cal.selectedDay = cell.dataset.day;
    renderGrid();
    renderDayDetail();
  });
}

function closeCalendar() {
  document.getElementById("calendarModal").classList.add("hidden");
}

async function openCalendar() {
  document.getElementById("calendarModal").classList.remove("hidden");
  await goToCurrentMonth();
}

async function goToCurrentMonth() {
  const now = new Date();
  cal.year = now.getFullYear();
  cal.month = now.getMonth();
  cal.selectedDay = dayKey(now);
  await loadMonth();
}

async function shiftMonth(delta) {
  const d = new Date(cal.year, cal.month + delta, 1);
  const now = new Date();
  // ไม่ให้ย้อนไปก่อนเดือนปัจจุบัน — ปฏิทินนี้แสดงเฉพาะนัดที่ยังมาไม่ถึง
  if (d < new Date(now.getFullYear(), now.getMonth(), 1)) return;
  cal.year = d.getFullYear();
  cal.month = d.getMonth();
  cal.selectedDay = null;
  await loadMonth();
}

/** เรียกหลังมีการเพิ่ม/แก้ไข/ลบนัดหมายหรือคดี เพื่อให้ปฏิทินที่เปิดค้างอยู่เป็นปัจจุบัน */
export async function refreshCalendarIfOpen() {
  if (isOpen()) await loadMonth();
}

async function loadMonth() {
  const label = document.getElementById("calendarMonthLabel");
  label.textContent = new Date(cal.year, cal.month, 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" });

  const now = new Date();
  document.getElementById("btnCalendarPrev").disabled =
    cal.year === now.getFullYear() && cal.month <= now.getMonth();

  document.getElementById("calendarGrid").innerHTML =
    `<div class="col-span-7 py-16 text-center text-sm text-slate-400">⏳ กำลังโหลดนัดหมาย...</div>`;

  try {
    const start = new Date(cal.year, cal.month, 1);
    const end = new Date(cal.year, cal.month + 1, 1);
    const events = await listUpcomingSchedulesInRange(start.toISOString(), end.toISOString());

    cal.eventsByDay = {};
    events.forEach((ev) => {
      const key = dayKey(new Date(ev.event_date));
      (cal.eventsByDay[key] ||= []).push(ev);
    });

    document.getElementById("calendarSummary").textContent =
      events.length > 0 ? `${events.length} นัดในเดือนนี้ที่ยังมาไม่ถึง` : "ไม่มีนัดหมายที่ยังมาไม่ถึงในเดือนนี้";

    if (!cal.selectedDay) {
      cal.selectedDay = Object.keys(cal.eventsByDay).sort()[0] || null;
    }
    renderGrid();
    renderDayDetail();
  } catch (err) {
    document.getElementById("calendarGrid").innerHTML =
      `<div class="col-span-7 py-16 text-center text-sm text-red-500">❌ โหลดปฏิทินไม่สำเร็จ: ${escapeHtml(err.message)}</div>`;
  }
}

function renderGrid() {
  const grid = document.getElementById("calendarGrid");
  const first = new Date(cal.year, cal.month, 1);
  const daysInMonth = new Date(cal.year, cal.month + 1, 0).getDate();
  const todayKey = dayKey(new Date());

  const header = WEEKDAYS.map(
    (w, i) =>
      `<div class="py-2 text-center text-xs font-semibold ${i === 0 ? "text-red-500" : "text-slate-500"} bg-slate-50 border-b border-slate-200">${w}</div>`
  ).join("");

  const cells = [];
  for (let i = 0; i < first.getDay(); i++) {
    cells.push(`<div class="min-h-[88px] bg-slate-50/60 border-b border-r border-slate-100"></div>`);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(cal.year, cal.month, day);
    const key = dayKey(date);
    const events = cal.eventsByDay[key] || [];
    const isToday = key === todayKey;
    const isPast = key < todayKey;
    const isSelected = key === cal.selectedDay;

    const chips = events
      .slice(0, MAX_CHIPS_PER_DAY)
      .map((ev) => {
        const { time } = formatDateTimeTH(ev.event_date);
        const label = `${time.replace(" น.", "")} ${ev.cases?.black_number || ""}`.trim();
        return `<div class="truncate text-[10px] leading-4 bg-blue-100 text-blue-800 rounded px-1 py-0.5" title="${escapeHtml(label + " · " + ev.event_type)}">${escapeHtml(label)}</div>`;
      })
      .join("");
    const more =
      events.length > MAX_CHIPS_PER_DAY
        ? `<div class="text-[10px] text-slate-500 px-1">+${events.length - MAX_CHIPS_PER_DAY} นัดเพิ่มเติม</div>`
        : "";

    cells.push(`
      <div data-day="${key}" class="min-h-[88px] p-1 border-b border-r border-slate-100 cursor-pointer transition-colors ${
        isSelected ? "bg-blue-50 ring-2 ring-inset ring-blue-400" : "bg-white hover:bg-slate-50"
      } ${isPast ? "opacity-50" : ""}">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-semibold ${
            isToday ? "bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center" : date.getDay() === 0 ? "text-red-500" : "text-slate-700"
          }">${day}</span>
          ${events.length > 0 ? `<span class="text-[10px] font-semibold text-blue-600">${events.length}</span>` : ""}
        </div>
        <div class="space-y-0.5">${chips}${more}</div>
      </div>`);
  }

  grid.innerHTML = header + cells.join("");
}

function renderDayDetail() {
  const box = document.getElementById("calendarDayDetail");
  if (!cal.selectedDay) {
    box.innerHTML = `<p class="text-sm text-slate-400">คลิกวันที่ในปฏิทินเพื่อดูรายละเอียดนัดหมาย</p>`;
    return;
  }

  const [y, m, d] = cal.selectedDay.split("-").map(Number);
  const title = new Date(y, m - 1, d).toLocaleDateString("th-TH", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const events = cal.eventsByDay[cal.selectedDay] || [];

  const rows = events
    .map((ev) => {
      const { time } = formatDateTimeTH(ev.event_date);
      const c = ev.cases || {};
      return `
        <div class="flex gap-3 py-2 border-b border-slate-100 last:border-0 text-sm">
          <div class="w-20 shrink-0 font-mono font-semibold text-blue-600">${time}</div>
          <div class="min-w-0">
            <div class="font-semibold text-slate-800">${escapeHtml(ev.event_type)}</div>
            <div class="text-xs text-slate-600">ดำ: ${escapeHtml(c.black_number || "—")}${
              c.red_number ? ` · <span class="text-red-500">แดง: ${escapeHtml(c.red_number)}</span>` : ""
            } · ${escapeHtml(c.court_name || "—")}</div>
            ${ev.notes ? `<div class="text-xs text-slate-400 mt-0.5">📝 ${escapeHtml(ev.notes)}</div>` : ""}
          </div>
        </div>`;
    })
    .join("");

  box.innerHTML = `
    <h4 class="text-sm font-bold text-slate-800 mb-1">${escapeHtml(title)}</h4>
    ${rows || `<p class="text-sm text-slate-400 py-2">ไม่มีนัดหมายที่ยังมาไม่ถึงในวันนี้</p>`}`;
}
