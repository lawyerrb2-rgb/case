// =============================================================
// ui/login.js — หน้าจอเข้าสู่ระบบ
// =============================================================
import { signInWithPassword, signOut } from "../api/auth.js";
import { USER_ROLES } from "../config.js";

export function showLoginScreen() {
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("appShell").classList.add("hidden");
}

export function showAppShell() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("appShell").classList.remove("hidden");
}

export function renderUserBadge({ fullName, role }) {
  document.getElementById("userBadgeName").textContent = fullName || "";
  document.getElementById("userBadgeRole").textContent = USER_ROLES[role] || role || "";
}

export function initLoginForm(onLoginSuccess) {
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");
  const submitBtn = document.getElementById("btnLoginSubmit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.classList.add("hidden");
    submitBtn.disabled = true;
    submitBtn.textContent = "กำลังเข้าสู่ระบบ...";

    const email = document.getElementById("login_email").value.trim();
    const password = document.getElementById("login_password").value;

    try {
      await signInWithPassword(email, password);
      form.reset();
      await onLoginSuccess();
    } catch (err) {
      errorBox.textContent = "❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง";
      errorBox.classList.remove("hidden");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "เข้าสู่ระบบ";
    }
  });
}

export function initLogoutButton(onLoggedOut) {
  document.getElementById("btnLogout").addEventListener("click", async () => {
    await signOut();
    onLoggedOut();
  });
}
