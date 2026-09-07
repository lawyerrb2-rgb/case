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
  const { error } = await supabaseClient.from("profiles").update({ role }).eq("user_id", userId);
  if (error) throw error;
}

/** ดึงผู้ใช้ที่ organization_id เป็น null เข้าสำนักงานตัวเอง พร้อมกำหนดบทบาท */
export async function claimProfileIntoOrg(userId, organizationId, role) {
  const { error } = await supabaseClient
    .from("profiles")
    .update({ organization_id: organizationId, role })
    .eq("user_id", userId);
  if (error) throw error;
}
