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
 * @returns {Promise<{cases: object[], totalCount: number}>}
 */
export async function listCases({ search = "", status = "ALL", page = 1, pageSize = 10 } = {}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseClient
    .from("cases")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search.trim() !== "") {
    // หมายเหตุ: อักขระ % และ , ในคำค้นหาอาจกระทบรูปแบบของ .or() นี้ได้
    // สำหรับระบบระดับองค์กรควรย้ายการค้นหาไปทำผ่าน Postgres function (rpc)
    // หรือ full-text search index แทนการต่อสตริงแบบนี้
    const term = search.trim().replace(/[%,]/g, "");
    query = query.or(
      `black_number.ilike.%${term}%,red_number.ilike.%${term}%,court_name.ilike.%${term}%,case_status.ilike.%${term}%,description.ilike.%${term}%`
    );
  }

  if (status !== "ALL") {
    query = query.eq("case_status", status);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  return { cases: data || [], totalCount: count || 0 };
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
