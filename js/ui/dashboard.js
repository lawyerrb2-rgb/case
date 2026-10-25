// =============================================================
// ui/dashboard.js — การ์ดสถิติสถานะคดี + ตารางนัดหมายใกล้ถึง
// =============================================================
import { getCaseStatusCounts } from "../api/cases.js";
import { listUpcomingSchedulesPaged } from "../api/schedules.js";
import { state } from "../state.js";
import { CASE_STATUS_ORDER, getStatusMeta } from "../config.js";
import { escapeHtml, formatDateTimeTH } from "../utils.js";

export async function renderMetrics() {
  const container = document.getElementById("metricsContainer");
  if (!container) return;

  try {
    const counts = await getCaseStatusCounts();
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

    const rows = CASE_STATUS_ORDER.map((key) => {
      const meta = getStatusMeta(key);
      const n = counts[key] || 0;
      const pct = total > 0 ? (n / total) * 100 : 0;
      return `
        <div class="space-y-1">
          <div class="flex justify-between text-xs font-medium">
            <span class="text-slate-500">${escapeHtml(meta.fullLabel)}</span>
            <span class="text-slate-700">${n} คดี</span>
          </div>
          <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div class="${meta.barClass} h-full rounded-full" style="width: ${pct}%"></div>
          </div>
        </div>`;
    }).join("");

    container.innerHTML = `
      <div class="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
        <span class="text-xs font-semibold text-slate-600">📁 คดีความทั้งหมดในระบบ</span>
        <b class="text-slate-900 text-sm bg-white border border-slate-200 px-2.5 py-0.5 rounded-full">${total} คดี</b>
      </div>
      ${rows}`;
  } catch (err) {
    console.error("คำนวณสถิติผิดพลาด:", err.message);
    container.innerHTML = `<p class="text-center text-red-500 text-xs py-2">❌ ไม่สามารถคำนวณสถิติได้</p>`;
  }
}

/** ผูกปุ่มเลือกหน้าของกล่องนัดหมาย (เรียกครั้งเดียวตอน bootstrap) */
export function initUpcomingSchedulesPager() {
  document.getElementById("deadlinePager").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn || btn.disabled) return;
    state.schedules.page = Number(btn.dataset.page);
    renderUpcomingSchedules();
  });
}

/** เลขหน้าที่จะแสดง: หน้าแรก/หน้าสุดท้ายเสมอ + หน้าข้างเคียงหน้าปัจจุบัน คั่นด้วย … */
function buildPageList(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push("…");
    result.push(p);
  });
  return result;
}

function renderPager(page, pageSize, totalCount) {
  const pager = document.getElementById("deadlinePager");
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalCount === 0) {
    pager.innerHTML = "";
    return;
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  const base = "min-w-[2rem] px-2 py-1 text-xs font-semibold rounded-lg border transition-colors";
  const numbers = buildPageList(page, totalPages)
    .map((p) =>
      p === "…"
        ? `<span class="px-1 text-xs text-slate-400">…</span>`
        : `<button type="button" data-page="${p}" class="${base} ${
            p === page ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }">${p}</button>`
    )
    .join("");

  pager.innerHTML = `
    <div class="text-xs text-slate-500">แสดง ${from}-${to} จากนัดหมายที่ยังมาไม่ถึงทั้งหมด <b class="text-slate-700">${totalCount}</b> นัด</div>
    <div class="flex items-center gap-1">
      <button type="button" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""} class="${base} bg-white text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
      ${numbers}
      <button type="button" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""} class="${base} bg-white text-slate-600 border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">›</button>
    </div>`;
}

export async function renderUpcomingSchedules() {
  const tbody = document.getElementById("deadlineTableBody");
  if (!tbody) return;

  try {
    const { pageSize } = state.schedules;
    let { schedules, totalCount } = await listUpcomingSchedulesPaged({ page: state.schedules.page, pageSize });

    // ถ้าหน้าปัจจุบันเกินจำนวนหน้าจริง (เช่น หลังลบคดี/นัดหมาย) ให้ถอยกลับหน้าสุดท้าย
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    if (state.schedules.page > totalPages) {
      state.schedules.page = totalPages;
      ({ schedules, totalCount } = await listUpcomingSchedulesPaged({ page: totalPages, pageSize }));
    }

    renderPager(state.schedules.page, pageSize, totalCount);

    if (schedules.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-slate-400">🎉 ไม่มีนัดหมายที่ยังมาไม่ถึงในระบบ</td></tr>`;
      return;
    }

    tbody.innerHTML = schedules
      .map((s) => {
        const { date, time } = formatDateTimeTH(s.event_date);
        const caseInfo = s.cases || {};
        const blackNum = caseInfo.black_number ? `ดำ: ${escapeHtml(caseInfo.black_number)}` : "—";
        const redNum = caseInfo.red_number
          ? ` <span class="text-red-500">แดง: ${escapeHtml(caseInfo.red_number)}</span>`
          : "";
        const courtName = escapeHtml(caseInfo.court_name || "—");

        return `
          <tr class="border-b border-slate-50 hover:bg-slate-50 transition-colors text-xs sm:text-sm">
            <td class="py-3 font-mono text-slate-700">
              <div>${date}</div>
              <div class="text-xs text-blue-600 font-semibold">${time}</div>
            </td>
            <td class="py-3 font-medium text-slate-900">
              <div>${blackNum}</div>
              <div class="text-xs font-normal">${redNum}</div>
            </td>
            <td class="py-3 text-slate-600 font-medium max-w-[150px] truncate" title="${courtName}">${courtName}</td>
            <td class="py-3 text-slate-800 font-semibold">${escapeHtml(s.event_type)}</td>
          </tr>`;
      })
      .join("");
  } catch (err) {
    console.error("โหลดปฏิทินนัดไม่สำเร็จ:", err.message);
    tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-red-500">❌ เกิดข้อผิดพลาด: ${escapeHtml(err.message)}</td></tr>`;
  }
}
