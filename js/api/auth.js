// =============================================================
// api/auth.js — เข้าสู่ระบบ/ออกจากระบบ + ดึงโปรไฟล์ (สำนักงาน + บทบาท)
// =============================================================
// จุดสำคัญ: หน้าเว็บเดิมไม่มีการ login เลย ANON KEY ตรงนี้ไม่ได้เปลี่ยน
// (ยังเป็นค่าเดิมที่ปลอดภัยเมื่อคู่กับ RLS แล้ว) สิ่งที่เปลี่ยนคือทุก
// การอ่าน/เขียนข้อมูลตอนนี้ต้องมี session ของ Supabase Auth แนบไปด้วย
// ไม่งั้น RLS (sql/002_row_level_security.sql) จะปฏิเสธ query ทั้งหมด
import { supabaseClient } from "../config.js";

export async function signInWithPassword(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

/**
 * สมัครสมาชิกใหม่ — ตัว trigger ในฐานข้อมูล (handle_new_auth_user, ดู
 * sql/006_invites_and_admin.sql) จะจับคู่อีเมลนี้กับคำเชิญที่ admin/partner
 * สร้างไว้ล่วงหน้าโดยอัตโนมัติ ถ้าไม่มีคำเชิญตรงกัน ผู้ใช้จะได้ role
 * 'pending' และเข้าใช้งานอะไรไม่ได้จนกว่า admin จะดึงเข้าสำนักงานเอง
 * คืนค่า session ถ้าโปรเจกต์ปิด "Confirm email" ไว้ (ได้ session ทันที)
 * หรือ null ถ้าต้องรอกดยืนยันจากอีเมลก่อน
 */
export async function signUpWithPassword(email, password, fullName) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  return data.session;
}

/** เรียกทุกครั้งที่ session เปลี่ยน (login/logout/refresh token) */
export function onAuthStateChange(callback) {
  const { data } = supabaseClient.auth.onAuthStateChange((_event, session) => callback(session));
  return data.subscription;
}

/**
 * ดึงโปรไฟล์ (organization_id, role, full_name) ของผู้ใช้ที่ login อยู่
 * แถวนี้ถูกสร้างอัตโนมัติตอนสมัครสมาชิกโดย trigger handle_new_auth_user()
 * (ดู sql/001_multi_tenant_schema.sql ข้อ 5)
 */
export async function fetchMyProfile(userId) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("user_id, organization_id, role, full_name")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data;
}
