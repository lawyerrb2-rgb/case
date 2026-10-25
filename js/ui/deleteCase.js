// =============================================================
// ui/deleteCase.js — ลบคดีออกจากระบบ (กรณีบันทึกซ้ำ/ผิดพลาด)
// =============================================================
// สิทธิ์จริงบังคับที่ฐานข้อมูล (RPC delete_case ใน sql/009):
//   - admin: ลบได้เลย
//   - secretary: ต้องกรอกรหัสยืนยันที่ admin ออกให้ (ใช้ได้ครั้งเดียว/15 นาที/ผูกกับคดีเดียว)
//   - role อื่น: ลบไม่ได้ (และปุ่มลบจะไม่แสดงเลย)
import { deleteCase } from "../api/cases.js";
import { removeStorageFiles } from "../api/documents.js";
import { state } from "../state.js";
import { showToast } from "../utils.js";
import { refreshCasesTable } from "./casesTable.js";
import { renderMetrics, renderUpcomingSchedules } from "./dashboard.js";
import { refreshCalendarIfOpen } from "./calendar.js";

let pendingCaseId = null;

export function initDeleteCaseModal() {
  document.getElementById("btnCloseDeleteModal").addEventListener("click", closeDeleteCaseModal);
  document.getElementById("btnCancelDeleteModal").addEventListener("click", closeDeleteCaseModal);
  document.getElementById("btnConfirmDelete").addEventListener("click", handleConfirmDelete);
}

export function openDeleteCaseModal(caseRow) {
  pendingCaseId = caseRow.case_id;
  document.getElementById("delete_case_summary").textContent =
    `คดีดำ ${caseRow.black_number}${caseRow.red_number ? ` / แดง ${caseRow.red_number}` : ""} — ${caseRow.court_name}`;
  document.getElementById("delete_case_parties").textContent =
    `${caseRow.plaintiff_name || "ไม่ระบุ"} v ${caseRow.defendant_name || "ไม่ระบุ"}`;

  const isSecretary = state.currentUser.role === "secretary";
  document.getElementById("deleteCodeBlock").classList.toggle("hidden", !isSecretary);
  document.getElementById("delete_code_input").value = "";

  document.getElementById("deleteCaseModal").classList.remove("hidden");
}

function closeDeleteCaseModal() {
  pendingCaseId = null;
  document.getElementById("deleteCaseModal").classList.add("hidden");
}

async function handleConfirmDelete() {
  if (!pendingCaseId) return;
  const isSecretary = state.currentUser.role === "secretary";
  const code = document.getElementById("delete_code_input").value.trim();

  if (isSecretary && !code) {
    showToast("⚠️ กรุณากรอกรหัสยืนยันการลบที่ได้รับจากผู้ดูแลระบบ", "error");
    return;
  }

  const btn = document.getElementById("btnConfirmDelete");
  btn.disabled = true;
  btn.textContent = "กำลังลบ...";

  try {
    const filePaths = await deleteCase(pendingCaseId, isSecretary ? code : null);

    // ข้อมูลในฐานข้อมูลถูกลบสำเร็จแล้ว — ไฟล์แนบใน Storage ลบตามให้ (ถ้าพลาดแค่แจ้งเตือน)
    try {
      await removeStorageFiles(filePaths);
    } catch (storageErr) {
      console.error("ลบไฟล์แนบใน Storage ไม่สำเร็จ:", storageErr);
      showToast("⚠️ ลบคดีแล้ว แต่ลบไฟล์แนบบางไฟล์ออกจากพื้นที่จัดเก็บไม่สำเร็จ", "info");
    }

    showToast("🗑️ ลบคดีออกจากระบบเรียบร้อยแล้ว");
    closeDeleteCaseModal();
    document.getElementById("viewDetailsModal").classList.add("hidden");
    await Promise.all([refreshCasesTable(), renderUpcomingSchedules(), renderMetrics(), refreshCalendarIfOpen()]);
  } catch (err) {
    showToast("❌ ลบคดีไม่สำเร็จ: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "ยืนยันลบคดีถาวร";
  }
}
