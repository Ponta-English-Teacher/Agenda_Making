(() => {
  "use strict";

  // ===== Supabase =====
  const SUPABASE_URL = "https://hdxuvxvxocyzeggcrcyg.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_2DRqxosSHRram-e16oNuIg_c_4iBE94";
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
      .select("id, agenda_no, type, title_jp, title_en, materials_text, suggestion, decision_text")
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
    return (data || []).map(r => (r.name || "").trim()).filter(Boolean);
  }

  function render(meetingTitle, attendanceNames, agendaItems) {
    const titleEl   = document.getElementById("meetingTitle");
    const contentEl = document.getElementById("recordContent");
    const printBtn  = document.getElementById("printBtn");
    const exportHtmlBtn = document.getElementById("exportHtmlBtn");

    if (printBtn) printBtn.onclick = () => window.print();

    if (exportHtmlBtn) {
      exportHtmlBtn.onclick = () => {
        const safeTitle = (meetingTitle || "議事録").replace(/[\\/:*?"<>|]/g, "_");
        const styleTag  = document.querySelector("style");
        const css       = styleTag ? styleTag.innerHTML : "";
        const headerEl  = document.querySelector(".record-header");
        const wrapEl    = document.querySelector(".record-wrap");

        const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>${safeTitle}（議事録）</title>
<style>${css}</style>
</head>
<body>
${headerEl ? headerEl.outerHTML : ""}
${wrapEl   ? wrapEl.outerHTML   : ""}
</body>
</html>`;

        const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `${safeTitle}_議事録.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };
    }

    if (titleEl) titleEl.textContent = meetingTitle || "";
    contentEl.innerHTML = "";

    // 出席者
    const attLine = document.createElement("div");
    attLine.style.cssText = "margin:10px 0 14px; font-size:14px; color:#333;";
    attLine.textContent = "出席者：" + (
      attendanceNames.length ? attendanceNames.join("、") : "（未記入）"
    );
    contentEl.appendChild(attLine);

    // Agenda items grouped by type
    for (const type of TYPE_ORDER) {
      const items = agendaItems.filter(it => it.type === type);
      if (!items.length) continue;

      contentEl.appendChild(
        el("div", { className: "record-section" }, TYPE_LABEL[type])
      );

      for (const it of items) {
        const box = el("div", { className: "record-item" });

        // Title JP
        box.appendChild(
          el("div", { className: "record-agenda-title" },
            `${it.agenda_no}. ${it.title_jp || ""}`)
        );

        // Title EN
        if ((it.title_en || "").trim()) {
          box.appendChild(
            el("div", { className: "record-agenda-en" }, it.title_en.trim())
          );
        }

        // 内容 / 概要
        const materialsText = (it.materials_text || "").trim();
        if (materialsText) {
          const sec = el("div", {});
          sec.appendChild(el("div", { className: "record-field-label" }, "内容 / 概要"));
          const body = el("div", { className: "record-field-body" });
          body.textContent = materialsText;
          sec.appendChild(body);
          box.appendChild(sec);
        }

        // 案
        const suggestion = (it.suggestion || "").trim();
        if (suggestion) {
          const sec = el("div", {});
          sec.appendChild(el("div", { className: "record-field-label" }, "案"));
          const body = el("div", { className: "record-field-body" });
          body.textContent = suggestion;
          sec.appendChild(body);
          box.appendChild(sec);
        }

        // 結果 — only if decision_text has content
        const decisionText = (it.decision_text || "").trim();
        if (decisionText) {
          const sec = el("div", {});
          sec.appendChild(el("div", { className: "record-field-label" }, "結果"));
          const body = el("div", { className: "record-decision" });
          body.textContent = decisionText;
          sec.appendChild(body);
          box.appendChild(sec);
        }

        contentEl.appendChild(box);
      }
    }
  }

  (async () => {
    const meetingId = getMeetingId();
    const titleEl   = document.getElementById("meetingTitle");
    const contentEl = document.getElementById("recordContent");

    if (!meetingId) {
      if (titleEl)   titleEl.textContent = "";
      if (contentEl) contentEl.innerHTML =
        'No meeting selected.<br><a href="./member-home.html">← Back to Meeting List</a>';
      return;
    }

    const [title, agenda, attendanceNames] = await Promise.all([
      loadMeetingTitle(meetingId),
      loadAgendaItems(meetingId),
      loadAttendanceForMeeting(meetingId),
    ]);

    if (title) document.title = `議事録 – ${title}`;
    render(title, attendanceNames, agenda);
  })();
})();