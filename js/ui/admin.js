// =============================================================
// ui/admin.js — หน้า "จัดการผู้ใช้งาน" (เฉพาะ role admin/partner)
// =============================================================
// การจำกัดสิทธิ์ที่แท้จริงอยู่ที่ RLS ในฐานข้อมูล (sql/006_invites_and_admin.sql)
// การซ่อนเมนูนี้ฝั่ง UI เป็นแค่ UX ที่ดี ไม่ใช่ชั้นความปลอดภัยจริง — ถ้า
// lawyer/paralegal พยายามเรียกฟังก์ชันพวกนี้ตรงๆ ผ่าน console, RLS จะ
// ปฏิเสธคำสั่งที่ฐานข้อมูลอยู่ดี
import { listInvites, createInvite, revokeInvite } from "../api/invites.js";
import { listOrgMembers, listUnclaimedProfiles, updateMemberRole, claimProfileIntoOrg } from "../api/members.js";
import { state } from "../state.js";
import { USER_ROLES } from "../config.js";
import { escapeHtml, showToast, formatDateTimeTH, getFormValue } from "../utils.js";

const ASSIGNABLE_ROLES = ["admin", "partner", "lawyer", "paralegal"];

function roleOptionsHtml(selectedRole) {
  return ASSIGNABLE_ROLES.map(
    (r) => `<option value="${r}" ${r === selectedRole ? "selected" : ""}>${escapeHtml(USER_ROLES[r])}</option>`
  ).join("");
}

export function initAdminPage() {
  document.getElementById("inviteForm").addEventListener("submit", handleCreateInvite);
  document.getElementById("invitesList").addEventListener("click", handleInvitesListClick);
  document.getElementById("membersList").addEventListener("change", handleMemberRoleChange);
  document.getElementById("unclaimedList").addEventListener("click", handleUnclaimedClick);
}

export async function refreshAdminPage() {
  await Promise.all([renderInvites(), renderMembers(), renderUnclaimed()]);
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
      .map(
        (m) => `
          <div class="flex items-center justify-between px-3 py-2 border-b border-slate-100 text-sm last:border-0">
            <span class="font-medium text-slate-800">${escapeHtml(m.full_name)}</span>
            <select data-member-role="${m.user_id}" class="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500">
              ${roleOptionsHtml(m.role)}
            </select>
          </div>`
      )
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
            <div>
              <span class="font-medium text-slate-800">${escapeHtml(u.full_name)}</span>
              <span class="text-xs text-slate-400 ml-2">สมัครเมื่อ ${date}</span>
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
