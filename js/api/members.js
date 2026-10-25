// =============================================================
// api/members.js — สมาชิกในสำนักงาน (ตาราง profiles)
// =============================================================
import { supabaseClient } from "../config.js";

/** สมาชิกทั้งหมดในสำนักงานของผู้ login อยู่ (RLS กรองให้อัตโนมัติอยู่แล้ว) */
export async function listOrgMembers() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("user_id, full_name, role")
    .order("full_name", { ascending: true });
  if (error) throw error;
  return data || [];
}

/** ผู้ใช้ที่สมัครแล้วแต่ยังไม่ถูกดึงเข้าสำนักงานไหนเลย (organization_id เป็น null) */
export async function listUnclaimedProfiles() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("user_id, full_name, created_at")
    .is("organization_id", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function updateMemberRole(userId, role) {
  const { data, error } = await supabaseClient.from("profiles").update({ role }).eq("user_id", userId).select("user_id");
  if (error) throw error;
  // RLS ที่ปฏิเสธการแก้ไขจะไม่ throw แต่ส่งกลับ 0 แถว — ต้องตรวจเองไม่งั้นจะดูเหมือนสำเร็จทั้งที่ไม่ได้เปลี่ยน
  if (!data || data.length === 0) throw new Error("ไม่มีสิทธิ์เปลี่ยนบทบาทของผู้ใช้นี้");
}

/** ดึงผู้ใช้ที่ organization_id เป็น null เข้าสำนักงานตัวเอง พร้อมกำหนดบทบาท */
export async function claimProfileIntoOrg(userId, organizationId, role) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .update({ organization_id: organizationId, role })
    .eq("user_id", userId)
    .select("user_id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("ไม่มีสิทธิ์ดึงผู้ใช้นี้เข้าสำนักงาน");
}
