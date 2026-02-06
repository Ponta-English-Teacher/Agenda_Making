// ===== Shared credentials (prototype) =====
const SHARED_ID = "Hokusei English";
const PASSWORD = "hokusei2026"; // <- set this
// =========================================

const KEY = "agenda_login_ok";

const idEl = document.getElementById("idInput");
const pwEl = document.getElementById("pwInput");
const btn = document.getElementById("loginBtn");
const msg = document.getElementById("msg");

btn.addEventListener("click", () => {
  const id = (idEl.value || "").trim();
  const pw = (pwEl.value || "").trim();

if (id === SHARED_ID && pw === PASSWORD) {
  localStorage.setItem(KEY, "ok");

  const redirect = localStorage.getItem("agenda_redirect_after_login");
  if (redirect) {
    localStorage.removeItem("agenda_redirect_after_login");
    window.location.href = redirect;
  } else {
    // default page
    window.location.href = "./member/member-home.html";
  }

} else {
  msg.textContent = "Login failed.";
}
});

