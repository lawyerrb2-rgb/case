// =============================================================
// app.js — จุดเริ่มต้นของแอป: ผูก event ทั้งหมด แล้วโหลดข้อมูลครั้งแรก
// =============================================================
import { state } from "./state.js";
import { PAGE_SIZE, isAdminOrPartner } from "./config.js";
import { debounce } from "./utils.js";
import { renderMetrics, renderUpcomingSchedules } from "./ui/dashboard.js";
import { initCasesTable, refreshCasesTable, resetToFirstPage } from "./ui/casesTable.js";
import {
  toggleCaseModal,
  handleCreateCase,
  toggleEditModal,
  openEditModal,
  handleUpdateCase,
  toggleStatusModal,
  filterStatusCaseDropdown,
  handleUpdateCaseStatus,
  toggleScheduleModal,
  filterCasesForScheduleByToday,
  filterCasesForScheduleByType,
  handleCreateAdditionalSchedule,
  toggleViewModal,
  openViewModal,
  handleOpenContactModalFromCase,
  handleUploadCaseDocument,
  initCaseDocumentsList,
} from "./ui/caseModals.js";
import { initContacts, refreshContactsTable, toggleContactModal, handleSaveContact } from "./ui/contacts.js";
import { switchPage, registerPageRefresh, revealAdminMenuItem } from "./ui/router.js";
import { initAdminPage, refreshAdminPage } from "./ui/admin.js";
import { getCurrentSession, fetchMyProfile, onAuthStateChange } from "./api/auth.js";
import {
  showLoginScreen,
  showPendingScreen,
  showAppShell,
  renderUserBadge,
  initLoginForm,
  initSignupForm,
  initLogoutButton,
} from "./ui/login.js";

state.cases.pageSize = PAGE_SIZE;

let appInitialized = false; // กัน bootstrap ทำงานซ้ำถ้า login/logout สลับไปมา

function wireGlobalSearchAndFilters() {
  const searchInput = document.getElementById("globalSearch");
  searchInput.addEventListener(
    "input",
    debounce((e) => {
      state.cases.searchTerm = e.target.value;
      resetToFirstPage();
      refreshCasesTable();
    }, 300)
  );

  document.getElementById("filterStatus").addEventListener("change", (e) => {
    state.cases.statusFilter = e.target.value;
    resetToFirstPage();
    refreshCasesTable();
  });

  document.getElementById("filterAssignedToMe").addEventListener("change", (e) => {
    state.cases.assignedToMe = e.target.checked;
    resetToFirstPage();
    refreshCasesTable();
  });
}

function wireSidebarNav() {
  document.getElementById("menuCases").addEventListener("click", (e) => {
    e.preventDefault();
    switchPage("cases");
  });
  document.getElementById("menuContacts").addEventListener("click", (e) => {
    e.preventDefault();
    switchPage("contacts");
  });
  document.getElementById("menuAdmin").addEventListener("click", (e) => {
    e.preventDefault();
    switchPage("admin");
  });
  document.getElementById("btnAddCase").addEventListener("click", () => toggleCaseModal(true));
  document.getElementById("btnAddSchedule").addEventListener("click", () => toggleScheduleModal(true));
  document.getElementById("btnUpdateStatus").addEventListener("click", () => toggleStatusModal(true));
}

function wireCaseModal() {
  document.getElementById("caseForm").addEventListener("submit", handleCreateCase);
  document.getElementById("btnCloseCaseModal").addEventListener("click", () => toggleCaseModal(false));
  document.getElementById("btnCancelCaseModal").addEventListener("click", () => toggleCaseModal(false));
}

function wireEditModal() {
  document.getElementById("editCaseForm").addEventListener("submit", handleUpdateCase);
  document.getElementById("btnCloseEditModal").addEventListener("click", () => toggleEditModal(false));
  document.getElementById("btnCancelEditModal").addEventListener("click", () => toggleEditModal(false));
}

function wireStatusModal() {
  document.getElementById("statusForm").addEventListener("submit", handleUpdateCaseStatus);
  document.getElementById("status_case_search").addEventListener("input", filterStatusCaseDropdown);
  document.getElementById("btnCloseStatusModal").addEventListener("click", () => toggleStatusModal(false));
  document.getElementById("btnCancelStatusModal").addEventListener("click", () => toggleStatusModal(false));
}

function wireScheduleModal() {
  document.getElementById("scheduleForm").addEventListener("submit", handleCreateAdditionalSchedule);
  document.getElementById("btnCloseScheduleModal").addEventListener("click", () => toggleScheduleModal(false));
  document.getElementById("btnCancelScheduleModal").addEventListener("click", () => toggleScheduleModal(false));
  document.getElementById("btnFilterScheduleToday").addEventListener("click", filterCasesForScheduleByToday);
  document.getElementById("filterByScheduleType").addEventListener("input", debounce(filterCasesForScheduleByType, 300));
  document.getElementById("btnResetScheduleFilter").addEventListener("click", () => toggleScheduleModal(true));
}

function wireViewModal() {
  document.getElementById("btnCloseViewModal").addEventListener("click", () => toggleViewModal(false));
  document.getElementById("btnCloseViewModalFooter").addEventListener("click", () => toggleViewModal(false));
  document.getElementById("btnAddParticipant").addEventListener("click", handleOpenContactModalFromCase);
  document.getElementById("caseDocumentInput").addEventListener("change", handleUploadCaseDocument);
  initCaseDocumentsList();
}

function wireContactModal() {
  document.getElementById("contactForm").addEventListener("submit", handleSaveContact);
  document.getElementById("btnCloseContactModal").addEventListener("click", () => toggleContactModal(false));
  document.getElementById("btnCancelContactModal").addEventListener("click", () => toggleContactModal(false));
  document.getElementById("btnAddContact").addEventListener("click", () => toggleContactModal(true));
}

/** เรียกครั้งเดียวหลัง login สำเร็จครั้งแรก ผูก event handler ทั้งหมดของแอปหลัก */
function initAppOnce() {
  if (appInitialized) return;
  appInitialized = true;

  wireGlobalSearchAndFilters();
  wireSidebarNav();
  wireCaseModal();
  wireEditModal();
  wireStatusModal();
  wireScheduleModal();
  wireViewModal();
  wireContactModal();

  initCasesTable({ onEdit: openEditModal, onView: openViewModal });
  initContacts();
  initAdminPage();

  registerPageRefresh("contacts", refreshContactsTable);
  registerPageRefresh("admin", refreshAdminPage);
}

/** โหลดข้อมูลของสำนักงาน — เรียกทุกครั้งที่ login สำเร็จ (รวมถึง login ซ้ำหลัง logout) */
async function loadWorkspaceData() {
  await Promise.all([refreshCasesTable(), renderUpcomingSchedules(), renderMetrics()]);
}

/**
 * ตรวจสอบ session ของ Supabase Auth แล้วดึงโปรไฟล์ (สำนักงาน+บทบาท) มาเก็บ
 * ใน state.currentUser — ถ้ายังไม่ login ให้แสดงหน้าล็อกอินแทนทั้งแอป
 * เพราะทุก query ไปยัง cases/schedules/contacts ต้องมี session แนบไปด้วย
 * ไม่งั้น RLS (sql/002_row_level_security.sql) จะปฏิเสธทุกคำขอ
 *
 * ถ้า role เป็น 'pending' (สมัครเองโดยไม่มีคำเชิญตรงกัน — ดู
 * sql/006_invites_and_admin.sql) ให้โชว์หน้ารอการอนุมัติแทน เพราะ
 * organization_id เป็น null และจะไม่ผ่าน RLS ของตารางไหนเลย
 */
async function handleAuthenticatedSession(session) {
  if (!session) {
    state.currentUser = { userId: null, organizationId: null, role: null, fullName: null };
    showLoginScreen();
    return;
  }

  try {
    const profile = await fetchMyProfile(session.user.id);
    state.currentUser = {
      userId: profile.user_id,
      organizationId: profile.organization_id,
      role: profile.role,
      fullName: profile.full_name,
    };

    if (profile.role === "pending" || !profile.organization_id) {
      showPendingScreen();
      return;
    }

    renderUserBadge(state.currentUser);
    showAppShell();
    initAppOnce();
    if (isAdminOrPartner(profile.role)) revealAdminMenuItem();
    await loadWorkspaceData();
  } catch (err) {
    console.error("โหลดโปรไฟล์ผู้ใช้ไม่สำเร็จ:", err.message);
    showLoginScreen();
    document.getElementById("loginError").textContent =
      "⚠️ เข้าสู่ระบบสำเร็จแต่ไม่พบโปรไฟล์ผู้ใช้ โปรดติดต่อผู้ดูแลระบบ";
    document.getElementById("loginError").classList.remove("hidden");
  }
}

async function bootstrap() {
  const onLoginSuccess = async () => {
    const session = await getCurrentSession();
    await handleAuthenticatedSession(session);
  };

  initLoginForm(onLoginSuccess);
  initSignupForm(onLoginSuccess);
  initLogoutButton(() => showLoginScreen());

  const session = await getCurrentSession();
  await handleAuthenticatedSession(session);

  // ถ้า session หมดอายุระหว่างใช้งาน (เช่น token refresh ล้มเหลว, หรือ
  // ผู้ใช้ logout จากแท็บอื่น) ให้เด้งกลับหน้าล็อกอินทันทีแทนที่จะปล่อยให้
  // ทุก request ค้าง/ถูก RLS ปฏิเสธเงียบๆ
  onAuthStateChange((session) => {
    if (!session) showLoginScreen();
  });
}

document.addEventListener("DOMContentLoaded", bootstrap);
