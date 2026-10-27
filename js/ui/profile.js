// =============================================================
// ui/profile.js — โปรไฟล์ของฉัน (ชื่อจริง นามสกุล ชื่อเล่น)
// =============================================================
// ผู้ใช้ที่ยังไม่เคยกรอกชื่อ (เช่น สร้างจาก Supabase Studio ที่มีแต่อีเมล) จะถูกบังคับ
// ให้กรอกก่อนใช้งานต่อ (โหมด required: ไม่มีปุ่มปิด/ยกเลิก) เพื่อให้ทุกคนในสำนักงาน
// รู้ว่าอีเมลไหนเป็นทนายความคนใด
import { updateMyProfile } from "../api/members.js";
import { state } from "../state.js";
import { getFormValue, showToast } from "../utils.js";
import { renderUserBadge } from "./login.js";

let onSaved = async () => {};
let requiredMode = false;

export function initProfileModal(afterSave) {
  onSaved = afterSave;
  document.getElementById("btnOpenProfile").addEventListener("click", () => openProfileModal({ required: false }));
  document.getElementById("btnCloseProfileModal").addEventListener("click", closeProfileModal);
  document.getElementById("btnCancelProfileModal").addEventListener("click", closeProfileModal);
  document.getElementById("profileForm").addEventListener("submit", handleSaveProfile);
}

export function openProfileModal({ required }) {
  requiredMode = required;
  const u = state.currentUser;

  // ผู้ใช้เก่าที่เคยกรอกชื่อรวมช่องเดียว (ไม่ใช่อีเมล) → แยกคำแรก/ที่เหลือมาเป็นค่าแนะนำ
  let first = u.firstName || "";
  let last = u.lastName || "";
  if (!first && !last && u.fullName && !u.fullName.includes("@")) {
    const [head, ...rest] = u.fullName.trim().split(/\s+/);
    first = head || "";
    last = rest.join(" ");
  }

  document.getElementById("profile_first_name").value = first;
  document.getElementById("profile_last_name").value = last;
  document.getElementById("profile_nickname").value = u.nickname || "";
  document.getElementById("profile_email_display").textContent = u.email || "";

  document.getElementById("profileRequiredHint").classList.toggle("hidden", !required);
  document.getElementById("btnCloseProfileModal").classList.toggle("hidden", required);
  document.getElementById("btnCancelProfileModal").classList.toggle("hidden", required);
  document.getElementById("profileModal").classList.remove("hidden");
}

function closeProfileModal() {
  if (requiredMode) return; // โหมดบังคับกรอก ปิดไม่ได้จนกว่าจะบันทึกสำเร็จ
  document.getElementById("profileModal").classList.add("hidden");
}

async function handleSaveProfile(e) {
  e.preventDefault();
  const firstName = getFormValue("profile_first_name");
  const lastName = getFormValue("profile_last_name");
  const nickname = getFormValue("profile_nickname");

  if (!firstName || !lastName) {
    showToast("⚠️ กรุณากรอกชื่อจริงและนามสกุล", "error");
    return;
  }

  try {
    const saved = await updateMyProfile(state.currentUser.userId, { firstName, lastName, nickname });
    Object.assign(state.currentUser, {
      fullName: saved.full_name,
      firstName: saved.first_name,
      lastName: saved.last_name,
      nickname: saved.nickname,
    });
    requiredMode = false;
    document.getElementById("profileModal").classList.add("hidden");
    renderUserBadge(state.currentUser);
    showToast("✅ บันทึกข้อมูลส่วนตัวเรียบร้อย");
    await onSaved(); // รีเฟรชตารางคดี/หน้าอื่นที่แสดงชื่อทนายผู้รับผิดชอบ
  } catch (err) {
    showToast("❌ บันทึกไม่สำเร็จ: " + err.message, "error");
  }
}
