// =============================================================
// ui/contacts.js — หน้าสมุดรายชื่อผู้ติดต่อ (คู่ความ/พยาน)
// =============================================================
import { listAllContacts, createContact, updateContact } from "../api/contacts.js";
import { getContactRoleMeta } from "../config.js";
import { escapeHtml, showToast, getFormValue } from "../utils.js";
import { setContactAddHandler, refreshCaseParticipantsIfOpen } from "./caseModals.js";
import { state } from "../state.js";

let contactsCache = [];

export function initContacts() {
  const tbody = document.getElementById("contactTableBody");
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-edit-contact-index]");
    if (!btn) return;
    const contact = contactsCache[Number(btn.dataset.editContactIndex)];
    if (contact) openEditContact(contact);
  });

  // เมื่อกด "เพิ่มคู่ความในคดีนี้" จากหน้าต่างรายละเอียดคดี ให้เปิด modal นี้
  // พร้อม pre-fill case_id ให้อัตโนมัติ
  setContactAddHandler((caseId) => {
    toggleContactModal(true);
    document.getElementById("contact_case_id").value = caseId;
    document.getElementById("contactModalTitle").innerText = "👥 เพิ่มคู่ความประจำคดีนี้";
  });
}

export async function refreshContactsTable() {
  const tbody = document.getElementById("contactTableBody");
  tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-slate-400">⏳ กำลังดึงรายชื่อคู่ความ...</td></tr>`;

  try {
    contactsCache = await listAllContacts();

    if (contactsCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-400">📭 ยังไม่มีข้อมูลรายชื่อคู่ความในระบบ</td></tr>`;
      return;
    }

    tbody.innerHTML = contactsCache
      .map((c, index) => {
        const caseInfo = c.cases || {};
        const blackNum = caseInfo.black_number ? `คดีดำ: ${escapeHtml(caseInfo.black_number)}` : "ทั่วไป (ไม่ผูกคดี)";
        const roleMeta = getContactRoleMeta(c.role);

        return `
          <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
            <td class="px-6 py-3.5 font-semibold text-slate-900">
              <div>${escapeHtml(c.full_name)}</div>
              <div class="text-xs text-slate-400 font-normal">เลขบัตร: ${escapeHtml(c.citizen_id || "—")}</div>
            </td>
            <td class="px-6 py-3.5">
              <span class="px-2 py-0.5 text-xs font-semibold rounded-full ${roleMeta.badgeClass}">${escapeHtml(roleMeta.label)}</span>
            </td>
            <td class="px-6 py-3.5 font-medium text-slate-600">${blackNum}</td>
            <td class="px-6 py-3.5 text-slate-700 text-xs max-w-xs truncate" title="${escapeHtml(c.contact_info || "")}">${escapeHtml(c.contact_info || "—")}</td>
            <td class="px-6 py-3.5 text-center">
              <button type="button" data-edit-contact-index="${index}" class="text-blue-600 hover:text-blue-800 font-medium">แก้ไข</button>
            </td>
          </tr>`;
      })
      .join("");
  } catch (err) {
    console.error("โหลดรายชื่อไม่สำเร็จ:", err.message);
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">❌ เกิดข้อผิดพลาด: ${escapeHtml(err.message)}</td></tr>`;
  }
}

export function toggleContactModal(show) {
  const modal = document.getElementById("contactModal");
  if (show) {
    modal.classList.remove("hidden");
  } else {
    modal.classList.add("hidden");
    document.getElementById("contactForm").reset();
    document.getElementById("contact_id").value = "";
    document.getElementById("contact_case_id").value = "";
    document.getElementById("contactModalTitle").innerText = "เพิ่มผู้ติดต่อใหม่";
  }
}

function openEditContact(c) {
  document.getElementById("contact_id").value = c.contact_id;
  document.getElementById("contact_case_id").value = c.case_id || "";
  document.getElementById("cFullName").value = c.full_name;
  document.getElementById("cRole").value = c.role || "Plaintiff";
  document.getElementById("cCitizenId").value = c.citizen_id || "";
  document.getElementById("cContactInfo").value = c.contact_info || "";
  document.getElementById("contactModalTitle").innerText = "📝 แก้ไขข้อมูลคู่ความ";
  document.getElementById("contactModal").classList.remove("hidden");
}

export async function handleSaveContact(e) {
  e.preventDefault();
  const contactId = getFormValue("contact_id");
  const contactData = {
    case_id: getFormValue("contact_case_id") || null,
    full_name: getFormValue("cFullName"),
    role: getFormValue("cRole"),
    citizen_id: getFormValue("cCitizenId") || null,
    contact_info: getFormValue("cContactInfo") || null,
  };

  try {
    if (contactId) {
      await updateContact(contactId, contactData);
    } else {
      // จำเป็นต้องแนบให้ตรงกับผู้ login อยู่ ไม่งั้น RLS with-check
      // (sql/002_row_level_security.sql) จะปฏิเสธการ insert
      await createContact({ ...contactData, organization_id: state.currentUser.organizationId });
    }
    showToast("🎉 บันทึกข้อมูลคู่ความเรียบร้อย!");
    toggleContactModal(false);
    await refreshContactsTable();
    if (contactData.case_id) await refreshCaseParticipantsIfOpen(contactData.case_id);
  } catch (err) {
    showToast("❌ ไม่สามารถบันทึกข้อมูลได้: " + err.message, "error");
  }
}
