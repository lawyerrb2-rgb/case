// =============================================================
// ui/router.js — สลับหน้าจอ "คดีความ" <-> "สมุดรายชื่อ"
// =============================================================
// บั๊กของเดิม: switchPage() พยายามหา document.getElementById('casesPage')
// แต่เนื้อหาหน้าคดีความจริงๆ ไม่เคยถูกครอบด้วย id="casesPage" เลย
// (getElementById('dashboardPage') || getElementById('casesPage') ได้ null
// ทั้งคู่) ผลคือ `casesPage?.classList.add('hidden')` ไม่ทำงาน — พอสลับไป
// หน้าสมุดรายชื่อ เนื้อหาคดีความยังค้างซ้อนอยู่ข้างใต้ ในไฟล์ index.html
// ที่แก้ใหม่ได้ครอบ id="casesPage" ไว้ให้ถูกต้องแล้ว
import { refreshContactsTable } from "./contacts.js";

const ACTIVE_CLASS = "flex items-center px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-50 text-blue-700";
const INACTIVE_CLASS = "flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900";

export function switchPage(page) {
  const casesPage = document.getElementById("casesPage");
  const contactsPage = document.getElementById("contactsPage");
  const menuCases = document.getElementById("menuCases");
  const menuContacts = document.getElementById("menuContacts");

  const showingContacts = page === "contacts";
  casesPage.classList.toggle("hidden", showingContacts);
  contactsPage.classList.toggle("hidden", !showingContacts);
  menuCases.className = showingContacts ? INACTIVE_CLASS : ACTIVE_CLASS;
  menuContacts.className = showingContacts ? ACTIVE_CLASS : INACTIVE_CLASS;

  if (showingContacts) refreshContactsTable();
}
