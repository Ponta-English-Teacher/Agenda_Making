const KEY = "agenda_login_ok";

// remove login flag
localStorage.removeItem(KEY);

// redirect to login page
window.location.href = "./login.html";
