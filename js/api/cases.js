// =============================================================
// api/cases.js — เลเยอร์เข้าถึงข้อมูล "คดีความ" (ตาราง cases)
// =============================================================
// หลักการ: หน้าจอ (ui/*.js) ห้ามยิง supabaseClient.from(...) ตรงๆ
// ทุกคำสั่งต้องผ่านฟังก์ชันในไฟล์นี้เท่านั้น เพื่อให้:
//   1) ถ้าจะเปลี่ยนโครงสร้างตาราง/เพิ่ม organization_id ภายหลัง
//      (ดูหัวข้อ "รองรับหลายสำนักงาน/ผู้ใช้" ใน README) แก้ที่เดียวจบ
//   2) เขียนเทสต์ mock เลเยอร์นี้ได้ง่ายโดยไม่ต้องยุ่งกับ UI
import { supabaseClient } from "../config.js";

/**
 * ดึงรายการคดีความแบบแบ่งหน้า พร้อมรองรับค้นหาด่วนและกรองสถานะ
 *
 * เดิมฟังก์ชันนี้ต่อสตริงเข้า `.or(...)` ฝั่ง client (ทั้งช้าเมื่อข้อมูล
 * มาก และต้อง sanitize อักขระพิเศษเอง) ตอนนี้ย้ายไปเรียก RPC
 * `search_cases` แทน ซึ่งรันในฐานข้อมูล ใช้ full-text index (GIN) และ
 * กรอง organization_id ให้อัตโนมัติผ่าน current_organization_id() —
 * ดู sql/004_search_rpc.sql
 * @returns {Promise<{cases: object[], totalCount: number}>}
 */
export async function listCases({ search = "", status = "ALL", page = 1, pageSize = 10, assignedTo = null } = {}) {
  const { data, error } = await supabaseClient.rpc("search_cases", {
    p_search: search.trim(),
    p_status: status,
    p_page: page,
    p_page_size: pageSize,
    p_assigned_to: assignedTo,
  });
  if (error) throw error;

  const rows = data || [];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;
  // total_count เป็นคอลัมน์ช่วยคำนวณเพจจิเนชันเท่านั้น ไม่ต้องส่งต่อให้ UI
  const cases = rows.map(({ total_count, ...rest }) => rest);
  return { cases, totalCount };
}

/** ดึงคดีทั้งหมดแบบไม่แบ่งหน้า (ใช้กับ modal ค้นหาคดีเพื่ออัปเดตสถานะ/ลงนัด) */
export async function listAllCasesLite() {
  const { data, error } = await supabaseClient
    .from("cases")
    .select("case_id, black_number, red_number, court_name, case_status, plaintiff_name, defendant_name, description")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/** สถิติจำนวนคดีแยกตามสถานะ ใช้กับการ์ดแดชบอร์ด */
export async function getCaseStatusCounts() {
  const { data, error } = await supabaseClient.from("cases").select("case_status");
  if (error) throw error;
  const counts = {};
  (data || []).forEach((c) => {
    counts[c.case_status] = (counts[c.case_status] || 0) + 1;
  });
  return counts;
}

/** สร้างคดีใหม่ คืนค่าแถวที่บันทึกสำเร็จ (มี case_id ที่ระบบ generate ให้) */
export async function createCase(caseData) {
  const { data, error } = await supabaseClient
    .from("cases")
    .insert([{ ...caseData, case_status: "Draft" }])
    .select();
  if (error) throw error;
  return data && data[0];
}

export async function updateCase(caseId, caseData) {
  const { error } = await supabaseClient.from("cases").update(caseData).eq("case_id", caseId);
  if (error) throw error;
}

export async function updateCaseStatus(caseId, newStatus) {
  const { error } = await supabaseClient.from("cases").update({ case_status: newStatus }).eq("case_id", caseId);
  if (error) throw error;
}
