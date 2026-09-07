// =============================================================
// ui/login.js — หน้าจอเข้าสู่ระบบ
// =============================================================
import { signInWithPassword, signOut, signUpWithPassword } from "../api/auth.js";
import { USER_ROLES } from "../config.js";

export function showLoginScreen() {
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("pendingScreen").classList.add("hidden");
  document.getElementById("appShell").classList.add("hidden");
}

export function showPendingScreen() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("pendingScreen").classList.remove("hidden");
  document.getElementById("appShell").classList.add("hidden");
}

export function showAppShell() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("pendingScreen").classList.add("hidden");
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
  const handler = async () => {
    await signOut();
    onLoggedOut();
  };
  document.getElementById("btnLogout").addEventListener("click", handler);
  document.getElementById("btnLogoutFromPending").addEventListener("click", handler);
}

export function initSignupForm(onLoginSuccess) {
  const toggleBtn = document.getElementById("btnToggleSignup");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  toggleBtn.addEventListener("click", () => {
    const showingSignup = signupForm.classList.contains("hidden");
    loginForm.classList.toggle("hidden", showingSignup);
    signupForm.classList.toggle("hidden", !showingSignup);
    toggleBtn.textContent = showingSignup ? "มีบัญชีอยู่แล้ว? เข้าสู่ระบบ" : "ยังไม่มีบัญชี? สมัครสมาชิกใหม่ (สำหรับผู้ที่ได้รับคำเชิญแล้ว)";
  });

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById("signupError");
    const successBox = document.getElementById("signupSuccess");
    const submitBtn = document.getElementById("btnSignupSubmit");
    errorBox.classList.add("hidden");
    successBox.classList.add("hidden");
    submitBtn.disabled = true;
    submitBtn.textContent = "กำลังสมัครสมาชิก...";

    const fullName = document.getElementById("signup_full_name").value.trim();
    const email = document.getElementById("signup_email").value.trim();
    const password = document.getElementById("signup_password").value;

    try {
      const session = await signUpWithPassword(email, password, fullName);
      if (session) {
        // บาง Supabase project ปิด "Confirm email" ไว้ ทำให้ signUp ได้ session
        // ทันที — พาเข้าแอปเลยโดยไม่ต้องรอยืนยันอีเมล
        signupForm.reset();
        await onLoginSuccess();
      } else {
        successBox.textContent = "✅ สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตนก่อนเข้าสู่ระบบ";
        successBox.classList.remove("hidden");
        signupForm.reset();
      }
    } catch (err) {
      errorBox.textContent = "❌ " + err.message;
      errorBox.classList.remove("hidden");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "สมัครสมาชิก";
    }
  });
}
