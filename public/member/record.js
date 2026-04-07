(() => {
  "use strict";

  // ===== Supabase (same as app.js) =====
  const SUPABASE_URL = "https://hdxuvxvxocyzeggcrcyg.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_2DRqxosSHRram-e16oNuIg_c_4iBE94";
  const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  const TYPE_LABEL = {
    report: "報告・確認事項",
    discuss: "審議事項",
    contact: "連絡事項",
  };
  const TYPE_ORDER = ["report", "discuss", "contact"];

  function getMeetingId() {
    const p = new URLSearchParams(window.location.search);
    return (p.get("meeting_id") || "").trim();
  }

  function el(tag, attrs = {}, text = null) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "className") n.className = v;
      else n.setAttribute(k, v);
    }
    if (text !== null) n.textContent = text;
    return n;
  }

  async function loadMeetingTitle(meetingId) {
    const { data, error } = await supabase
      .from("meetings")
      .select("title")
      .eq("id", meetingId)
      .single();
    if (error) return null;
    return data?.title || null;
  }

  async function loadAgendaItems(meetingId) {
    const { data, error } = await supabase
      .from("agenda_items")
      .select(
        "id, agenda_no, type, title_jp, title_en, materials_text, suggestion, decision_text"
      )
      .eq("meeting_id", meetingId)
      .order("agenda_no", { ascending: true });
    if (error) return [];
    return data || [];
  }


  async function loadAttendanceForMeeting(meetingId) {
  const { data, error } = await supabase
    .from("attendance")
    .select("name, created_at")
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data || [])
    .map(r => (r.name || "").trim())
    .filter(Boolean);
}

  function render(meetingTitle, attendanceNames, agendaItems) {
    const titleEl = document.getElementById("meetingTitle");
    const contentEl = document.getElementById("recordContent");
    const printBtn = document.getElementById("printBtn");
    const exportHtmlBtn = document.getElementById("exportHtmlBtn");

    if (printBtn) printBtn.onclick = () => window.print();

if (exportHtmlBtn) {
  exportHtmlBtn.onclick = () => {
    const safeTitle = (meetingTitle || "議事録").replace(/[\\/:*?"<>|]/g, "_");

    const styleTag = document.querySelector("style");
    const css = styleTag ? styleTag.innerHTML : "";

    const headerEl = document.querySelector(".record-header");
    const wrapEl = document.querySelector(".record-wrap");

    const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>${safeTitle}（議事録）</title>
<style>${css}</style>
</head>
<body>
${headerEl ? headerEl.outerHTML : ""}
${wrapEl ? wrapEl.outerHTML : ""}
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeTitle}_議事録.html`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
}
    if (titleEl) titleEl.textContent = meetingTitle || "";
    contentEl.innerHTML = "";
    
    // Attendance line (出席者)
    const attLine = document.createElement("div");
    attLine.style.margin = "10px 0 14px";
    attLine.style.fontSize = "14px";
    attLine.style.color = "#333";

const namesText = (attendanceNames && attendanceNames.length)
  ? attendanceNames.join("、")
  : "（未記入）";

attLine.textContent = `出席者：${namesText}`;
contentEl.appendChild(attLine);

    for (const type of TYPE_ORDER) {
      const items = agendaItems.filter(it => it.type === type);
      if (!items.length) continue;

      contentEl.appendChild(
        el("div", { className: "record-section" }, TYPE_LABEL[type])
      );

      for (const it of items) {
        const box = el("div", { className: "record-item" });

        box.appendChild(
          el("div", { className: "record-agenda-title" },
            `${it.agenda_no}. ${it.title_jp || ""}`)
        );

        if (it.title_en) {
          box.appendChild(
            el("div", { className: "record-agenda-en" }, it.title_en)
          );
        }

        // 内容 / 概要
        const materialsText = (it.materials_text || "").trim();
        const contentSection = el("div", {});
        contentSection.appendChild(
          el("div", { className: "record-field-label" }, "内容 / 概要")
        );
        const contentBody = el("div", {
          className: materialsText
            ? "record-field-body"
            : "record-field-body record-fallback"
        });
        contentBody.textContent = materialsText || "記載なし";
        contentSection.appendChild(contentBody);
        box.appendChild(contentSection);

        // 案
        const suggestion = (it.suggestion || "").trim();
        const suggestionSection = el("div", {});
        suggestionSection.appendChild(
          el("div", { className: "record-field-label" }, "案")
        );
        const suggestionBody = el("div", {
          className: suggestion
            ? "record-field-body"
            : "record-field-body record-fallback"
        });
        suggestionBody.textContent = suggestion || "記載なし";
        suggestionSection.appendChild(suggestionBody);
        box.appendChild(suggestionSection);

        // 結果
        const decisionText = (it.decision_text || "").trim();
        const decisionText = (it.decision_text || "").trim();

if (decisionText) {
  const resultSection = el("div", {});
  resultSection.appendChild(
    el("div", { className: "record-field-label" }, "結果")
  );

  const resultBody = el("div", { className: "record-decision" });
  resultBody.textContent = decisionText;

  resultSection.appendChild(resultBody);
  box.appendChild(resultSection);
}
        contentEl.appendChild(box);
      }
    }
  }

  (async () => {
  const meetingId = getMeetingId();
  const titleEl = document.getElementById("meetingTitle");
  const contentEl = document.getElementById("recordContent");

  if (!meetingId) {
    if (titleEl) titleEl.textContent = "";
    if (contentEl) {
      contentEl.innerHTML =
        'No meeting selected.<br><a href="./member-home.html">← Back to Meeting List</a>';
    }
    return;
  }

  const title = await loadMeetingTitle(meetingId);
  const agenda = await loadAgendaItems(meetingId);
  const attendanceNames = await loadAttendanceForMeeting(meetingId);

  if (title) document.title = `議事録 – ${title}`;
  render(title, attendanceNames, agenda);
})();
})();