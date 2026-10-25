// =============================================================
// api/deletions.js — รหัสยืนยันการลบคดี + ประวัติการลบ (sql/009)
// =============================================================
import { supabaseClient } from "../config.js";

/** (admin เท่านั้น) ออกรหัสยืนยันการลบ ใช้ได้ครั้งเดียว/15 นาที/ผูกกับคดีเดียว */
export async function createDeletionCode(caseId) {
  const { data, error } = await supabaseClient.rpc("create_deletion_code", { p_case_id: caseId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { code: row.out_code, expiresAt: row.out_expires_at };
}

export async function listCaseDeletions(limit = 20) {
  const { data, error } = await supabaseClient
    .from("case_deletions")
    .select("deletion_id, case_id, black_number, court_name, deleted_by_name, approved_by_name, deleted_at")
    .order("deleted_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
