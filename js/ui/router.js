// =============================================================
// ui/router.js — สลับหน้าจอ "คดีความ" <-> "สมุดรายชื่อ" <-> "จัดการผู้ใช้งาน"
// =============================================================
const ACTIVE_CLASS = "flex items-center px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-50 text-blue-700";
const INACTIVE_CLASS = "flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900";

const PAGES = {
  cases: { pageId: "casesPage", menuId: "menuCases" },
  contacts: { pageId: "contactsPage", menuId: "menuContacts" },
  admin: { pageId: "adminPage", menuId: "menuAdmin" },
};

// เติมด้วย registerPageRefresh() จาก app.js ตอน bootstrap เพื่อไม่ต้อง
// import ui/contacts.js และ ui/admin.js เข้ามาตรงนี้ (กัน circular import
// เพราะทั้งสองไฟล์นั้น import จาก caseModals.js ซึ่งอาจย้อนมา import router.js)
const onEnterPage = {};

export function registerPageRefresh(page, callback) {
  onEnterPage[page] = callback;
}

export function switchPage(page) {
  Object.entries(PAGES).forEach(([key, { pageId, menuId }]) => {
    const pageEl = document.getElementById(pageId);
    const menuEl = document.getElementById(menuId);
    const isActive = key === page;
    pageEl.classList.toggle("hidden", !isActive);
    // เมนู admin ถูกซ่อนไว้ทั้งหมดด้วย class "hidden" เฉยๆ (ไม่มี "flex")
    // สำหรับผู้ใช้ที่ไม่มีสิทธิ์ — ไม่แตะต้องถ้ายังไม่เคยถูกเปิดให้เห็น
    if (menuEl.classList.contains("hidden") && key === "admin") return;
    menuEl.className = isActive ? ACTIVE_CLASS : INACTIVE_CLASS;
  });

  if (onEnterPage[page]) onEnterPage[page]();
}

/** เรียกครั้งเดียวตอนโหลดสิทธิ์ผู้ใช้เสร็จ เพื่อเปิดเมนู admin ให้ role ที่มีสิทธิ์เห็น */
export function revealAdminMenuItem() {
  document.getElementById("menuAdmin").classList.remove("hidden");
  document.getElementById("menuAdmin").className = INACTIVE_CLASS;
}
