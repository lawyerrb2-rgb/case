// =============================================================
// ui/caseModals.js — หน้าต่าง Pop-up ทั้งหมดที่เกี่ยวกับคดีความ
// =============================================================
import { createCase, updateCase, updateCaseStatus, listAllCasesLite } from "../api/cases.js";
import {
  createSchedule,
  updateSchedule,
  listSchedulesByCase,
  findCaseIdsWithScheduleToday,
  findCaseIdsByScheduleTypeKeyword,
} from "../api/schedules.js";
import { listContactsByCase } from "../api/contacts.js";
import { state } from "../state.js";
import { getStatusMeta, getContactRoleMeta } from "../config.js";
import { escapeHtml, formatDateTimeTH, isoToDateTimeLocalValue, showToast, getFormValue } from "../utils.js";
import { refreshCasesTable } from "./casesTable.js";
import { renderMetrics, renderUpcomingSchedules } from "./dashboard.js";

let onContactAddRequested = () => {};

/** ผูก callback สำหรับปุ่ม "เพิ่มคู่ความในคดีนี้" ที่อยู่ในหน้าต่างรายละเอียดคดี */
export function setContactAddHandler(handler) {
  onContactAddRequested = handler;
}

// -------------------------------------------------------------
// Modal: เพิ่มคดีความใหม่
// -------------------------------------------------------------
export function toggleCaseModal(show) {
  const modal = document.getElementById("caseModal");
  if (show) {
    modal.classList.remove("hidden");
  } else {
    modal.classList.add("hidden");
    document.getElementById("caseForm").reset();
  }
}

export async function handleCreateCase(e) {
  e.preventDefault();
  const caseData = {
    black_number: getFormValue("black_number"),
    red_number: getFormValue("red_number") || null,
    court_name: getFormValue("court_name"),
    case_type: getFormValue("case_type"),
    claim_amount: parseFloat(getFormValue("claim_amount")) || 0,
    description: getFormValue("description"),
    plaintiff_name: getFormValue("plaintiff_name"),
    defendant_name: getFormValue("defendant_name"),
    client_role: getFormValue("client_role"),
  };
  const eventDate = getFormValue("event_date");
  const eventType = getFormValue("event_type");

  try {
    const newCase = await createCase(caseData);
    if (newCase) {
      await createSchedule({ caseId: newCase.case_id, eventDateIso: new Date(eventDate).toISOString(), eventType });
    }
    showToast("🎉 บันทึกคดีความและลงปฏิทินวันนัดหมายสำเร็จ!");
    toggleCaseModal(false);
    await Promise.all([refreshCasesTable(), renderUpcomingSchedules(), renderMetrics()]);
  } catch (err) {
    showToast("❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + err.message, "error");
  }
}

// -------------------------------------------------------------
// Modal: แก้ไขคดีความ
// -------------------------------------------------------------
export function toggleEditModal(show) {
  const modal = document.getElementById("editCaseModal");
  if (show) modal.classList.remove("hidden");
  else {
    modal.classList.add("hidden");
    document.getElementById("editCaseForm").reset();
  }
}

export async function openEditModal(caseRow) {
  document.getElementById("edit_case_id").value = caseRow.case_id;
  document.getElementById("edit_black_number").value = caseRow.black_number;
  document.getElementById("edit_red_number").value = caseRow.red_number || "";
  document.getElementById("edit_court_name").value = caseRow.court_name;
  document.getElementById("edit_case_type").value = caseRow.case_type;
  document.getElementById("edit_claim_amount").value = caseRow.claim_amount || 0;
  document.getElementById("edit_description").value = caseRow.description || "";
  document.getElementById("edit_plaintiff_name").value = caseRow.plaintiff_name || "";
  document.getElementById("edit_defendant_name").value = caseRow.defendant_name || "";
  document.getElementById("edit_client_role").value = caseRow.client_role || "โจทก์";

  try {
    const schedules = await listSchedulesByCase(caseRow.case_id);
    if (schedules.length > 0) {
      document.getElementById("edit_event_date").value = isoToDateTimeLocalValue(schedules[0].event_date);
      document.getElementById("edit_event_type").value = schedules[0].event_type;
      document.getElementById("editCaseForm").dataset.firstEventId = schedules[0].event_id;
    } else {
      document.getElementById("edit_event_date").value = "";
      document.getElementById("edit_event_type").value = "";
      delete document.getElementById("editCaseForm").dataset.firstEventId;
    }
  } catch (err) {
    console.error("ไม่สามารถดึงข้อมูลวันนัดเดิมได้:", err.message);
  }

  toggleEditModal(true);
}

export async function handleUpdateCase(e) {
  e.preventDefault();
  const caseId = getFormValue("edit_case_id");
  const caseData = {
    black_number: getFormValue("edit_black_number"),
    red_number: getFormValue("edit_red_number") || null,
    court_name: getFormValue("edit_court_name"),
    case_type: getFormValue("edit_case_type"),
    claim_amount: parseFloat(getFormValue("edit_claim_amount")) || 0,
    description: getFormValue("edit_description"),
    plaintiff_name: getFormValue("edit_plaintiff_name"),
    defendant_name: getFormValue("edit_defendant_name"),
    client_role: getFormValue("edit_client_role"),
  };
  const eventDateRaw = getFormValue("edit_event_date");
  const eventType = getFormValue("edit_event_type");
  const parsedDate = eventDateRaw ? new Date(eventDateRaw) : null;

  if (!parsedDate || isNaN(parsedDate.getTime())) {
    showToast("⚠️ รูปแบบวันและเวลานัดหมายไม่ถูกต้อง โปรดตรวจสอบอีกครั้ง", "error");
    return;
  }

  try {
    await updateCase(caseId, caseData);

    const firstEventId = document.getElementById("editCaseForm").dataset.firstEventId;
    const eventDateIso = parsedDate.toISOString();
    if (firstEventId) {
      await updateSchedule(firstEventId, { eventDateIso, eventType });
    } else {
      await createSchedule({ caseId, eventDateIso, eventType });
    }

    showToast("🎉 แก้ไขข้อมูลคดีความและกำหนดนัดหมายเรียบร้อยแล้ว!");
    toggleEditModal(false);
    await Promise.all([refreshCasesTable(), renderUpcomingSchedules(), renderMetrics()]);
  } catch (err) {
    console.error("Update Error Logs:", err);
    showToast("❌ เกิดข้อผิดพลาดในการแก้ไขข้อมูล: " + err.message, "error");
  }
}

// -------------------------------------------------------------
// Modal: อัปเดตสถานะคดีความ (ค้นหาแบบพิมพ์กรองสด)
// -------------------------------------------------------------
export async function toggleStatusModal(show) {
  const modal = document.getElementById("statusModal");
  const dropdownList = document.getElementById("statusCaseDropdownList");

  if (show) {
    modal.classList.remove("hidden");
    document.getElementById("status_case_search").value = "";
    document.getElementById("status_case_id").value = "";
    dropdownList.innerHTML = '<div class="p-3 text-center text-slate-400 text-xs">⏳ กำลังเตรียมฐานข้อมูลคดีความ...</div>';
    dropdownList.classList.remove("hidden");

    try {
      const cases = await listAllCasesLite();
      state.statusModal.allCasesLite = cases;
      renderStatusCaseList(cases);
    } catch (err) {
      console.error("โหลดข้อมูลคดีเข้าตัวเลือกค้นหาล้มเหลว:", err);
    }
  } else {
    modal.classList.add("hidden");
    dropdownList.classList.add("hidden");
    document.getElementById("statusForm").reset();
  }
}

function renderStatusCaseList(list) {
  const dropdownList = document.getElementById("statusCaseDropdownList");
  if (list.length === 0) {
    dropdownList.innerHTML = '<div class="p-3 text-center text-red-400 text-xs">❌ ไม่พบคดีความที่ตรงกับคำค้นหา</div>';
    return;
  }

  dropdownList.innerHTML = list
    .map((c, index) => {
      const meta = getStatusMeta(c.case_status);
      return `
        <div data-status-pick-index="${index}"
             class="px-4 py-3 hover:bg-blue-50 hover:text-blue-700 cursor-pointer border-b border-slate-100 flex flex-col gap-0.5 text-slate-700 font-medium transition-colors">
          <div class="flex justify-between items-center w-full">
            <div>
              <span class="text-blue-600 font-bold">ดำ: ${escapeHtml(c.black_number)}</span>
              <span class="text-xs text-slate-400 ml-1.5 font-normal">(${escapeHtml(c.court_name)})</span>
            </div>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-normal">${escapeHtml(meta.label)}</span>
          </div>
          <div class="text-[11px] text-slate-500 font-normal truncate">
            👤 โจทก์: ${escapeHtml(c.plaintiff_name || "ไม่ระบุ")} v จำเลย: ${escapeHtml(c.defendant_name || "ไม่ระบุ")}
          </div>
          ${c.description ? `<div class="text-[11px] text-slate-400 font-normal italic truncate">💼 ข้อหา: ${escapeHtml(c.description)}</div>` : ""}
        </div>`;
    })
    .join("");

  // event delegation แทน onclick แบบเดิมที่ต่อสตริง black/court เข้าไปใน attribute
  Array.from(dropdownList.children).forEach((el) => {
    el.addEventListener("click", () => {
      const c = list[Number(el.dataset.statusPickIndex)];
      selectCaseForStatusUpdate(c);
    });
  });
}

export function filterStatusCaseDropdown() {
  const searchVal = getFormValue("status_case_search").toLowerCase();
  document.getElementById("statusCaseDropdownList").classList.remove("hidden");

  const filtered = state.statusModal.allCasesLite.filter((c) => {
    const meta = getStatusMeta(c.case_status);
    return (
      (c.black_number && c.black_number.toLowerCase().includes(searchVal)) ||
      (c.court_name && c.court_name.toLowerCase().includes(searchVal)) ||
      (c.plaintiff_name && c.plaintiff_name.toLowerCase().includes(searchVal)) ||
      (c.defendant_name && c.defendant_name.toLowerCase().includes(searchVal)) ||
      (c.description && c.description.toLowerCase().includes(searchVal)) ||
      meta.searchTerms.includes(searchVal)
    );
  });
  renderStatusCaseList(filtered);
}

function selectCaseForStatusUpdate(c) {
  document.getElementById("status_case_id").value = c.case_id;
  document.getElementById("status_case_search").value = `คดีดำ: ${c.black_number} (${c.court_name})`;
  document.getElementById("new_case_status").value = c.case_status;
  document.getElementById("statusCaseDropdownList").classList.add("hidden");
}

export async function handleUpdateCaseStatus(e) {
  e.preventDefault();
  const caseId = getFormValue("status_case_id");
  const newStatus = getFormValue("new_case_status");

  if (!caseId) {
    showToast("⚠️ โปรดพิมพ์ค้นหาและคลิกเลือกคดีที่ต้องการอัปเดตสถานะก่อนครับ", "error");
    return;
  }

  try {
    await updateCaseStatus(caseId, newStatus);
    showToast("🔄 ปรับปรุงและอัปเดตสถานะคดีความสำเร็จเรียบร้อยครับ!");
    toggleStatusModal(false);
    await Promise.all([refreshCasesTable(), renderMetrics()]);
  } catch (err) {
    showToast("❌ เกิดข้อผิดพลาดในการปรับสถานะ: " + err.message, "error");
  }
}

// -------------------------------------------------------------
// Modal: ลงบันทึกวันนัดหมายเพิ่ม (สำหรับคดีเดิม)
// -------------------------------------------------------------
export async function toggleScheduleModal(show) {
  const modal = document.getElementById("scheduleModal");
  if (show) {
    modal.classList.remove("hidden");
    await loadAllCasesToDropdown();
  } else {
    modal.classList.add("hidden");
    document.getElementById("scheduleForm").reset();
  }
}

async function loadAllCasesToDropdown(preloadedCases = null) {
  const select = document.getElementById("schedule_case_id");
  try {
    const cases = preloadedCases || (await listAllCasesLite());
    if (cases.length === 0) {
      select.innerHTML = '<option value="">❌ ไม่พบคดีความที่ตรงกับเงื่อนไขนัดหมาย</option>';
      return;
    }
    select.innerHTML = cases
      .map((c) => `<option value="${escapeHtml(c.case_id)}">ดำ: ${escapeHtml(c.black_number)} (${escapeHtml(c.court_name)})</option>`)
      .join("");
  } catch (err) {
    console.error("โหลดรายชื่อคดีเข้า dropdown ล้มเหลว:", err.message);
  }
}

export async function filterCasesForScheduleByToday() {
  try {
    const caseIds = await findCaseIdsWithScheduleToday();
    await loadFilteredCaseOptions(caseIds);
  } catch (err) {
    console.error("กรองนัดวันนี้ผิดพลาด:", err.message);
  }
}

export async function filterCasesForScheduleByType() {
  const keyword = getFormValue("filterByScheduleType");
  if (keyword === "") return;
  try {
    const caseIds = await findCaseIdsByScheduleTypeKeyword(keyword);
    await loadFilteredCaseOptions(caseIds);
  } catch (err) {
    console.error("กรองตามประเภทนัดผิดพลาด:", err.message);
  }
}

async function loadFilteredCaseOptions(caseIds) {
  const select = document.getElementById("schedule_case_id");
  if (caseIds.length === 0) {
    select.innerHTML = '<option value="">❌ ไม่พบคดีความที่ตรงกับเงื่อนไขนัดหมาย</option>';
    return;
  }
  const allCases = await listAllCasesLite();
  const filtered = allCases.filter((c) => caseIds.includes(c.case_id));
  await loadAllCasesToDropdown(filtered);
}

export async function handleCreateAdditionalSchedule(e) {
  e.preventDefault();
  const caseId = getFormValue("schedule_case_id");
  const eventDate = getFormValue("add_event_date");
  const eventType = getFormValue("add_event_type");
  const notes = getFormValue("add_event_notes") || null;

  if (!caseId) {
    showToast("โปรดเลือกคดีความก่อนทำการบันทึก", "error");
    return;
  }

  try {
    await createSchedule({ caseId, eventDateIso: new Date(eventDate).toISOString(), eventType, notes });
    showToast("🎉 บันทึกวันนัดหมายครั้งต่อไปเรียบร้อยแล้ว!");
    toggleScheduleModal(false);
    await renderUpcomingSchedules();
  } catch (err) {
    showToast("❌ เกิดข้อผิดพลาดในการลงนัดเพิ่ม: " + err.message, "error");
  }
}

// -------------------------------------------------------------
// Modal: รายละเอียดคดีเชิงลึก (view-only) + รายชื่อคู่ความประจำคดี
// -------------------------------------------------------------
export function toggleViewModal(show) {
  const modal = document.getElementById("viewDetailsModal");
  if (show) modal.classList.remove("hidden");
  else modal.classList.add("hidden");
}

export async function openViewModal(caseRow) {
  document.getElementById("view_title_id").innerText = "📊 รายละเอียดเชิงลึกคดี: " + caseRow.case_id;
  document.getElementById("view_title_court").innerText = "🏛️ สังกัดศาล: " + caseRow.court_name;
  document.getElementById("view_black_num").innerText = caseRow.black_number;
  document.getElementById("view_red_num").innerText = caseRow.red_number || "—";
  document.getElementById("view_plaintiff").innerText = caseRow.plaintiff_name || "ไม่ระบุ";
  document.getElementById("view_defendant").innerText = caseRow.defendant_name || "ไม่ระบุ";
  document.getElementById("view_client_role").innerText = caseRow.client_role || "ไม่ระบุ";
  document.getElementById("view_desc").innerText = caseRow.description || "ไม่มีรายละเอียดเพิ่มเติม";
  document.getElementById("view_case_id_hidden").value = caseRow.case_id;

  state.viewingCaseId = caseRow.case_id;
  toggleViewModal(true);
  await renderCaseParticipants(caseRow.case_id);
}

async function renderCaseParticipants(caseId) {
  const tbody = document.getElementById("caseParticipantsTableBody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="3" class="text-center py-3 text-slate-400">⏳ กำลังโหลดรายชื่อคู่ความ...</td></tr>`;

  try {
    const participants = await listContactsByCase(caseId);
    if (participants.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center py-3 text-slate-400">👥 ยังไม่มีรายชื่อคู่ความผูกกับคดีนี้</td></tr>`;
      return;
    }
    tbody.innerHTML = participants
      .map((p) => {
        const roleMeta = getContactRoleMeta(p.role);
        return `
          <tr class="border-b border-slate-200 bg-white hover:bg-slate-50">
            <td class="px-4 py-2.5 font-semibold text-slate-800">${escapeHtml(p.full_name)}</td>
            <td class="px-4 py-2.5"><span class="px-1.5 py-0.5 text-[11px] font-medium rounded ${roleMeta.badgeClass}">${escapeHtml(roleMeta.label)}</span></td>
            <td class="px-4 py-2.5 text-slate-500">
              <div class="font-mono text-[11px]">${p.citizen_id ? "บัตร: " + escapeHtml(p.citizen_id) : ""}</div>
              <div class="text-slate-600">${escapeHtml(p.contact_info || "—")}</div>
            </td>
          </tr>`;
      })
      .join("");
  } catch (err) {
    console.error("โหลดรายชื่อคู่ความประจำคดีไม่สำเร็จ:", err);
    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-3 text-red-500">❌ ดึงข้อมูลล้มเหลว</td></tr>`;
  }
}

export function handleOpenContactModalFromCase() {
  const caseId = document.getElementById("view_case_id_hidden").value || state.viewingCaseId;
  if (!caseId) {
    showToast("⚠️ ไม่พบรหัสคดีความในระบบ โปรดลองปิดหน้าต่างรายละเอียดคดีแล้วเปิดใหม่อีกครั้ง", "error");
    return;
  }
  onContactAddRequested(caseId);
}

/** เรียกซ้ำหลังเพิ่มคู่ความสำเร็จ เพื่อรีเฟรชตารางเล็กในหน้าต่างรายละเอียดคดีที่เปิดอยู่ */
export async function refreshCaseParticipantsIfOpen(caseId) {
  if (state.viewingCaseId === caseId) {
    await renderCaseParticipants(caseId);
  }
}
