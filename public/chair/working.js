(() => {
  "use strict";

  // ===== Supabase =====
  const SUPABASE_URL = "https://hdxuvxvxocyzeggcrcyg.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_2DRqxosSHRram-e16oNuIg_c_4iBE94";

  const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  async function testSupabaseConnection() {
    const { data, error } = await supabase.from("meetings").select("*");

    if (error) {
      console.error("Supabase test failed:", error);
    } else {
      console.log("Supabase test success. Meetings:", data);
    }
  }

  testSupabaseConnection();

 // ===== Storage keys =====
const KEY_MEETING_TITLE = "agenda_meeting_title";
const KEY_ITEMS = "agenda_items_v1";
const KEY_MEETING_ID = "agenda_meeting_id";
// ===== DOM =====
const elMeetingTitle = document.getElementById("meetingTitle");
const btnCreateMeeting = document.getElementById("btnCreateMeeting");
const elMeetingIdDisplay = document.getElementById("meetingIdDisplay");
const btnUpdateMeeting = document.getElementById("btnUpdateMeeting");

  const elAgendaId = document.getElementById("agendaId");     // optional (stable ID)
  const elAgendaType = document.getElementById("agendaType"); // report | discuss | contact

  const elTitleJP = document.getElementById("titleJP");
  const elTitleEN = document.getElementById("titleEN");

  const elMaterialsText = document.getElementById("materialsText");
  const elMaterialUrls = document.getElementById("materialUrls");

  // OneDrive attachment (name + URL)
  const elAttachmentName = document.getElementById("attachmentName");
  const elAttachmentUrl = document.getElementById("attachmentUrl");
  
  // Optional fields (only used if they exist in HTML)
  const elSuggestion = document.getElementById("suggestion"); // 案 (member-visible)
  const elBlueMemo = document.getElementById("blueMemo");     // 🔵 memo (chair-only)

  const btnAdd = document.getElementById("btnAdd");
  const btnClear = document.getElementById("btnClear");
  const btnCancelEdit = document.getElementById("btnCancelEdit");
  const btnBackHome = document.getElementById("btnBackHome");

  const elPreviewRoot = document.getElementById("previewRoot");
  const elEmptyState = document.getElementById("emptyState");

  const elSaveStatus = document.getElementById("saveStatus"); // optional

  // ===== Edit state =====
  let editingId = null;

  // ===== Former chair terms =====
  const TYPE_LABEL = {
    report: "報告・確認事項",
    discuss: "審議事項",
    contact: "連絡事項",
  };
  const TYPE_ORDER = ["report", "discuss", "contact"];

// ===== Utilities =====
function safeText(s) {
  return (s ?? "").toString().trim();
}

function nowISO() {
  return new Date().toISOString();
}

function uid() {
  return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function parseUrls(raw) {
  const t = safeText(raw);
  if (!t) return [];
  return t
    .split(/[\s,]+/g)
    .map(x => x.trim())
    .filter(Boolean)
    .filter(u => /^https?:\/\//i.test(u));
}

function loadItems() {
  try {
    const raw = localStorage.getItem(KEY_ITEMS);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveItems(items) {
  localStorage.setItem(KEY_ITEMS, JSON.stringify(items));
}

function loadMeetingTitle() {
  return safeText(localStorage.getItem(KEY_MEETING_TITLE));
}

function saveMeetingTitle(title) {
  localStorage.setItem(KEY_MEETING_TITLE, safeText(title));
}

// NEW (meeting id helpers)
function loadMeetingId() {
  return (localStorage.getItem(KEY_MEETING_ID) || "").trim();
}

function saveMeetingId(id) {
  localStorage.setItem(KEY_MEETING_ID, (id || "").trim());
}

function renderMeetingId() {
  const id = loadMeetingId();
  if (elMeetingIdDisplay) {
    elMeetingIdDisplay.textContent = id ? `Meeting ID: ${id}` : "";
  }
}

function setStatus(msg) {
  if (!elSaveStatus) return;
  elSaveStatus.textContent = msg;
  if (msg) {
    setTimeout(() => {
      if (elSaveStatus.textContent === msg) elSaveStatus.textContent = "";
    }, 1800);
  }
}

async function createMeetingInSupabase(title) {
  const cleanTitle = safeText(title);
  if (!cleanTitle) {
    alert("Please enter Meeting Title first.");
    return null;
  }

  const { data, error } = await supabase
    .from("meetings")
    .insert([{ title: cleanTitle }])
    .select("id")
    .single();

  if (error) {
    console.error(error);
    alert("Failed to create meeting. Check console.");
    return null;
  }

  return data.id;
}
async function saveAgendaItemsToSupabase(meetingId) {
  const items = loadItems();
  console.log("saveAgendaItemsToSupabase:", meetingId, items);

  if (!items.length) {
    alert("No agenda items to save.");
    return false;
  }

  const rows = items.map(it => ({
    meeting_id: meetingId,

    agenda_no: Number.isFinite(parseInt(it.agendaId, 10)) ? parseInt(it.agendaId, 10) : null,
    type: safeText(it.type) || "discuss",

    title_jp: safeText(it.titleJP),
    title_en: safeText(it.titleEN),

    materials_text: safeText(it.materialsText),

    attachment_name: safeText(it.attachmentName),
    attachment_url: safeText(it.attachmentUrl),

    material_urls: Array.isArray(it.urls) ? it.urls.join(" ") : "",

    suggestion: safeText(it.suggestion),
    blue_memo: safeText(it.blueMemo),
  }));

  const { error } = await supabase
    .from("agenda_items")
    .insert(rows);

  if (error) {
    console.error("agenda_items insert failed:", error);
    alert("Failed to save agenda items. Check console.");
    return false;
  }

  return true;
}
  // ===== Form helpers =====
  function clearInputs() {
    if (elAgendaId) elAgendaId.value = "";
    if (elAgendaType) elAgendaType.value = "discuss";

    if (elTitleJP) elTitleJP.value = "";
    if (elTitleEN) elTitleEN.value = "";

    if (elMaterialsText) elMaterialsText.value = "";
    if (elMaterialUrls) elMaterialUrls.value = "";
    if (elAttachmentName) elAttachmentName.value = "";
    if (elAttachmentUrl) elAttachmentUrl.value = "";
    if (elAttachmentName) elAttachmentName.value = "";
    if (elAttachmentUrl) elAttachmentUrl.value = "";

    if (elSuggestion) elSuggestion.value = "";
    if (elBlueMemo) elBlueMemo.value = "";

  }

  function enterEditMode(item) {
    editingId = item.id;

    if (elAgendaId) elAgendaId.value = safeText(item.agendaId);
    if (elAgendaType) elAgendaType.value = safeText(item.type) || "discuss";

    if (elTitleJP) elTitleJP.value = safeText(item.titleJP);
    if (elTitleEN) elTitleEN.value = safeText(item.titleEN);

    if (elMaterialsText) elMaterialsText.value = safeText(item.materialsText);
    if (elMaterialUrls) elMaterialUrls.value = Array.isArray(item.urls) ? item.urls.join(" ") : "";
    if (elAttachmentName) elAttachmentName.value = safeText(item.attachmentName);
    if (elAttachmentUrl) elAttachmentUrl.value = safeText(item.attachmentUrl);

    if (elSuggestion) elSuggestion.value = safeText(item.suggestion);
    if (elBlueMemo) elBlueMemo.value = safeText(item.blueMemo);

    // file input can't be restored

    if (btnAdd) btnAdd.textContent = "Save Changes";
    if (btnCancelEdit) btnCancelEdit.style.display = "inline-block";

    setStatus("Editing…");
  }

  function exitEditMode({ clearForm = true } = {}) {
    editingId = null;
    if (btnAdd) btnAdd.textContent = "Add to Agenda";
    if (btnCancelEdit) btnCancelEdit.style.display = "none";
    if (clearForm) clearInputs();
  }

  function collectFormData() {
    const meetingTitle = safeText(elMeetingTitle?.value);
    if (meetingTitle) saveMeetingTitle(meetingTitle);

    const agendaIdRaw = safeText(elAgendaId?.value);
    const agendaId = agendaIdRaw; // allow blank; edit will keep old ID

    const type = safeText(elAgendaType?.value) || "discuss";

    const titleJP = safeText(elTitleJP?.value);
    let titleEN = safeText(elTitleEN?.value);

    // Option 2: if EN empty, copy JP
    if (!titleEN) titleEN = titleJP;

    const materialsText = safeText(elMaterialsText?.value);
    const urls = parseUrls(elMaterialUrls?.value);

    const suggestion = elSuggestion ? safeText(elSuggestion.value) : "";
    const blueMemo = elBlueMemo ? safeText(elBlueMemo.value) : "";

    return {
      meetingTitle,
      agendaId,
      type,
      titleJP,
      titleEN,
      materialsText,
      urls,
      
      suggestion,
      blueMemo,
      attachmentName: elAttachmentName ? safeText(elAttachmentName.value) : "",
      attachmentUrl: elAttachmentUrl ? safeText(elAttachmentUrl.value) : "",
    };
  }

 // ===== Actions =====
function addOrSave() {
  const data = collectFormData();

  if (!data.titleJP) {
    alert("Agenda Title (JP) is required.");
    elTitleJP?.focus();
    return;
  }

  const items = loadItems();

  // ADD (not editing)
  if (!editingId) {
    if (!data.agendaId) data.agendaId = uid();

    items.push({
      id: uid(),
      createdAt: nowISO(),
      ...data,
    });

    saveItems(items);
    clearInputs();
    render();
    setStatus("Added.");
    return;
  }

  // SAVE CHANGES (editing)
  const idx = items.findIndex(it => it.id === editingId);
  if (idx === -1) {
    exitEditMode({ clearForm: false });
    render();
    setStatus("Edit target missing.");
    return;
  }

  const prev = items[idx];

items[idx] = { ...prev, ...data };

if (!safeText(data.agendaId)) {
  items[idx].agendaId = safeText(prev.agendaId);
}

if (!safeText(data.attachmentName)) {
  items[idx].attachmentName = safeText(prev.attachmentName);
}
if (!safeText(data.attachmentUrl)) {
  items[idx].attachmentUrl = safeText(prev.attachmentUrl);
}

saveItems(items);
exitEditMode({ clearForm: true });
render();
setStatus("Saved.");
}

function deleteItem(id) {
  const items = loadItems().filter(it => it.id !== id);
  saveItems(items);

  if (editingId === id) exitEditMode({ clearForm: true });

  render();
  setStatus("Deleted.");
}
  
  // ===== Render =====
  function render() {
    const items = loadItems();

    if (elPreviewRoot) elPreviewRoot.innerHTML = "";
    if (elEmptyState) elEmptyState.style.display = items.length ? "none" : "block";
    if (!items.length) return;

    // Group
    const grouped = {
      report: [],
      discuss: [],
      contact: [],
    };

    for (const it of items) {
      const t = safeText(it.type);
      if (t === "report" || t === "discuss" || t === "contact") grouped[t].push(it);
      else grouped.discuss.push(it); // fallback
    }

    // Keep created order (reorder later)
    for (const typeKey of TYPE_ORDER) {
      const arr = grouped[typeKey];
      if (!arr.length) continue;

      const groupEl = document.createElement("div");
      groupEl.className = `group ${typeKey}`;

      const h3 = document.createElement("h3");
      h3.textContent = `${TYPE_LABEL[typeKey]} (${arr.length})`;
      groupEl.appendChild(h3);

      for (const it of arr) {
        const itemEl = document.createElement("div");
        itemEl.className = "item";

        // Header row: title + actions
        const head = document.createElement("div");
        head.className = "item-head";

        const left = document.createElement("div");
        left.style.flex = "1";

const title = document.createElement("p");
title.className = "item-title";

const jp = safeText(it.titleJP);
const en = safeText(it.titleEN);

const aid = safeText(it.agendaId);
const showAid = aid && !aid.startsWith("id_");
const prefix = showAid ? `${aid} ` : "";

title.textContent =
  en && en !== jp
    ? `${prefix}${jp} / ${en}`
    : `${prefix}${jp}`;

left.appendChild(title);   
            
        const sub = document.createElement("p");
        sub.className = "item-sub";
        sub.textContent = `区分: ${TYPE_LABEL[it.type] ?? TYPE_LABEL.discuss}`;
        left.appendChild(sub);

        head.appendChild(left);

        const actions = document.createElement("div");
        actions.className = "item-actions";

        const editBtn = document.createElement("button");
        editBtn.className = "icon-btn";
        editBtn.type = "button";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          enterEditMode(it);
        });

        const delBtn = document.createElement("button");
        delBtn.className = "icon-btn";
        delBtn.type = "button";
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          deleteItem(it.id);
        });

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        head.appendChild(actions);

        itemEl.appendChild(head);

        // Materials badges (member-first)
        const mats = [];

        if (safeText(it.fileName)) mats.push({ kind: "file", label: `📄 ${it.fileName}` });

        const urls = Array.isArray(it.urls) ? it.urls : [];
        for (let i = 0; i < urls.length; i++) {
          mats.push({ kind: "link", label: `🔗 Link${urls.length > 1 ? " " + (i + 1) : ""}`, url: urls[i] });
        }

        if (mats.length) {
          const mwrap = document.createElement("div");
          mwrap.className = "materials";

          for (const m of mats) {
            if (m.kind === "link" && m.url) {
              const a = document.createElement("a");
              a.className = "mat";
              a.href = m.url;
              a.target = "_blank";
              a.rel = "noopener noreferrer";
              a.textContent = m.label;
              mwrap.appendChild(a);
            } else {
              const span = document.createElement("span");
              span.className = "mat";
              span.textContent = m.label;
              mwrap.appendChild(span);
            }
          }
          itemEl.appendChild(mwrap);
        }
        if (safeText(it.materialsText)) {
           const p = document.createElement("p");
           p.className = "item-sub";
           p.textContent = `資料: ${safeText(it.materialsText)}`;
           itemEl.appendChild(p);
        }
        // OneDrive attachment (name + URL)
        const attName = safeText(it.attachmentName);
        const attUrl = safeText(it.attachmentUrl);

        if (attName && attUrl) {
           const p = document.createElement("p");
           p.className = "item-sub";
           
           const a = document.createElement("a");
           a.href = attUrl;
           a.target = "_blank";
           a.rel = "noopener noreferrer";
           a.textContent = `📎 ${attName}`;
           
           p.appendChild(a);
           itemEl.appendChild(p);
          } else if (attUrl) {
            const p = document.createElement("p");
            p.className = "item-sub";
        const a = document.createElement("a");
            a.href = attUrl;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.textContent = "📎 添付ファイル（OneDrive）";
            p.appendChild(a);
            itemEl.appendChild(p);
         }

        // Suggestion (member-visible) — only if the field exists and has content
        if (safeText(it.suggestion)) {
           const p = document.createElement("p");
           p.className = "item-sub";
           p.textContent = `案: ${safeText(it.suggestion)}`;
           itemEl.appendChild(p);
        }
        // 🔵 memo (chair-only) — shown on Working page only
        if (safeText(it.blueMemo)) {
          const p = document.createElement("p");
          p.className = "item-sub";
          p.textContent = `🔵 メモ: ${safeText(it.blueMemo)}`;
          itemEl.appendChild(p);
        }

        groupEl.appendChild(itemEl);
      }

      elPreviewRoot.appendChild(groupEl);
  }
}
  
async function loadMeetingFromSupabase(meetingId) {
  // load meeting title
  const { data: meeting, error: mErr } = await supabase
    .from("meetings")
    .select("title")
    .eq("id", meetingId)
    .single();

  if (mErr) {
    console.error("Failed to load meeting:", mErr);
    alert("Failed to load meeting.");
    return;
  }

  if (elMeetingTitle) elMeetingTitle.value = meeting.title || "";

  // load agenda items
  const { data: items, error: aErr } = await supabase
    .from("agenda_items")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("agenda_no", { ascending: true });

  if (aErr) {
    console.error("Failed to load agenda items:", aErr);
    alert("Failed to load agenda items.");
    return;
  }

  // TEMP: store into legacy structure so render() can show them
  localStorage.setItem("agenda_items_v1", JSON.stringify(
    items.map(it => ({
      id: it.id,
      agendaId: it.agenda_no,
      type: it.type,
      titleJP: it.title_jp,
      titleEN: it.title_en,
      materialsText: it.materials_text,
      attachmentName: it.attachment_name,
      attachmentUrl: it.attachment_url,
      urls: (it.material_urls || "").split(" ").filter(Boolean),
      suggestion: it.suggestion,
      blueMemo: it.blue_memo
    }))
  ));
}
// ===== Init =====
function init() {
  // ===== Mode detection (URL is the source of truth) =====
  const params = new URLSearchParams(window.location.search);
  const meetingIdFromUrl = (params.get("meeting_id") || "").trim();
  // ===== Link to Member Page =====
const goMemberPage = document.getElementById("goMemberPage");

if (goMemberPage && meetingIdFromUrl) {
  goMemberPage.href = `member.html?meeting_id=${meetingIdFromUrl}`;
  goMemberPage.style.display = "inline";
} else if (goMemberPage) {
  // No meeting yet (create mode)
  goMemberPage.style.display = "none";
}
  // Toggle Create / Update buttons by mode
const btnUpdateMeeting = document.getElementById("btnUpdateMeeting");

if (meetingIdFromUrl) {
  // EDIT MODE
  if (btnCreateMeeting) btnCreateMeeting.style.display = "none";
  if (btnUpdateMeeting) btnUpdateMeeting.style.display = "inline-flex";
} else {
  // CREATE MODE
  if (btnCreateMeeting) btnCreateMeeting.style.display = "inline-flex";
  if (btnUpdateMeeting) btnUpdateMeeting.style.display = "none";
}
  // Edit mode: hide Create Meeting
if (btnCreateMeeting) {
  btnCreateMeeting.style.display = meetingIdFromUrl ? "none" : "inline-flex";
}
  

  // CREATE MODE (no meeting_id): start empty (do not restore legacy localStorage)
if (!meetingIdFromUrl) {
  // CREATE MODE: force clean state (no legacy localStorage)
  localStorage.removeItem(KEY_ITEMS);
  localStorage.removeItem(KEY_MEETING_ID);

  if (elMeetingTitle) elMeetingTitle.value = "";
  if (elPreviewRoot) elPreviewRoot.innerHTML = "";
  if (elEmptyState) elEmptyState.style.display = "block";
}
  else {
    // EDIT MODE (temporary legacy behavior: restore from localStorage for now)
    const saved = loadMeetingTitle();
    if (elMeetingTitle && saved && !safeText(elMeetingTitle.value)) {
      elMeetingTitle.value = saved;
    }
  }

  // Keep input listener (even though we'll remove localStorage later)
  if (elMeetingTitle) {
    elMeetingTitle.addEventListener("input", () =>
      saveMeetingTitle(elMeetingTitle.value)
    );
  }
  // Update existing meeting (Supabase): delete old agenda_items, then insert current ones
if (btnUpdateMeeting) {
  btnUpdateMeeting.addEventListener("click", async () => {
    if (!meetingIdFromUrl) {
      alert("No meeting_id in URL. Open an existing meeting from Home.");
      return;
    }

    // 1) delete existing rows for this meeting
    const { error: delErr } = await supabase
      .from("agenda_items")
      .delete()
      .eq("meeting_id", meetingIdFromUrl);

    if (delErr) {
      console.error("Delete failed:", delErr);
      alert("Failed to delete old agenda items. Check console.");
      return;
    }

    // 2) insert current items (your existing function uses loadItems())
    const ok = await saveAgendaItemsToSupabase(meetingIdFromUrl);
    if (!ok) return;

    alert("Updated agenda_items in Supabase.");
  });
}

  if (btnAdd) btnAdd.addEventListener("click", addOrSave);

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      clearInputs();
      exitEditMode({ clearForm: false });
      setStatus("Cleared.");
    });
  }

  if (btnCancelEdit) {
    btnCancelEdit.addEventListener("click", () => {
      exitEditMode({ clearForm: true });
      setStatus("Edit canceled.");
    });
  }

  if (btnBackHome) {
    btnBackHome.addEventListener("click", () => {
      window.location.href = "./index.html";
    });
  }

  if (btnCreateMeeting) {
    btnCreateMeeting.addEventListener("click", async () => {
      const title = elMeetingTitle?.value || "";

      const meetingId = await createMeetingInSupabase(title);
      if (!meetingId) return;

      const ok = await saveAgendaItemsToSupabase(meetingId);
      if (!ok) return;

      // Keep these for now (we will remove localStorage later)
      saveMeetingId(meetingId);
      renderMeetingId();

      history.replaceState(
        {},
        "",
        `./working.html?meeting_id=${encodeURIComponent(meetingId)}`
      );

      alert("Meeting and agenda saved to Supabase.");
    });
  }

  renderMeetingId();

  if (!meetingIdFromUrl) {
    // create mode: do NOT render legacy localStorage agenda
    return;
  }

  // EDIT MODE: load from Supabase instead of localStorage
  loadMeetingFromSupabase(meetingIdFromUrl).then(() => {
    render();
  });
}
init();
})();