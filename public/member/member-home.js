(() => {
  "use strict";

  // ===== Supabase =====
  const SUPABASE_URL = "https://hdxuvxvxocyzeggcrcyg.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_2DRqxosSHRram-e16oNuIg_c_4iBE94";
  const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  const elList = document.getElementById("meetingList");

  function safeText(s) {
    return (s ?? "").toString().trim();
  }

  async function loadMeetings() {
    const { data, error } = await supabase
      .from("meetings")
      .select("id, title")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      elList.innerHTML = "<li>会議を読み込めませんでした</li>";
      return;
    }

    if (!data || data.length === 0) {
      elList.innerHTML = "<li>会議がまだありません</li>";
      return;
    }

    elList.innerHTML = "";

    for (const m of data) {
      const li = document.createElement("li");
      li.style.margin = "8px 0";

      const a = document.createElement("a");
      a.href = `./member.html?meeting_id=${encodeURIComponent(m.id)}`;
      a.textContent = safeText(m.title) || "(No title)";
      a.style.cursor = "pointer";

      li.appendChild(a);
      elList.appendChild(li);
    }
  }

  loadMeetings();
})();