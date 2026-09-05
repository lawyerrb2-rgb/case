// =============================================================
// api/contacts.js — เลเยอร์เข้าถึงข้อมูล "คู่ความ/ผู้ติดต่อ" (ตาราง contacts)
// =============================================================
import { supabaseClient } from "../config.js";

/** สมุดรายชื่อทั้งหมด พร้อมเลขคดีดำที่ผูกไว้ (ถ้ามี) */
export async function listAllContacts() {
  const { data, error } = await supabaseClient
    .from("contacts")
    .select(`contact_id, case_id, full_name, role, citizen_id, contact_info, cases ( black_number )`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/** รายชื่อคู่ความเฉพาะของคดีหนึ่งคดี ใช้ในหน้าต่างรายละเอียดคดี */
export async function listContactsByCase(caseId) {
  const { data, error } = await supabaseClient
    .from("contacts")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createContact(contactData) {
  const { error } = await supabaseClient.from("contacts").insert([contactData]);
  if (error) throw error;
}

export async function updateContact(contactId, contactData) {
  const { error } = await supabaseClient.from("contacts").update(contactData).eq("contact_id", contactId);
  if (error) throw error;
}
