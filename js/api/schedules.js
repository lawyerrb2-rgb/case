// =============================================================
// api/schedules.js — เลเยอร์เข้าถึงข้อมูล "วันนัดหมาย" (ตาราง schedules)
// =============================================================
import { supabaseClient } from "../config.js";

/** นัดหมายที่ยังไม่ถึงและยังไม่เสร็จสิ้น เรียงใกล้สุดก่อน ใช้กับแดชบอร์ด */
export async function listUpcomingSchedules(limit = 5) {
  const todayIso = new Date().toISOString();
  const { data, error } = await supabaseClient
    .from("schedules")
    .select(`event_date, event_type, case_id, cases ( black_number, red_number, court_name )`)
    .gte("event_date", todayIso)
    .eq("is_completed", false)
    .order("event_date", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/** ใช้ map เอาวันนัดล่าสุดของแต่ละคดีมาแปะในตารางคดีความหลัก */
export async function listAllSchedulesForCaseMapping() {
  const { data, error } = await supabaseClient
    .from("schedules")
    .select("case_id, event_date, event_type")
    .order("event_date", { ascending: false });
  if (error) throw error;
  return data || [];
}

/** นัดหมายทั้งหมดของคดีหนึ่งคดี เรียงตามลำดับที่สร้าง (นัดแรกสุดอยู่บน) */
export async function listSchedulesByCase(caseId) {
  const { data, error } = await supabaseClient
    .from("schedules")
    .select("event_id, event_date, event_type")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createSchedule({ caseId, eventDateIso, eventType, notes = null, remindDays = 7, organizationId }) {
  const { error } = await supabaseClient.from("schedules").insert([
    {
      case_id: caseId,
      event_date: eventDateIso,
      event_type: eventType,
      notes,
      remind_days: remindDays,
      is_completed: false,
      // ต้องแนบให้ตรงกับผู้ login อยู่ ไม่งั้น RLS with-check จะปฏิเสธ insert
      organization_id: organizationId,
    },
  ]);
  if (error) throw error;
}

export async function updateSchedule(eventId, { eventDateIso, eventType }) {
  const { error } = await supabaseClient
    .from("schedules")
    .update({ event_date: eventDateIso, event_type: eventType })
    .eq("event_id", eventId);
  if (error) throw error;
}

/** ค้นหารหัสคดีที่มีนัดหมายภายในวันนี้ (ใช้กับตัวช่วยค้นหาในหน้าลงนัดเพิ่ม) */
export async function findCaseIdsWithScheduleToday() {
  const todayStr = new Date().toISOString().split("T")[0];
  const { data, error } = await supabaseClient
    .from("schedules")
    .select("case_id")
    .gte("event_date", `${todayStr}T00:00:00Z`)
    .lte("event_date", `${todayStr}T23:59:59Z`);
  if (error) throw error;
  return [...new Set((data || []).map((s) => s.case_id))];
}

/** ค้นหารหัสคดีจากคำสำคัญของประเภทนัดหมาย */
export async function findCaseIdsByScheduleTypeKeyword(keyword) {
  const { data, error } = await supabaseClient.from("schedules").select("case_id").ilike("event_type", `%${keyword}%`);
  if (error) throw error;
  return [...new Set((data || []).map((s) => s.case_id))];
}
