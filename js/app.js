// =============================================================
// app.js — จุดเริ่มต้นของแอป: ผูก event ทั้งหมด แล้วโหลดข้อมูลครั้งแรก
// =============================================================
import { state } from "./state.js";
import { PAGE_SIZE } from "./config.js";
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
} from "./ui/caseModals.js";
import { initContacts, refreshContactsTable, toggleContactModal, handleSaveContact } from "./ui/contacts.js";
import { switchPage } from "./ui/router.js";

state.cases.pageSize = PAGE_SIZE;

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
}

function wireContactModal() {
  document.getElementById("contactForm").addEventListener("submit", handleSaveContact);
  document.getElementById("btnCloseContactModal").addEventListener("click", () => toggleContactModal(false));
  document.getElementById("btnCancelContactModal").addEventListener("click", () => toggleContactModal(false));
  document.getElementById("btnAddContact").addEventListener("click", () => toggleContactModal(true));
}

async function bootstrap() {
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

  await Promise.all([refreshCasesTable(), renderUpcomingSchedules(), renderMetrics()]);
}

document.addEventListener("DOMContentLoaded", bootstrap);
