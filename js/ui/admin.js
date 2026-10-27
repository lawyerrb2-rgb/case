// =============================================================
// ui/admin.js — หน้า "จัดการผู้ใช้งาน" (เฉพาะ role admin/partner)
// =============================================================
// การจำกัดสิทธิ์ที่แท้จริงอยู่ที่ RLS ในฐานข้อมูล (sql/006_invites_and_admin.sql)
// การซ่อนเมนูนี้ฝั่ง UI เป็นแค่ UX ที่ดี ไม่ใช่ชั้นความปลอดภัยจริง — ถ้า
// lawyer/paralegal พยายามเรียกฟังก์ชันพวกนี้ตรงๆ ผ่าน console, RLS จะ
// ปฏิเสธคำสั่งที่ฐานข้อมูลอยู่ดี
import { listInvites, createInvite, revokeInvite } from "../api/invites.js";
import { listOrgMembers, listUnclaimedProfiles, updateMemberRole, claimProfileIntoOrg } from "../api/members.js";
import { listAllCasesLite } from "../api/cases.js";
import { createDeletionCode, listCaseDeletions } from "../api/deletions.js";
import { state } from "../state.js";
import { USER_ROLES } from "../config.js";
import { escapeHtml, showToast, formatDateTimeTH, getFormValue, formatPersonName, isProfileNameMissing } from "../utils.js";

const ALL_ROLES = ["admin", "secretary", "partner", "lawyer", "paralegal"];

const isAdmin = () => state.currentUser.role === "admin";

// เฉพาะ admin เท่านั้นที่ตั้ง/แก้ role "ผู้ดูแลระบบ" ได้ (บังคับที่ RLS ด้วย) —
// secretary/partner จึงไม่เห็นตัวเลือกนี้ เพื่อกันเลื่อนขั้นตัวเองไปเป็น admin
function assignableRoles() {
  return isAdmin() ? ALL_ROLES : ALL_ROLES.filter((r) => r !== "admin");
}

function roleOptionsHtml(selectedRole) {
  return assignableRoles().map(
    (r) => `<option value="${r}" ${r === selectedRole ? "selected" : ""}>${escapeHtml(USER_ROLES[r])}</option>`
  ).join("");
}

/** ชื่อ (ตัวหนา) + อีเมล (เล็ก สีเทา) — ให้รู้ว่าอีเมลไหนเป็นใคร */
function personCellHtml(p) {
  const missing = isProfileNameMissing(p);
  return `
    <div class="min-w-0">
      <div class="font-medium text-slate-800 truncate">${escapeHtml(missing ? "(ยังไม่ได้กรอกชื่อ)" : formatPersonName(p))}</div>
      <div class="text-xs text-slate-400 truncate">${escapeHtml(p.email || "")}</div>
    </div>`;
}

export function initAdminPage() {
  document.getElementById("inviteForm").addEventListener("submit", handleCreateInvite);
  document.getElementById("invitesList").addEventListener("click", handleInvitesListClick);
  document.getElementById("membersList").addEventListener("change", handleMemberRoleChange);
  document.getElementById("unclaimedList").addEventListener("click", handleUnclaimedClick);
  document.getElementById("btnGenerateDeletionCode").addEventListener("click", handleGenerateDeletionCode);
  document.getElementById("deletion_case_filter").addEventListener("input", renderDeletionCaseOptions);
  document.getElementById("btnCopyDeletionCode").addEventListener("click", async () => {
    const code = document.getElementById("deletionCodeValue").dataset.rawCode;
    try {
      await navigator.clipboard.writeText(code);
      showToast("📋 คัดลอกรหัสแล้ว");
    } catch {
      showToast("⚠️ คัดลอกไม่สำเร็จ กรุณาจดรหัสด้วยตนเอง", "error");
    }
  });
}

export async function refreshAdminPage() {
  document.getElementById("invite_role").innerHTML = roleOptionsHtml("lawyer");
  // ส่วนออกรหัสยืนยันการลบ — เฉพาะ admin เท่านั้น
  document.getElementById("deletionCodeSection").classList.toggle("hidden", !isAdmin());

  await Promise.all([
    renderInvites(),
    renderMembers(),
    renderUnclaimed(),
    renderDeletionHistory(),
    isAdmin() ? loadDeletionCaseOptions() : Promise.resolve(),
  ]);
}

// -------------------------------------------------------------
// เชิญผู้ใช้ใหม่
// -------------------------------------------------------------
async function handleCreateInvite(e) {
  e.preventDefault();
  const email = getFormValue("invite_email");
  const role = getFormValue("invite_role");

  try {
    await createInvite({ email, role, organizationId: state.currentUser.organizationId, invitedBy: state.currentUser.userId });
    showToast(`🎉 สร้างคำเชิญให้ ${email} เรียบร้อย — แจ้งให้ผู้ถูกเชิญไปสมัครสมาชิกด้วยอีเมลนี้ที่หน้าเข้าสู่ระบบ`);
    document.getElementById("inviteForm").reset();
    await renderInvites();
  } catch (err) {
    showToast("❌ สร้างคำเชิญไม่สำเร็จ: " + err.message, "error");
  }
}

async function renderInvites() {
  const container = document.getElementById("invitesList");
  container.innerHTML = `<p class="text-xs text-slate-400 py-2">⏳ กำลังโหลด...</p>`;
  try {
    const invites = await listInvites(state.currentUser.organizationId);
    if (invites.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-400 py-2">ยังไม่มีคำเชิญที่ส่งไว้</p>`;
      return;
    }
    container.innerHTML = invites
      .map((inv) => {
        const { date } = formatDateTimeTH(inv.created_at);
        const statusBadge = inv.used
          ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">ใช้แล้ว</span>`
          : `<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">รอสมัคร</span>`;
        return `
          <div class="flex items-center justify-between px-3 py-2 border-b border-slate-100 text-sm last:border-0">
            <div>
              <span class="font-medium text-slate-800">${escapeHtml(inv.email)}</span>
              <span class="text-xs text-slate-400 ml-2">${escapeHtml(USER_ROLES[inv.role] || inv.role)} · ${date}</span>
              ${statusBadge}
            </div>
            ${
              inv.used
                ? ""
                : `<button type="button" data-revoke-invite="${inv.invite_id}" class="text-xs text-red-500 hover:text-red-700 font-medium">ยกเลิก</button>`
            }
          </div>`;
      })
      .join("");
  } catch (err) {
    container.innerHTML = `<p class="text-xs text-red-500 py-2">❌ โหลดคำเชิญล้มเหลว: ${escapeHtml(err.message)}</p>`;
  }
}

async function handleInvitesListClick(e) {
  const btn = e.target.closest("button[data-revoke-invite]");
  if (!btn) return;
  if (!confirm("ยกเลิกคำเชิญนี้ใช่หรือไม่?")) return;
  try {
    await revokeInvite(btn.dataset.revokeInvite);
    showToast("🗑️ ยกเลิกคำเชิญแล้ว");
    await renderInvites();
  } catch (err) {
    showToast("❌ ยกเลิกคำเชิญไม่สำเร็จ: " + err.message, "error");
  }
}

// -------------------------------------------------------------
// สมาชิกในสำนักงาน + เปลี่ยนบทบาท
// -------------------------------------------------------------
async function renderMembers() {
  const container = document.getElementById("membersList");
  container.innerHTML = `<p class="text-xs text-slate-400 py-2">⏳ กำลังโหลด...</p>`;
  try {
    const members = await listOrgMembers();
    container.innerHTML = members
      .map((m) => {
        const locked = m.role === "admin" && !isAdmin();
        return `
          <div class="flex items-center justify-between px-3 py-2 border-b border-slate-100 text-sm last:border-0">
            ${personCellHtml(m)}
            ${
              locked
                ? `<span class="text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-500">${escapeHtml(USER_ROLES.admin)}</span>`
                : `<select data-member-role="${m.user_id}" class="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500">
                    ${roleOptionsHtml(m.role)}
                  </select>`
            }
          </div>`;
      })
      .join("");
  } catch (err) {
    container.innerHTML = `<p class="text-xs text-red-500 py-2">❌ โหลดสมาชิกล้มเหลว: ${escapeHtml(err.message)}</p>`;
  }
}

async function handleMemberRoleChange(e) {
  const select = e.target.closest("select[data-member-role]");
  if (!select) return;
  const userId = select.dataset.memberRole;
  const newRole = select.value;

  try {
    await updateMemberRole(userId, newRole);
    showToast("🔄 ปรับบทบาทเรียบร้อย");
  } catch (err) {
    showToast("❌ ปรับบทบาทไม่สำเร็จ: " + err.message, "error");
    await renderMembers(); // ดึงค่าจริงกลับมาแสดง ถ้า RLS ปฏิเสธคำสั่ง
  }
}

// -------------------------------------------------------------
// ผู้ใช้ที่สมัครแล้วแต่ยังไม่มีคำเชิญตรงกัน (organization_id เป็น null)
// -------------------------------------------------------------
async function renderUnclaimed() {
  const container = document.getElementById("unclaimedList");
  container.innerHTML = `<p class="text-xs text-slate-400 py-2">⏳ กำลังโหลด...</p>`;
  try {
    const unclaimed = await listUnclaimedProfiles();
    if (unclaimed.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-400 py-2">ไม่มีผู้ใช้ที่รอการดึงเข้าสำนักงาน</p>`;
      return;
    }
    container.innerHTML = unclaimed
      .map((u, index) => {
        const { date } = formatDateTimeTH(u.created_at);
        return `
          <div class="flex items-center justify-between px-3 py-2 border-b border-slate-100 text-sm last:border-0">
            <div class="min-w-0">
              ${personCellHtml(u)}
              <div class="text-[11px] text-slate-400">สมัครเมื่อ ${date}</div>
            </div>
            <div class="flex items-center gap-2">
              <select id="unclaimed_role_${index}" class="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500">
                ${roleOptionsHtml("lawyer")}
              </select>
              <button type="button" data-claim-user="${u.user_id}" data-role-select="unclaimed_role_${index}"
                class="text-xs bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg font-medium">
                ดึงเข้าสำนักงาน
              </button>
            </div>
          </div>`;
      })
      .join("");
  } catch (err) {
    container.innerHTML = `<p class="text-xs text-red-500 py-2">❌ โหลดรายชื่อล้มเหลว: ${escapeHtml(err.message)}</p>`;
  }
}

async function handleUnclaimedClick(e) {
  const btn = e.target.closest("button[data-claim-user]");
  if (!btn) return;
  const role = document.getElementById(btn.dataset.roleSelect).value;

  try {
    await claimProfileIntoOrg(btn.dataset.claimUser, state.currentUser.organizationId, role);
    showToast("🎉 ดึงผู้ใช้เข้าสำนักงานเรียบร้อย");
    await Promise.all([renderUnclaimed(), renderMembers()]);
  } catch (err) {
    showToast("❌ ดึงผู้ใช้ไม่สำเร็จ: " + err.message, "error");
  }
}

// -------------------------------------------------------------
// ออกรหัสยืนยันการลบคดี (เฉพาะ admin) — ให้ secretary นำไปกรอกตอนลบคดี
// -------------------------------------------------------------
let deletionCaseOptions = [];

async function loadDeletionCaseOptions() {
  try {
    deletionCaseOptions = await listAllCasesLite();
    renderDeletionCaseOptions();
  } catch (err) {
    showToast("❌ โหลดรายการคดีไม่สำเร็จ: " + err.message, "error");
  }
}

function renderDeletionCaseOptions() {
  const keyword = document.getElementById("deletion_case_filter").value.trim().toLowerCase();
  const select = document.getElementById("deletion_case_select");
  const filtered = deletionCaseOptions.filter((c) =>
    [c.black_number, c.red_number, c.court_name, c.plaintiff_name, c.defendant_name]
      .some((v) => v && String(v).toLowerCase().includes(keyword))
  );
  select.innerHTML =
    filtered.length === 0
      ? `<option value="">ไม่พบคดีที่ตรงกับคำค้นหา</option>`
      : filtered
          .map(
            (c) =>
              `<option value="${escapeHtml(c.case_id)}">ดำ: ${escapeHtml(c.black_number)} (${escapeHtml(c.court_name)}) — ${escapeHtml(c.plaintiff_name || "ไม่ระบุ")} v ${escapeHtml(c.defendant_name || "ไม่ระบุ")}</option>`
          )
          .join("");
}

async function handleGenerateDeletionCode() {
  const caseId = getFormValue("deletion_case_select");
  if (!caseId) {
    showToast("⚠️ กรุณาเลือกคดีที่ต้องการออกรหัสลบ", "error");
    return;
  }
  try {
    const { code, expiresAt } = await createDeletionCode(caseId);
    const { time } = formatDateTimeTH(expiresAt);
    const valueEl = document.getElementById("deletionCodeValue");
    valueEl.dataset.rawCode = code;
    valueEl.textContent = `${code.slice(0, 4)}-${code.slice(4)}`;
    document.getElementById("deletionCodeExpiry").textContent = `ใช้ได้ครั้งเดียว หมดอายุเวลา ${time}`;
    document.getElementById("deletionCodeResult").classList.remove("hidden");
  } catch (err) {
    showToast("❌ ออกรหัสไม่สำเร็จ: " + err.message, "error");
  }
}

// -------------------------------------------------------------
// ประวัติการลบคดี (audit) — admin/secretary/partner ดูได้
// -------------------------------------------------------------
async function renderDeletionHistory() {
  const container = document.getElementById("deletionHistoryList");
  container.innerHTML = `<p class="text-xs text-slate-400 py-2">⏳ กำลังโหลด...</p>`;
  try {
    const rows = await listCaseDeletions(20);
    if (rows.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-400 py-2">ยังไม่มีประวัติการลบคดี</p>`;
      return;
    }
    container.innerHTML = rows
      .map((r) => {
        const { date, time } = formatDateTimeTH(r.deleted_at);
        const approvedNote =
          r.approved_by_name && r.approved_by_name !== r.deleted_by_name
            ? ` · อนุมัติโดย <b>${escapeHtml(r.approved_by_name)}</b>`
            : "";
        return `
          <div class="px-3 py-2 border-b border-slate-100 text-xs text-slate-600 last:border-0">
            <span class="font-mono text-slate-400">${date} ${time}</span>
            — คดีดำ <b>${escapeHtml(r.black_number || "—")}</b> (${escapeHtml(r.court_name || "—")})
            ลบโดย <b>${escapeHtml(r.deleted_by_name || "ไม่ทราบ")}</b>${approvedNote}
          </div>`;
      })
      .join("");
  } catch (err) {
    container.innerHTML = `<p class="text-xs text-red-500 py-2">❌ โหลดประวัติล้มเหลว: ${escapeHtml(err.message)}</p>`;
  }
}
