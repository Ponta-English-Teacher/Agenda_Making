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
      const a = document.createElement("a");

      a.href = `./working.html?meeting_id=${encodeURIComponent(m.id)}`;
      a.textContent = (m.title || "").trim() || "(Untitled meeting)";

      li.appendChild(a);
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