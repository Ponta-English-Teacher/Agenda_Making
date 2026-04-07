(() => {
  "use strict";

  // ===== Supabase =====
  const SUPABASE_URL = "https://hdxuvxvxocyzeggcrcyg.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_2DRqxosSHRram-e16oNuIg_c_4iBE94";

  if (!window.supabase) {
    alert("Supabase library not loaded. Check script tag in index.html.");
    return;
  }

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ===== DOM =====
  const elMeetingList = document.getElementById("meetingList");
  const btnNewMeeting = document.getElementById("btnNewMeeting");

  // ===== Load meetings =====
  async function loadMeetings() {
    if (!elMeetingList) return;

    elMeetingList.innerHTML = `<li style="color:#666;">Loading…</li>`;

    const { data, error } = await supabase
      .from("meetings")
      .select("id, title, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load meetings:", error);
      elMeetingList.innerHTML = `<li style="color:#b00;">Failed to load meetings. Check console.</li>`;
      return;
    }

    if (!data || data.length === 0) {
      elMeetingList.innerHTML = `<li style="color:#666;">No meetings yet.</li>`;
      return;
    }

    elMeetingList.innerHTML = "";

    for (const m of data) {
  const li = document.createElement("li");
  li.className = "meeting-item";
  li.style.cssText = "display:flex; align-items:center; justify-content:space-between; gap:10px;";

  const a = document.createElement("a");
  a.href = `./working.html?meeting_id=${encodeURIComponent(m.id)}`;
  a.textContent = (m.title || "").trim() || "(Untitled meeting)";

  const btnDel = document.createElement("button");
  btnDel.textContent = "Delete";
  btnDel.style.cssText =
    "flex-shrink:0; padding:4px 10px; border-radius:8px; border:1px solid rgba(180,0,0,.35);" +
    "background:#fff0f0; color:#b00; font-size:12px; cursor:pointer;";

  btnDel.addEventListener("click", async () => {
    const title = (m.title || "").trim() || "(Untitled meeting)";
    const ok = confirm(`Delete "${title}"?\n\nThis will permanently remove all related data.`);
    if (!ok) return;

    btnDel.disabled = true;
    btnDel.textContent = "Deleting…";

    const id = m.id;

    // ✅ FULL SAFE DELETE ORDER
    const steps = [
      { table: "opinions",     col: "meeting_id" },
      { table: "attendance",   col: "meeting_id" },
      { table: "decisions",    col: "meeting_id" },   // ← added
      { table: "agenda_items", col: "meeting_id" },
      { table: "meetings",     col: "id" },
    ];

    for (const step of steps) {
      const { error } = await supabase
        .from(step.table)
        .delete()
        .eq(step.col, id);

      if (error) {
        console.error(`Failed to delete from ${step.table}:`, error);
        alert(`Delete failed at table "${step.table}".`);
        btnDel.disabled = false;
        btnDel.textContent = "Delete";
        return;
      }
    }

    // Remove from UI
    li.remove();

    // Update count
    const elCount = document.getElementById("meetingCount");
    if (elCount) {
      const remaining = elMeetingList.querySelectorAll("li").length;
      elCount.textContent = remaining ? `${remaining} meeting(s)` : "";
      if (!remaining) {
        elMeetingList.innerHTML = `<li style="color:#666;">No meetings yet.</li>`;
      }
    }
  });

  li.appendChild(a);
  li.appendChild(btnDel);
  elMeetingList.appendChild(li);
}
  }

  // ===== Init =====
  function init() {
    // Create New Meeting = open EMPTY working page (create mode)
    if (btnNewMeeting) {
      btnNewMeeting.addEventListener("click", () => {
        window.location.href = "./working.html";
      });
    }

    loadMeetings();
  }

  init();
})();