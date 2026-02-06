(() => {
  "use strict";
    // ===== Supabase (opinions sharing) =====
  // Uses <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> in member.html
  const SUPABASE_URL = "https://hdxuvxvxocyzeggcrcyg.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_2DRqxosSHRram-e16oNuIg_c_4iBE94";
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

 function getMeetingId() {
  const params = new URLSearchParams(window.location.search);
  const meetingId = (params.get("meeting_id") || "").trim();
  return meetingId; // must be a real Supabase meeting id
}

  function getAgendaId(it) {
    // Working page has "agendaId" (stable). If missing, fallback to "id".
    return safeText(it.agendaId || it.id);
  }

  const TYPE_LABEL = {
    report: "報告・確認事項",
    discuss: "審議事項",
    contact: "連絡事項",
  };
  const TYPE_ORDER = ["report", "discuss", "contact"];

  // DOM
  const elAgendaList = document.getElementById("agendaList");
  const elItemArea = document.getElementById("itemArea");
  const elItemHeading = document.getElementById("itemHeading");
  const elItemTitle = document.getElementById("itemTitle");
  const elMaterialsArea = document.getElementById("materialsArea");
  const elMeetingTitle = document.getElementById("meetingTitle");
  const elAttendanceName = document.getElementById("attendanceNameInput");
  const btnAttendance = document.getElementById("attendanceBtn");
  const elAttendanceStatus = document.getElementById("attendanceStatus");
  const elAttendanceChips = document.getElementById("attendanceChips");
    // Opinion DOM
  const elNameInput = document.getElementById("nameInput");
  const elTextInput = document.getElementById("textInput");
  const elSharedList = document.getElementById("list");

  const elStatus = document.getElementById("status");
  const btnSend = document.getElementById("sendBtn");
  
  const elDecisionInput = document.getElementById("decisionInput");
  const btnSaveDecision = document.getElementById("saveDecisionBtn");
  const elDecisionStatus = document.getElementById("decisionStatus");
  
  // Link to Record page（議事録）
const recordLink = document.getElementById("recordLink");

if (recordLink) {
  recordLink.addEventListener("click", (e) => {
    e.preventDefault();

    const meetingId = getMeetingId();
    if (!meetingId) return;

    window.location.href = `./record.html?meeting_id=${encodeURIComponent(meetingId)}`;
  });
}

  // ===== Supabase helpers =====
  async function fetchOpinions(meetingId, agendaId) {
    const { data, error } = await supabase
      .from("opinions")
      .select("name,text,created_at")
      .eq("meeting_id", meetingId)
      .eq("agenda_id", agendaId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return [];
    }
    return Array.isArray(data) ? data : [];
  }

  async function insertOpinion(meetingId, agendaId, name, text) {
    const { error } = await supabase
      .from("opinions")
      .insert([{ meeting_id: meetingId, agenda_id: agendaId, name, text }]);

    if (error) {
      console.error(error);
      return false;
    }
    return true;
  }
  // Utils
  function safeText(s) {
    return (s ?? "").toString().trim();
  }

  function clearNode(el) {
    if (el) el.innerHTML = "";
  }

  function show(el) {
    if (el) el.style.display = "block";
  }

  function hide(el) {
    if (el) el.style.display = "none";
  }
  
  // ===== Decision helpers =====
async function loadDecision(meetingId, agendaId) {
  const { data, error } = await supabase
    .from("decisions")
    .select("decided")
    .eq("meeting_id", meetingId)
    .eq("agenda_id", agendaId)
    .maybeSingle();

  if (error) return null;
  return data;
}

async function saveDecision(meetingId, agendaId, decided) {
  const { error } = await supabase
    .from("decisions")
    .upsert([{ meeting_id: meetingId, agenda_id: agendaId, decided }]);

  if (error) {
    console.error(error);
    return false;
  }
  return true;
}
  

  // Render agenda list
  function renderAgendaList(items) {
    if (!elAgendaList) return;
    clearNode(elAgendaList);

    if (!items.length) {
      const li = document.createElement("li");
      li.textContent = "議題がまだありません（Working Pageで追加してください）";
      elAgendaList.appendChild(li);
      return;
    }

    // Group items by type
    const grouped = { report: [], discuss: [], contact: [] };
    for (const it of items) {
      const t = safeText(it.type);
      if (t === "report" || t === "discuss" || t === "contact") grouped[t].push(it);
      else grouped.discuss.push(it);
    }

    // Render groups with headings + numbered items
    for (const typeKey of TYPE_ORDER) {
      const arr = grouped[typeKey];
      if (!arr.length) continue;

      const liHead = document.createElement("li");
      liHead.style.listStyle = "none";
      liHead.style.margin = "10px 0 6px";
      liHead.style.fontWeight = "800";
      liHead.textContent = `${TYPE_LABEL[typeKey]}（${arr.length}）`;
      elAgendaList.appendChild(liHead);

      for (let i = 0; i < arr.length; i++) {
        const it = arr[i];

        const li = document.createElement("li");
        li.style.cursor = "pointer";
        li.style.margin = "4px 0";

        const jp = safeText(it.titleJP);
        const en = safeText(it.titleEN);

        // Display number = within-group serial (member-friendly)
        const serial = `${i + 1}. `;

        li.textContent = en && en !== jp ? `${serial}${jp} / ${en}` : `${serial}${jp}`;

        li.addEventListener("click", () => renderSelectedItem(it, typeKey, i + 1));
        elAgendaList.appendChild(li);
      }
    }
  }

  function escapeHtml(s) {
    return safeText(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  async function renderOpinionsForItem(it) {
    if (!elSharedList) return;

    const meetingId = getMeetingId();
    const agendaId = getAgendaId(it);

    elSharedList.innerHTML = `<p style="color:#666;">Loading…</p>`;

    const opinions = await fetchOpinions(meetingId, agendaId);

    if (!opinions.length) {
      elSharedList.innerHTML = `<p style="color:#666;">No opinions yet.</p>`;
      return;
    }

    elSharedList.innerHTML = opinions
      .map(
        (op) => `
        <div style="border:1px solid #ddd; padding:10px; margin:10px 0; border-radius:10px;">
          <div style="font-weight:800;">${escapeHtml(op.name)}</div>
          <div style="white-space:pre-wrap; margin-top:6px;">${escapeHtml(op.text)}</div>
          <div style="color:#888; font-size:12px; margin-top:6px;">${escapeHtml(op.created_at)}</div>
        </div>
      `
      )
      .join("");
  }


  // Render selected item detail
  
  function renderSelectedItem(it, typeKey, serialNo) {
  	window.__selectedAgendaItem = it;
    if (!elItemArea) return;

    show(elItemArea);

    const jp = safeText(it.titleJP);
    const en = safeText(it.titleEN);

    if (elItemHeading) {
      elItemHeading.textContent = `${TYPE_LABEL[typeKey]}：${serialNo}`;
    }

    if (elItemTitle) {
      elItemTitle.textContent = en && en !== jp ? `${jp} / ${en}` : jp;
    }

    // Materials (Member-visible only)
    if (elMaterialsArea) {
      clearNode(elMaterialsArea);

      // materialsText (資料)
      const materialsText = safeText(it.materialsText);
      if (materialsText) {
        const p = document.createElement("p");
        p.textContent = `資料: ${materialsText}`;
        elMaterialsArea.appendChild(p);
      }

      // links
      const urls = Array.isArray(it.urls) ? it.urls : [];
      if (urls.length) {
        const div = document.createElement("div");
        div.style.margin = "8px 0";

        for (let i = 0; i < urls.length; i++) {
          const a = document.createElement("a");
          a.href = urls[i];
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.textContent = urls.length > 1 ? `Link ${i + 1}` : "Link";
          a.style.display = "inline-block";
          a.style.marginRight = "10px";
          div.appendChild(a);
        }
        elMaterialsArea.appendChild(div);
      }

      // fileName (display only)
      const fileName = safeText(it.fileName);
      if (fileName) {
        const p = document.createElement("p");
        p.textContent = `添付: ${fileName}`;
        elMaterialsArea.appendChild(p);
      }

      // suggestion (案) — member-visible
      const suggestion = safeText(it.suggestion);
      if (suggestion) {
        const p = document.createElement("p");
        p.textContent = `案: ${suggestion}`;
        elMaterialsArea.appendChild(p);
      }
      
      // OneDrive attachment (name + URL)
const attName = safeText(it.attachmentName);
const attUrl = safeText(it.attachmentUrl);

if (attName && attUrl) {
  const p = document.createElement("p");
  const a = document.createElement("a");
  a.href = attUrl;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = `📎 ${attName}`;
  p.appendChild(a);
  elMaterialsArea.appendChild(p);
} else if (attUrl) {
  const p = document.createElement("p");
  const a = document.createElement("a");
  a.href = attUrl;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = "📎 添付ファイル（OneDrive）";
  p.appendChild(a);
  elMaterialsArea.appendChild(p);
}

      // IMPORTANT: do NOT show blueMemo on member page
    }

    // Clear input when switching agenda
    if (elNameInput) elNameInput.value = "";
    if (elTextInput) elTextInput.value = "";

    if (elStatus) elStatus.textContent = "";
    
    
    // Load Decision (決定事項)
(async () => {
  if (!elDecisionInput) return;

  const d = await loadDecision(getMeetingId(), getAgendaId(it));
  if (d?.decided && d.decided.trim() !== "") {
  elDecisionInput.value = d.decided;
} else {
  elDecisionInput.value = `【決定】
・

【補足（コメント）】
`;
}

  if (elDecisionStatus) elDecisionStatus.textContent = "";
})();
   
    // Load shared opinions (Supabase)
    renderOpinionsForItem(it);
  }
  
  async function loadAttendance(meetingId) {
  const { data, error } = await supabase
    .from("attendance")
    .select("id, name, created_at")
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return data || [];
}

function renderAttendance(names) {
  if (!elAttendanceChips) return;
  elAttendanceChips.innerHTML = "";

  names.forEach((n) => {
    const span = document.createElement("span");
    span.className = "att-chip";
    span.textContent = n;
    elAttendanceChips.appendChild(span);
  });
}

  function init() {
    // Put meeting title in the page title (simple, no HTML edits required)
 (async () => {
  const meetingId = getMeetingId();

  if (!meetingId) {
    document.title = "Member Page – (No meeting selected)";
    renderAgendaList([]);
    return;
  }

  // ===== Attendance (meeting-level) =====
  let attendanceRows = [];
  if (elAttendanceName && btnAttendance && elAttendanceChips) {
    attendanceRows = await loadAttendance(meetingId);
    renderAttendance(attendanceRows.map(r => safeText(r.name)));

    btnAttendance.addEventListener("click", async () => {
      const name = safeText(elAttendanceName.value);
      if (!name) {
        if (elAttendanceStatus) elAttendanceStatus.textContent = "名前を入力してください。";
        return;
      }

      // Simple duplicate prevention (exact match)
      const existing = attendanceRows.map(r => safeText(r.name));
      if (existing.includes(name)) {
        if (elAttendanceStatus) elAttendanceStatus.textContent = "既に登録されています。";
        return;
      }

      if (elAttendanceStatus) elAttendanceStatus.textContent = "Saving…";

      const { error } = await supabase
        .from("attendance")
        .insert([{ meeting_id: meetingId, name }]);

      if (error) {
        console.error(error);
        if (elAttendanceStatus) elAttendanceStatus.textContent = "保存に失敗しました。";
        return;
      }

      // Reload after insert (safe and simple)
      attendanceRows = await loadAttendance(meetingId);
      renderAttendance(attendanceRows.map(r => safeText(r.name)));
      if (elAttendanceStatus) elAttendanceStatus.textContent = "出席を記録しました。";
    });
  }

  // ===== Meeting title =====
  const { data: meeting, error: mErr } = await supabase
    .from("meetings")
    .select("title")
    .eq("id", meetingId)
    .single();

  if (!mErr && meeting?.title) {
    document.title = `Member Page – ${meeting.title}`;
    if (elMeetingTitle) elMeetingTitle.textContent = meeting.title;
  }

  // ===== Agenda items =====
  const { data: rows, error: aErr } = await supabase
    .from("agenda_items")
    .select(
      "id, agenda_no, type, title_jp, title_en, materials_text, material_urls, attachment_name, attachment_url, suggestion"
    )
    .eq("meeting_id", meetingId)
    .order("agenda_no", { ascending: true });

  if (aErr) {
    console.error(aErr);
    renderAgendaList([]);
    return;
  }

  const items = (rows || []).map((r) => ({
    id: r.id,
    agendaId: r.id, // IMPORTANT: agenda_items.id is the key
    type: r.type,
    titleJP: safeText(r.title_jp),
    titleEN: safeText(r.title_en),
    materialsText: safeText(r.materials_text),
    urls: safeText(r.material_urls)
      ? safeText(r.material_urls).split(/\s+/).filter(Boolean)
      : [],
    attachmentName: safeText(r.attachment_name),
    attachmentUrl: safeText(r.attachment_url),
    suggestion: safeText(r.suggestion),
    fileName: "",
    blueMemo: "",
  }));

  renderAgendaList(items);
})();

    // If items exist, auto-select first item (optional)
    // (kept off for predictability)
    
        // Submit opinion (Supabase)
    if (btnSend) {
      btnSend.addEventListener("click", async () => {
          
          

        // We need a selected item to post to
        const current = window.__selectedAgendaItem;
        if (!current) return;

        const name = safeText(elNameInput?.value).trim() || "Anonymous";
        const text = safeText(elTextInput?.value).trim();

        if (!text) {
          if (elStatus) elStatus.textContent = "Please write an opinion.";
          return;
        }

        if (elStatus) elStatus.textContent = "Sending…";

        const ok = await insertOpinion(getMeetingId(), getAgendaId(current), name, text);
        if (!ok) {
          if (elStatus) elStatus.textContent = "Failed (check console).";
          return;
        }

        if (elTextInput) elTextInput.value = "";
        if (elStatus) elStatus.textContent = "Submitted.";

        await renderOpinionsForItem(current);
      });
    }
    // Save Decision (決定事項)
if (btnSaveDecision) {
  btnSaveDecision.addEventListener("click", async () => {
  console.log("SAVE DECISION clicked");  
  const current = window.__selectedAgendaItem;
    if (!current) return;

    const decided = safeText(elDecisionInput?.value);

    if (elDecisionStatus) elDecisionStatus.textContent = "Saving…";

    const ok = await saveDecision(getMeetingId(), getAgendaId(current), decided);

    if (!ok) {
      if (elDecisionStatus) elDecisionStatus.textContent = "Failed (check console).";
      return;
    }

    if (elDecisionStatus) elDecisionStatus.textContent = "Saved.";
  });
}
    hide(elItemArea);
  }

  init();
})();