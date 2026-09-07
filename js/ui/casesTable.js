// =============================================================
// ui/casesTable.js — ตารางทะเบียนคดีความหลัก + เพจจิเนชัน
// =============================================================
// จุดแก้สำคัญ: ของเดิมฝัง onclick="openEditModal('...', `${desc}`, ...)"
// ลงในสตริง HTML ตรงๆ ถ้าคำบรรยายคดีมีเครื่องหมาย backtick, single quote
// หรือ script อยู่ในนั้น จะทำให้ HTML/JS พังหรือรันโค้ดแปลกปลอมได้ทันที
// (ทั้ง XSS และ "JS injection" ผ่าน attribute) วิธีแก้คือไม่ยัด data ลง
// ใน attribute string อีกต่อไป — ใช้ data-index ชี้กลับไปที่ state.cases.rows
// แล้วดึง object จริงมาใช้ตอน click แทน
import { listCases } from "../api/cases.js";
import { listAllSchedulesForCaseMapping } from "../api/schedules.js";
import { state } from "../state.js";
import { getStatusMeta } from "../config.js";
import { escapeHtml, formatCurrency, formatDateTimeTH } from "../utils.js";

let onEditRequested = () => {};
let onViewRequested = () => {};

/** เรียกครั้งเดียวตอน bootstrap เพื่อผูก callback เข้ากับปุ่มแก้ไข/เปิดดูของแต่ละแถว */
export function initCasesTable({ onEdit, onView }) {
  onEditRequested = onEdit;
  onViewRequested = onView;

  const tbody = document.getElementById("caseTableBody");
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const row = state.cases.rows[Number(btn.dataset.index)];
    if (!row) return;
    if (btn.dataset.action === "edit") onEditRequested(row);
    if (btn.dataset.action === "view") onViewRequested(row);
  });

  document.getElementById("btnPrevPage").addEventListener("click", () => changePage(-1));
  document.getElementById("btnNextPage").addEventListener("click", () => changePage(1));
}

export function changePage(direction) {
  state.cases.currentPage += direction;
  refreshCasesTable();
}

export function resetToFirstPage() {
  state.cases.currentPage = 1;
}

export async function refreshCasesTable() {
  const tbody = document.getElementById("caseTableBody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-slate-400">⏳ กำลังโหลดข้อมูลคดีความ...</td></tr>`;

  try {
    const { searchTerm, statusFilter, currentPage, pageSize, assignedToMe } = state.cases;
    const { cases, totalCount } = await listCases({
      search: searchTerm,
      status: statusFilter,
      page: currentPage,
      pageSize,
      assignedTo: assignedToMe ? state.currentUser.userId : null,
    });

    state.cases.rows = cases;
    updatePaginationUI(currentPage, pageSize, totalCount);

    if (cases.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-6 text-slate-400">❌ ไม่พบข้อมูลคดีความในระบบ</td></tr>`;
      return;
    }

    const allSchedules = await listAllSchedulesForCaseMapping();
    tbody.innerHTML = cases.map((c, index) => renderCaseRow(c, index, allSchedules)).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-red-500">❌ โหลดข้อมูลล้มเหลว: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function updatePaginationUI(page, pageSize, totalCount) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  document.getElementById("totalCasesCount").innerText = totalCount;
  document.getElementById("pageStart").innerText = totalCount === 0 ? 0 : from + 1;
  document.getElementById("pageEnd").innerText = Math.min(to + 1, totalCount);
  document.getElementById("btnPrevPage").disabled = page === 1;
  document.getElementById("btnNextPage").disabled = to + 1 >= totalCount;
}

function renderCaseRow(c, index, allSchedules) {
  const caseSchedules = allSchedules.filter((s) => s.case_id === c.case_id);
  let latestType = "— ไม่มีนัด —";
  let latestDate = "—";
  if (caseSchedules.length > 0) {
    latestType = caseSchedules[0].event_type;
    const { date, time } = formatDateTimeTH(caseSchedules[0].event_date);
    latestDate = `${date} ${time}`;
  }

  const meta = getStatusMeta(c.case_status);
  const statusBadge = `<span class="px-2.5 py-1 text-xs font-semibold rounded-full ${meta.badgeClass}">${escapeHtml(meta.label)}</span>`;

  return `
    <tr class="hover:bg-slate-50 transition-colors">
      <td class="px-6 py-4 font-medium text-slate-900">
        <span class="text-xs block text-slate-400 font-mono">${escapeHtml(c.case_id)}</span>
        <div><b class="text-blue-600">ดำ:</b> ${escapeHtml(c.black_number)}</div>
        ${c.red_number ? `<div><b class="text-red-500">แดง:</b> ${escapeHtml(c.red_number)}</div>` : '<span class="text-xs text-slate-400">—</span>'}
      </td>
      <td class="px-6 py-4 text-slate-600">
        <div class="font-semibold">${escapeHtml(c.court_name)}</div>
        <span class="text-xs bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">${escapeHtml(c.case_type)}</span>
      </td>
      <td class="px-6 py-4 max-w-xs truncate text-slate-500" title="${escapeHtml(c.description || "")}">${escapeHtml(c.description || "—")}</td>
      <td class="px-6 py-4 font-mono font-medium">${formatCurrency(c.claim_amount)}</td>
      <td class="px-6 py-4 text-xs font-medium text-slate-700 max-w-[150px] truncate">${escapeHtml(latestType)}</td>
      <td class="px-6 py-4 text-xs font-mono text-slate-600">${escapeHtml(latestDate)}</td>
      <td class="px-6 py-4 text-xs text-slate-600">${escapeHtml(c.assigned_lawyer_name || "— ยังไม่มอบหมาย —")}</td>
      <td class="px-6 py-4">${statusBadge}</td>
      <td class="px-6 py-4 text-center space-x-1 whitespace-nowrap">
        <button type="button" data-action="view" data-index="${index}"
          class="text-xs bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 px-2 py-1.5 rounded-lg font-medium transition-colors">
          🔎 เปิดดู
        </button>
        <button type="button" data-action="edit" data-index="${index}"
          class="text-xs bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 px-2 py-1.5 rounded-lg font-medium transition-colors">
          📝 แก้ไข
        </button>
      </td>
    </tr>`;
}
