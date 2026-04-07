### 1. Problem

`saveDecision` in `app.js` filters only by `.eq("id", agendaId)` — no `meeting_id` filter. That is fine and correct on its own, since `id` is the primary key. The real bug is in **`working.js`**: every time the chair saves or updates a meeting, it upserts all agenda items and **overwrites `decision_text` with an empty string** because the working page form has no decision field.Found it. Here is the full diagnosis and fix.

---

### 1. Problem

The `btnUpdateMeeting` handler in `working.js` (lines 652–677) **deletes all `agenda_items` for the meeting and re-inserts them from localStorage**. The `saveAgendaItemsToSupabase` function builds rows from localStorage items, which **never contain `decision_text`** — that field is not in the localStorage schema at all. So every time the chair clicks "Update Meeting", every `decision_text` is wiped to NULL.

---

### 2. Exact code location

**File:** `working.js`  
**Function:** `saveAgendaItemsToSupabase` (line 166) and the `btnUpdateMeeting` click handler (line 652)

---

### 3. Exact fix

Replace `saveAgendaItemsToSupabase` with a version that uses **upsert on `id`** instead of delete+insert, and only updates the fields the working page owns. `decision_text` is never touched.

Find and replace this entire function:

```js
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
```

Replace with:

```js
async function saveAgendaItemsToSupabase(meetingId) {
  const items = loadItems();
  console.log("saveAgendaItemsToSupabase:", meetingId, items);

  if (!items.length) {
    alert("No agenda items to save.");
    return false;
  }

  const rows = items.map(it => ({
    // Include id only when editing an existing row (it.id is a Supabase UUID)
    // For new items (id starts with "id_"), omit it so Supabase generates a UUID
    ...(it.id && !it.id.startsWith("id_") ? { id: it.id } : {}),

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

    // decision_text is intentionally excluded — owned by member page only
  }));

  const { error } = await supabase
    .from("agenda_items")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: false });

  if (error) {
    console.error("agenda_items upsert failed:", error);
    alert("Failed to save agenda items. Check console.");
    return false;
  }

  return true;
}
```

Then replace the `btnUpdateMeeting` click handler — remove the delete step entirely:

```js
// OLD — delete + insert (destroys decision_text)
if (btnUpdateMeeting) {
  btnUpdateMeeting.addEventListener("click", async () => {
    if (!meetingIdFromUrl) {
      alert("No meeting_id in URL. Open an existing meeting from Home.");
      return;
    }

    const { error: delErr } = await supabase
      .from("agenda_items")
      .delete()
      .eq("meeting_id", meetingIdFromUrl);

    if (delErr) {
      console.error("Delete failed:", delErr);
      alert("Failed to delete old agenda items. Check console.");
      return;
    }

    const ok = await saveAgendaItemsToSupabase(meetingIdFromUrl);
    if (!ok) return;

    alert("Updated agenda_items in Supabase.");
  });
}
```

Replace with:

```js
// NEW — upsert only (decision_text is never touched)
if (btnUpdateMeeting) {
  btnUpdateMeeting.addEventListener("click", async () => {
    if (!meetingIdFromUrl) {
      alert("No meeting_id in URL. Open an existing meeting from Home.");
      return;
    }

    const ok = await saveAgendaItemsToSupabase(meetingIdFromUrl);
    if (!ok) return;

    alert("Updated agenda_items in Supabase.");
  });
}
```

---

### 4. Safety note

Never delete-then-reinsert rows when other pages own some columns on the same table. The working page owns the preparation fields; the member page owns `decision_text`. These must be treated as separate write domains. Any future new column should be explicitly assigned to one owner — the other page must never write to it, even as an empty string.