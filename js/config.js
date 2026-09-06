// =============================================================
// config.js — การตั้งค่ากลางของระบบ (Single Source of Truth)
// =============================================================
// เดิมค่าคงที่แบบนี้ (สถานะคดี, สีป้าย, ชื่อภาษาไทย) ถูกก็อปวางซ้ำ
// กระจายอยู่ 5-6 จุดทั่วไฟล์ (fetchCases, fetchMetrics,
// renderStatusCaseList, filterStatusCaseDropdown, fetchContacts, ...)
// ทำให้ถ้าจะเพิ่มสถานะใหม่ 1 สถานะ ต้องไปแก้ 6 ที่ และมีโอกาสพิมพ์ตก
// ไฟล์นี้รวมทุกอย่างไว้ที่เดียว แก้ครั้งเดียวจบทั้งระบบ

// -------------------------------------------------------------
// 1) การเชื่อมต่อฐานข้อมูล
// -------------------------------------------------------------
// ⚠️ หมายเหตุด้านความปลอดภัย:
// ANON KEY สามารถฝังไว้ฝั่ง client ได้ตามปกติ "ก็ต่อเมื่อ" เปิดใช้
// Row Level Security (RLS) ใน Supabase ควบคู่กับ Supabase Auth แล้วเท่านั้น
// ระบบเดิมไม่มีการล็อกอินเลย (ไม่มี supabase.auth) ซึ่งหมายความว่า
// ถ้า RLS ยังไม่ได้เปิด ใครก็ตามที่รู้ URL + ANON KEY นี้จะอ่าน/แก้/ลบ
// ข้อมูลคดีความและข้อมูลส่วนบุคคลของคู่ความได้ทั้งหมด — ควรแก้เป็นลำดับแรก
// ก่อนขยายเป็นระบบระดับองค์กร (ดูรายละเอียดใน README.md หัวข้อ "ความปลอดภัย")
export const SUPABASE_URL = "https://vktpxtjocwssdneccukz.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_d9hN5dKSkMJ9Hz240uuw7A_CT5PBSmM";

export const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -------------------------------------------------------------
// 2) การตั้งค่าการแสดงผลตาราง
// -------------------------------------------------------------
export const PAGE_SIZE = 10;

// -------------------------------------------------------------
// 3) สถานะคดีความ — ป้ายกำกับ, สี, และคำค้นหาภาษาไทยที่เกี่ยวข้อง
// -------------------------------------------------------------
// key ต้องตรงกับค่าในคอลัมน์ case_status ของตาราง cases
export const CASE_STATUS = {
  Draft: {
    label: "ร่างฟ้อง",
    fullLabel: "Draft (ร่างคำฟ้อง)",
    badgeClass: "bg-slate-100 text-slate-600",
    barClass: "bg-amber-400",
    searchTerms: "ร่างฟ้อง ร่างคำฟ้อง ร่างคำร้อง draft",
  },
  In_Progress: {
    label: "อยู่ระหว่างพิจารณาคดี",
    fullLabel: "In Progress (พิจารณาคดี)",
    badgeClass: "bg-blue-100 text-blue-700",
    barClass: "bg-blue-500",
    searchTerms: "อยู่ระหว่างพิจารณาคดี สืบพยาน พิจารณา progress",
  },
  Appealing: {
    label: "อุทธรณ์/ฎีกา",
    fullLabel: "Appealing (ชั้นอุทธรณ์/ฎีกา)",
    badgeClass: "bg-amber-100 text-amber-700",
    barClass: "bg-purple-500",
    searchTerms: "อุทธรณ์ ฎีกา appealing",
  },
  Execution: {
    label: "บังคับคดี",
    fullLabel: "Execution (บังคับคดี)",
    badgeClass: "bg-amber-100 text-amber-300",
    barClass: "bg-amber-300",
    searchTerms: "บังคับคดี execution",
  },
  Closed: {
    label: "ปิดคดี",
    fullLabel: "Closed (ปิดคดีแล้ว)",
    badgeClass: "bg-emerald-100 text-emerald-700",
    barClass: "bg-emerald-500",
    searchTerms: "ปิดคดี ปิดสำนวนถาวร closed",
  },
};

export const CASE_STATUS_ORDER = ["Draft", "In_Progress", "Appealing", "Execution", "Closed"];

export function getStatusMeta(statusKey) {
  return CASE_STATUS[statusKey] || CASE_STATUS.Draft;
}

// -------------------------------------------------------------
// 4) ประเภทคดี
// -------------------------------------------------------------
export const CASE_TYPES = {
  Civil: "Civil (คดีแพ่ง)",
  Criminal: "Criminal (คดีอาญา)",
  Labor: "Labor (คดีแรงงาน)",
  Administrative: "Administrative (คดีปกครอง)",
  Other: "Other (คดีอื่นๆ)",
};

// -------------------------------------------------------------
// 5) บทบาทฝั่งลูกความของสำนักงาน (ต่อคดี)
// -------------------------------------------------------------
export const CLIENT_ROLES = {
  "โจทก์": "โจทก์ (เราเป็นทนายโจทก์)",
  "จำเลย": "จำเลย (เราเป็นทนายจำเลย)",
  "ผู้ร้อง": "ผู้ร้อง (เราเป็นทนายผู้ร้องขอต่อศาล)",
  "ผู้คัดค้าน": "ผู้คัดค้าน (เราเป็นทนายฝั่งยื่นคำคัดค้าน)",
};

// -------------------------------------------------------------
// 6) บทบาทของผู้ติดต่อ/คู่ความในสมุดรายชื่อ
// -------------------------------------------------------------
export const CONTACT_ROLES = {
  Plaintiff: { label: "โจทก์", badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  Defendant: { label: "จำเลย", badgeClass: "bg-red-50 text-red-700 border border-red-200" },
  Petitioner: { label: "ผู้ร้อง", badgeClass: "bg-purple-50 text-purple-700 border border-purple-200" },
  Objector: { label: "ผู้คัดค้าน", badgeClass: "bg-amber-50 text-amber-700 border border-amber-200" },
  Witness: { label: "พยาน", badgeClass: "bg-blue-50 text-blue-700 border border-blue-200" },
};

export function getContactRoleMeta(roleKey) {
  return CONTACT_ROLES[roleKey] || { label: roleKey || "คู่ความ", badgeClass: "bg-slate-100 text-slate-600" };
}

// -------------------------------------------------------------
// 7) บทบาทผู้ใช้งานระบบ (ตาราง profiles) — ใช้คุมสิทธิ์ฝั่ง UI
// -------------------------------------------------------------
// การบังคับใช้จริงอยู่ที่ RLS policy ในฐานข้อมูล (sql/002_row_level_security.sql)
// ค่าพวกนี้ใช้แค่ "ซ่อน/ปิด" ปุ่มที่ผู้ใช้ไม่มีสิทธิ์อยู่แล้วเพื่อ UX ที่ดีขึ้น
// ห้ามพึ่งพาชั้นนี้เพียงอย่างเดียวเพื่อความปลอดภัย
export const USER_ROLES = {
  admin: "ผู้ดูแลระบบ",
  partner: "หุ้นส่วนสำนักงาน",
  lawyer: "ทนายความ",
  paralegal: "ผู้ช่วยทนายความ",
};

// เฉพาะ admin/partner เท่านั้นที่ปิดสำนวนคดีถาวรได้ (สอดคล้องกับ RLS policy
// "cases_update_same_org" ที่บล็อกการตั้ง case_status = 'Closed' จากบทบาทอื่น)
export function canCloseCase(role) {
  return role === "admin" || role === "partner";
}
