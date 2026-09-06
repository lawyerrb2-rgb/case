// =============================================================
// api/activityLog.js — ประวัติการแก้ไขคดี (อ่านอย่างเดียว)
// =============================================================
// แถวในตารางนี้ถูกสร้างอัตโนมัติโดย trigger ในฐานข้อมูล
// (sql/003_audit_log.sql) — เลเยอร์นี้จึงมีแค่ select ไม่มี insert/update
// เพื่อไม่เปิดช่องให้ใครมาปลอมแปลงประวัติผ่านหน้าเว็บ
import { supabaseClient } from "../config.js";

export async function listActivityForCase(caseId, limit = 20) {
  const { data, error } = await supabaseClient
    .from("case_activity_log")
    .select("log_id, action, old_status, new_status, changed_at, profiles ( full_name )")
    .eq("case_id", caseId)
    .order("changed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
