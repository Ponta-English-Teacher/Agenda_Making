const KEY = "agenda_login_ok";

// 1) login check (same as before)
if (localStorage.getItem(KEY) !== "ok") {
  localStorage.setItem("agenda_redirect_after_login", window.location.href);
  window.location.href = "./login.html";
}

// 2) chair-page block (NEW)
const chairPages = ["index.html", "working.html"];
const current = location.pathname.split("/").pop();

if (chairPages.includes(current)) {
  window.location.href = "./member/member-home.html";
}