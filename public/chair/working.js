(() => {
  "use strict";

  // ===== Supabase =====
  const SUPABASE_URL = "https://hdxuvxvxocyzeggcrcyg.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_2DRqxosSHRram-e16oNuIg_c_4iBE94";
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ===== Storage key (draft state only) =====
  const KEY_ITEMS = "agenda_items_draft";

  // ===== DOM =====
  const elMeetingTitle   = document.getElementById("meetingTitle");
  const elMeetingIdDisplay = document.getElementById("meetingIdDisplay");
  const btnCreateMeeting = document.getElementById("btnCreateMeeting");
  const btnUpdateMeeting = document.getElementById("btnUpdateMeeting");

  const elAgendaId       = document.getElementById("agendaId");
  const elAgendaType     = document.getElementById("agendaType");
  const elTitleJP        = document.getElementById("titleJP");
  const elTitleEN        = document.getElementById("titleEN");
  const elMaterialsText  = document.getElementById("materialsText");
  const elMaterialUrls   = document.getElementById("materialUrls");
  const elAttachmentName = document.getElementById("attachmentName");
  const elAttachmentUrl  = document.getElementById("attachmentUrl");
  const elSuggestion     = document.getElementById("suggestion");
  const elBlueMemo       = document.getElementById("blueMemo");

  const btnAdd           = document.getElementById("btnAdd");
  const btnClear         = document.getElementById("btnClear");
  const btnCancelEdit    = document.getElementById("btnCancelEdit");
  const btnBackHome      = document.getElementById("btnBackHome");
  const elPreviewRoot    = document.getElementById("previewRoot");
  const elEmptyState     = document.getElementById("emptyState");
  const elSaveStatus     = document.getElementById("saveStatus");
  const goMemberPage     = document.getElementById("goMemberPage");

  // ===== State =====
  let editingId = null;
  // meetingIdFromUrl is read-only throughout the session
  const meetingIdFromUrl = (new URLSearchParams(window.location.search).get("meeting_id") || "").trim();

  // ===== Constants =====
  const TYPE_LABEL = {
    report:  "報告・確認事項",
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

  // Generates a temporary local id — prefix "tmp_" marks it as not-yet-in-DB
  function tmpId() {
  return crypto.randomUUID();
}

 function isTmp(id) {
  return !id;
}

  function parseUrls(raw) {
    return safeText(raw)
      .split(/[\s,]+/g)
      .map(x => x.trim())
      .filter(u => /^https?:\/\//i.test(u));
  }

  function setStatus(msg) {
    if (!elSaveStatus) return;
    elSaveStatus.textContent = msg;
    if (msg) setTimeout(() => {
      if (elSaveStatus.textContent === msg) elSaveStatus.textContent = "";
    }, 2000);
  }

  // ===== Draft localStorage =====
  function loadDraft() {
    try {
      const raw = localStorage.getItem(KEY_ITEMS);
      if (!raw) return [];
      const d = JSON.parse(raw);
      return Array.isArray(d) ? d : [];
    } catch { return []; }
  }

  function saveDraft(items) {
    localStorage.setItem(KEY_ITEMS, JSON.stringify(items));
  }

  function clearDraft() {
    localStorage.removeItem(KEY_ITEMS);
  }

  // ===== Supabase: meetings =====
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
      alert("Failed to create meeting.");
      return null;
    }
    return data.id;
  }

  async function updateMeetingTitleInSupabase(meetingId, title) {
    const { error } = await supabase
      .from("meetings")
      .update({ title: safeText(title) })
      .eq("id", meetingId);
    if (error) console.error("Failed to update meeting title:", error);
  }

  // ===== Supabase: agenda items =====
  // Builds a DB row from a draft item. Never includes decision_text.
  function toDbRow(it, meetingId) {
    return {
      meeting_id:      meetingId,
      agenda_no:       Number.isFinite(parseInt(it.agendaId, 10)) ? parseInt(it.agendaId, 10) : null,
      type:            safeText(it.type) || "discuss",
      title_jp:        safeText(it.titleJP),
      title_en:        safeText(it.titleEN),
      materials_text:  safeText(it.materialsText),
      attachment_name: safeText(it.attachmentName),
      attachment_url:  safeText(it.attachmentUrl),
      material_urls:   Array.isArray(it.urls) ? it.urls.join(" ") : "",
      suggestion:      safeText(it.suggestion),
      blue_memo:       safeText(it.blueMemo),
      // decision_text intentionally never written here
    };
  }

  // Save all draft items to Supabase:
  //   - tmp_ ids  → INSERT  (Supabase assigns real UUID)
  //   - real ids  → UPDATE only working-page columns (never touches decision_text)
  // Returns true on success, false on any error.
  async function saveAgendaItemsToSupabase(meetingId) {
    const items = loadDraft();
    if (!items.length) {
      alert("No agenda items to save.");
      return false;
    }

    const newItems      = items.filter(it => !it.savedToDb);
    const existingItems = items.filter(it => it.savedToDb);

    // INSERT new items
    if (newItems.length) {
      const rows = newItems.map(it => ({
  id: it.id,
  ...toDbRow(it, meetingId)
}));
      const { data: inserted, error } = await supabase
        .from("agenda_items")
        .insert(rows)
        .select("id, agenda_no");

      if (error) {
        console.error("Insert failed:", error);
        alert("Failed to save new agenda items.");
        return false;
      }

      // Replace tmp ids with real Supabase UUIDs in the draft
     if (inserted && inserted.length) {
  const draft = loadDraft();
  for (const item of draft) {
    if (!item.savedToDb) {
      item.savedToDb = true;
    }
  }
  saveDraft(draft);
}
    }

    // UPDATE existing items (only working-page columns)
    for (const it of existingItems) {
      const row = toDbRow(it, meetingId);
      const { error } = await supabase
        .from("agenda_items")
        .update(row)
        .eq("id", it.id);

      if (error) {
        console.error(`Update failed for id=${it.id}:`, error);
        alert(`Failed to update agenda item: ${safeText(it.titleJP)}`);
        return false;
      }
    }

    return true;
  }

  // Delete a single agenda item from Supabase (only if it has a real id)
  async function deleteAgendaItemFromSupabase(id) {
    if (isTmp(id)) return; // not in DB yet, nothing to delete
    const { error } = await supabase
      .from("agenda_items")
      .delete()
      .eq("id", id);
    if (error) console.error("Delete from Supabase failed:", error);
  }

  // Load meeting + agenda items from Supabase into draft
  async function loadMeetingFromSupabase(meetingId) {
    const { data: meeting, error: mErr } = await supabase
      .from("meetings")
      .select("title")
      .eq("id", meetingId)
      .single();

    if (mErr) {
      console.error("Failed to load meeting:", mErr);
      alert("Failed to load meeting.");
      return false;
    }

    if (elMeetingTitle) elMeetingTitle.value = meeting.title || "";

    const { data: rows, error: aErr } = await supabase
      .from("agenda_items")
      .select("id, agenda_no, type, title_jp, title_en, materials_text, attachment_name, attachment_url, material_urls, suggestion, blue_memo")
      .eq("meeting_id", meetingId)
      .order("agenda_no", { ascending: true });

    if (aErr) {
      console.error("Failed to load agenda items:", aErr);
      alert("Failed to load agenda items.");
      return false;
    }

    saveDraft((rows || []).map(it => ({
      id:             it.id,               // real Supabase UUID
      savedToDb: true,
      agendaId:       it.agenda_no ?? "",
      type:           it.type || "discuss",
      titleJP:        it.title_jp || "",
      titleEN:        it.title_en || "",
      materialsText:  it.materials_text || "",
      attachmentName: it.attachment_name || "",
      attachmentUrl:  it.attachment_url || "",
      urls:           (it.material_urls || "").split(" ").filter(Boolean),
      suggestion:     it.suggestion || "",
      blueMemo:       it.blue_memo || "",
      createdAt:      nowISO(),
    })));

    return true;
  }

  // ===== Form helpers =====
  function clearInputs() {
    if (elAgendaId)       elAgendaId.value       = "";
    if (elAgendaType)     elAgendaType.value      = "discuss";
    if (elTitleJP)        elTitleJP.value         = "";
    if (elTitleEN)        elTitleEN.value         = "";
    if (elMaterialsText)  elMaterialsText.value   = "";
    if (elMaterialUrls)   elMaterialUrls.value    = "";
    if (elAttachmentName) elAttachmentName.value  = "";
    if (elAttachmentUrl)  elAttachmentUrl.value   = "";
    if (elSuggestion)     elSuggestion.value      = "";
    if (elBlueMemo)       elBlueMemo.value        = "";
  }

  function collectFormData() {
    const titleJP = safeText(elTitleJP?.value);
    let   titleEN = safeText(elTitleEN?.value);
    if (!titleEN) titleEN = titleJP;

    return {
      agendaId:       safeText(elAgendaId?.value),
      type:           safeText(elAgendaType?.value) || "discuss",
      titleJP,
      titleEN,
      materialsText:  safeText(elMaterialsText?.value),
      urls:           parseUrls(elMaterialUrls?.value),
      attachmentName: safeText(elAttachmentName?.value),
      attachmentUrl:  safeText(elAttachmentUrl?.value),
      suggestion:     safeText(elSuggestion?.value),
      blueMemo:       safeText(elBlueMemo?.value),
    };
  }

  function enterEditMode(item) {
    editingId = item.id;

    if (elAgendaId)       elAgendaId.value       = safeText(item.agendaId);
    if (elAgendaType)     elAgendaType.value      = safeText(item.type) || "discuss";
    if (elTitleJP)        elTitleJP.value         = safeText(item.titleJP);
    if (elTitleEN)        elTitleEN.value         = safeText(item.titleEN);
    if (elMaterialsText)  elMaterialsText.value   = safeText(item.materialsText);
    if (elMaterialUrls)   elMaterialUrls.value    = Array.isArray(item.urls) ? item.urls.join(" ") : "";
    if (elAttachmentName) elAttachmentName.value  = safeText(item.attachmentName);
    if (elAttachmentUrl)  elAttachmentUrl.value   = safeText(item.attachmentUrl);
    if (elSuggestion)     elSuggestion.value      = safeText(item.suggestion);
    if (elBlueMemo)       elBlueMemo.value        = safeText(item.blueMemo);

    if (btnAdd)        btnAdd.textContent              = "Save Changes";
    if (btnCancelEdit) btnCancelEdit.style.display     = "inline-block";
    setStatus("Editing…");
  }

  function exitEditMode({ clearForm = true } = {}) {
    editingId = null;
    if (btnAdd)        btnAdd.textContent          = "Add to Agenda";
    if (btnCancelEdit) btnCancelEdit.style.display = "none";
    if (clearForm) clearInputs();
  }

  // ===== Actions =====
  function addOrSave() {
    const data = collectFormData();
    if (!data.titleJP) {
      alert("Agenda Title (JP) is required.");
      elTitleJP?.focus();
      return;
    }

    const items = loadDraft();

    if (!editingId) {
      // ADD new item with temporary id
      items.push({
  id:        tmpId(),
  savedToDb: false,
  createdAt: nowISO(),
  agendaId:  data.agendaId || "",
  ...data,
});
      saveDraft(items);
      clearInputs();
      render();
      setStatus("Added.");
      return;
    }

    // SAVE CHANGES to existing item
    const idx = items.findIndex(it => it.id === editingId);
    if (idx === -1) {
      exitEditMode({ clearForm: false });
      render();
      setStatus("Edit target missing.");
      return;
    }

    const prev = items[idx];
    items[idx] = {
      ...prev,
      ...data,
      // Keep agendaId if user left it blank
      agendaId:       data.agendaId || prev.agendaId,
      attachmentName: data.attachmentName || prev.attachmentName,
      attachmentUrl:  data.attachmentUrl  || prev.attachmentUrl,
    };

    saveDraft(items);
    exitEditMode({ clearForm: true });
    render();
    setStatus("Saved.");
  }

  async function deleteItem(id) {
    const items = loadDraft().filter(it => it.id !== id);
    saveDraft(items);
    if (editingId === id) exitEditMode({ clearForm: true });
    render();
    setStatus("Deleted.");
    await deleteAgendaItemFromSupabase(id);
  }

  // ===== Render preview =====
  function render() {
    const items = loadDraft();

    if (elPreviewRoot) elPreviewRoot.innerHTML = "";
    if (elEmptyState)  elEmptyState.style.display = items.length ? "none" : "block";
    if (!items.length) return;

    const grouped = { report: [], discuss: [], contact: [] };
    for (const it of items) {
      const t = safeText(it.type);
      if (t === "report" || t === "discuss" || t === "contact") grouped[t].push(it);
      else grouped.discuss.push(it);
    }

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

        // Header
        const head = document.createElement("div");
        head.className = "item-head";

        const left = document.createElement("div");
        left.style.flex = "1";

        const titleEl = document.createElement("p");
        titleEl.className = "item-title";
        const jp  = safeText(it.titleJP);
        const en  = safeText(it.titleEN);
        const aid = safeText(it.agendaId);
        const prefix = aid ? `${aid}. ` : "";
        titleEl.textContent = (en && en !== jp) ? `${prefix}${jp} / ${en}` : `${prefix}${jp}`;
        left.appendChild(titleEl);

        const sub = document.createElement("p");
        sub.className = "item-sub";
        sub.textContent = `区分: ${TYPE_LABEL[it.type] || TYPE_LABEL.discuss}`;
        left.appendChild(sub);
        head.appendChild(left);

        // Edit / Delete buttons
        const actionsEl = document.createElement("div");
        actionsEl.className = "item-actions";

        const editBtn = document.createElement("button");
        editBtn.className   = "icon-btn";
        editBtn.type        = "button";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", e => { e.stopPropagation(); enterEditMode(it); });

        const delBtn = document.createElement("button");
        delBtn.className   = "icon-btn";
        delBtn.type        = "button";
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", e => { e.stopPropagation(); deleteItem(it.id); });

        actionsEl.appendChild(editBtn);
        actionsEl.appendChild(delBtn);
        head.appendChild(actionsEl);
        itemEl.appendChild(head);

        // URL links
        const urls = Array.isArray(it.urls) ? it.urls : [];
        if (urls.length) {
          const mwrap = document.createElement("div");
          mwrap.className = "materials";
          urls.forEach((url, i) => {
            const a = document.createElement("a");
            a.className = "mat";
            a.href = url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.textContent = `🔗 Link${urls.length > 1 ? " " + (i + 1) : ""}`;
            mwrap.appendChild(a);
          });
          itemEl.appendChild(mwrap);
        }

        // Materials text
        if (safeText(it.materialsText)) {
          const p = document.createElement("p");
          p.className = "item-sub";
          p.textContent = `資料: ${safeText(it.materialsText)}`;
          itemEl.appendChild(p);
        }

        // OneDrive attachment
        const attName = safeText(it.attachmentName);
        const attUrl  = safeText(it.attachmentUrl);
        if (attName && attUrl) {
          const p = document.createElement("p");
          p.className = "item-sub";
          const a = document.createElement("a");
          a.href = attUrl; a.target = "_blank"; a.rel = "noopener noreferrer";
          a.textContent = `📎 ${attName}`;
          p.appendChild(a); itemEl.appendChild(p);
        } else if (attUrl) {
          const p = document.createElement("p");
          p.className = "item-sub";
          const a = document.createElement("a");
          a.href = attUrl; a.target = "_blank"; a.rel = "noopener noreferrer";
          a.textContent = "📎 添付ファイル（OneDrive）";
          p.appendChild(a); itemEl.appendChild(p);
        }

        // Suggestion
        if (safeText(it.suggestion)) {
          const p = document.createElement("p");
          p.className = "item-sub";
          p.textContent = `案: ${safeText(it.suggestion)}`;
          itemEl.appendChild(p);
        }

        // Blue memo (chair-only)
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

  // ===== Init =====
  async function init() {
    // Member page link
    if (goMemberPage && meetingIdFromUrl) {
      goMemberPage.href = `../member/member.html?meeting_id=${meetingIdFromUrl}`;
      goMemberPage.style.display = "inline";
    } else if (goMemberPage) {
      goMemberPage.style.display = "none";
    }

    // Meeting ID display
    if (elMeetingIdDisplay) {
      elMeetingIdDisplay.textContent = meetingIdFromUrl ? `Meeting ID: ${meetingIdFromUrl}` : "";
    }

    // Button visibility
    if (meetingIdFromUrl) {
      if (btnCreateMeeting) btnCreateMeeting.style.display = "none";
      if (btnUpdateMeeting) btnUpdateMeeting.style.display = "inline-flex";
    } else {
      if (btnCreateMeeting) btnCreateMeeting.style.display = "inline-flex";
      if (btnUpdateMeeting) btnUpdateMeeting.style.display = "none";
    }

    // ===== CREATE MODE =====
    if (!meetingIdFromUrl) {
      clearDraft();
      if (elMeetingTitle) elMeetingTitle.value = "";
      if (elPreviewRoot)  elPreviewRoot.innerHTML = "";
      if (elEmptyState)   elEmptyState.style.display = "block";

      if (btnCreateMeeting) {
        btnCreateMeeting.addEventListener("click", async () => {
          const title = safeText(elMeetingTitle?.value);
          const meetingId = await createMeetingInSupabase(title);
          if (!meetingId) return;

          const ok = await saveAgendaItemsToSupabase(meetingId);
          if (!ok) return;

          // Switch to edit mode in-place
          history.replaceState({}, "", `./working.html?meeting_id=${encodeURIComponent(meetingId)}`);
          if (elMeetingIdDisplay) elMeetingIdDisplay.textContent = `Meeting ID: ${meetingId}`;
          if (btnCreateMeeting) btnCreateMeeting.style.display = "none";
          if (btnUpdateMeeting) btnUpdateMeeting.style.display = "inline-flex";
          if (goMemberPage) {
            goMemberPage.href = `../member/member.html?meeting_id=${meetingId}`;
            goMemberPage.style.display = "inline";
          }
          alert("Meeting created and saved to Supabase.");
        });
      }
    }

    // ===== EDIT MODE =====
    if (meetingIdFromUrl) {
      const ok = await loadMeetingFromSupabase(meetingIdFromUrl);
      if (ok) render();

      if (btnUpdateMeeting) {
        btnUpdateMeeting.addEventListener("click", async () => {
          // Also save the meeting title if it was changed
          await updateMeetingTitleInSupabase(meetingIdFromUrl, elMeetingTitle?.value || "");

          const saved = await saveAgendaItemsToSupabase(meetingIdFromUrl);
          if (!saved) return;

          // Reload from DB to get real UUIDs for any newly inserted rows
          await loadMeetingFromSupabase(meetingIdFromUrl);
          render();
          setStatus("Saved to Supabase.");
          alert("Meeting updated in Supabase.");
        });
      }
    }

    // ===== Shared event listeners =====
    if (btnAdd)        btnAdd.addEventListener("click", addOrSave);
    if (btnClear)      btnClear.addEventListener("click", () => { clearInputs(); exitEditMode({ clearForm: false }); setStatus("Cleared."); });
    if (btnCancelEdit) btnCancelEdit.addEventListener("click", () => { exitEditMode({ clearForm: true }); setStatus("Edit canceled."); });
    if (btnBackHome)   btnBackHome.addEventListener("click", () => { window.location.href = "./index.html"; });
  }

  init();
})();