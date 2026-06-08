/* =========================================================
   Arvin Joseph Gonzaga — Private journal (Firestore)
   ---------------------------------------------------------
   Entries live in Firestore, not in the page source, so the
   text is never exposed in public files. Each entry is tagged
   with the author's uid; Security Rules enforce who can read.
   ========================================================= */

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ---------- Elements ---------- */
const form       = document.getElementById("entryForm");
const titleInput = document.getElementById("entryTitle");
const editor     = document.getElementById("entryEditor");
const toolbar    = document.getElementById("editorToolbar");
const colorInput = document.getElementById("editorColor");
const saveBtn    = document.getElementById("entrySave");
const msg        = document.getElementById("entryMsg");
const list       = document.getElementById("entryList");
const empty      = document.getElementById("journalEmpty");

/* Reading modal (a card pops open here) */
const modalEl      = document.getElementById("entryModal");
const detailCard   = modalEl.querySelector(".modal__card--entry");
const detailClose  = document.getElementById("detailClose");
const detailTitle  = document.getElementById("detailTitle");
const detailDate   = document.getElementById("detailDate");
const detailBody   = document.getElementById("detailBody");
const detailDelete = document.getElementById("detailDelete");

const entriesRef = collection(db, "entries");
let openId = null; // id of the entry currently open in the detail view

/* Soft clear: the website only shows entries created at/after this moment.
   Everything written before it (early test entries) stays safe in Firestore
   — it's just hidden from the list, never deleted. Set on 2026-06-08 20:07 +08. */
const HIDE_BEFORE_MS = 1780920459290;

let unsubscribe = null; // stops the live listener on logout

/* ---------- Rich-text toolbar ----------
   Uses document.execCommand — it's deprecated but still works in every
   browser and is by far the simplest editor for a no-build site like this. */
let savedRange = null;
function saveSelection() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount && editor.contains(sel.anchorNode)) {
    savedRange = sel.getRangeAt(0).cloneRange(); // snapshot, not a live reference
  }
}
function restoreSelection() {
  if (!savedRange) return;
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(savedRange);
}
function exec(cmd, value = null) {
  editor.focus();
  restoreSelection();
  document.execCommand(cmd, false, value);
  saveSelection();
  updateToolbar();
}

// Keep track of the selection as the user types/clicks in the editor
["keyup", "mouseup", "blur"].forEach((ev) => editor.addEventListener(ev, saveSelection));

// B / I / U buttons — mousedown + preventDefault keeps the editor's live
// selection intact, so we apply the command straight to it (no restore).
toolbar.querySelectorAll("button[data-cmd]").forEach((btn) => {
  btn.addEventListener("mousedown", (e) => {
    e.preventDefault();
    document.execCommand(btn.dataset.cmd, false, null);
    saveSelection();
    updateToolbar();
  });
});

// Font + size dropdowns
toolbar.querySelectorAll("select[data-cmd]").forEach((sel) => {
  sel.addEventListener("mousedown", saveSelection);
  sel.addEventListener("change", () => {
    if (sel.value) exec(sel.dataset.cmd, sel.value);
  });
});

// Text color
colorInput.addEventListener("mousedown", saveSelection);
colorInput.addEventListener("input", () => exec("foreColor", colorInput.value));

/* ----- Reflect the formatting under the cursor in the toolbar ----- */
function rgbToHex(rgb) {
  const m = /(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(rgb || "");
  if (!m) return null;
  return "#" + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, "0")).join("");
}
function updateToolbar() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !editor.contains(sel.anchorNode)) return;

  // B / I / U → highlight when active under the cursor
  toolbar.querySelectorAll("button[data-cmd]").forEach((btn) => {
    let on = false;
    try { on = document.queryCommandState(btn.dataset.cmd); } catch (e) {}
    btn.classList.toggle("is-active", on);
  });

  // Font + size dropdowns show the current value (best-effort)
  toolbar.querySelectorAll("select[data-cmd]").forEach((dd) => {
    let val = "";
    try { val = document.queryCommandValue(dd.dataset.cmd); } catch (e) {}
    if (dd.dataset.cmd === "fontSize") {
      const opt = [...dd.options].find((o) => o.value === String(val));
      dd.value = opt ? opt.value : "";
    } else {
      const v = (val || "").toLowerCase().replace(/['"]/g, "");
      const opt = [...dd.options].find(
        (o) => o.value && v.includes(o.value.toLowerCase().split(",")[0].trim())
      );
      dd.value = opt ? opt.value : "";
    }
    dd.classList.toggle("is-active", !!dd.value);
  });

  // Color swatch reflects the cursor's text color
  let color = "";
  try { color = document.queryCommandValue("foreColor"); } catch (e) {}
  const hex = rgbToHex(color);
  if (hex) colorInput.value = hex;
}

// Fires whenever the cursor/selection moves anywhere in the page
document.addEventListener("selectionchange", updateToolbar);

/* ---------- Date formatting ---------- */
const fmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});
function formatDate(ts) {
  if (!ts) return "Saving…"; // serverTimestamp is briefly null right after write
  return fmt.format(ts.toDate());
}

/* Plain-text version of an entry's body (for the list snippet) */
function bodyText(entry) {
  if (entry.text) return entry.text;            // new entries store a plain copy
  if (entry.html) {                              // fall back to stripping the HTML
    const tmp = document.createElement("div");
    tmp.innerHTML = entry.html;
    return tmp.textContent || "";
  }
  return "";
}

/* Short one-line preview of an entry's body for the list */
function snippet(text, max = 150) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max).trimEnd() + "…" : t;
}

/* ---------- Render the list (clickable cards) ---------- */
function render(entries) {
  list.innerHTML = "";
  empty.hidden = entries.length > 0;

  for (const entry of entries) {
    const li = document.createElement("li");
    li.className = "entry entry--clickable";
    li.tabIndex = 0;
    li.setAttribute("role", "button");

    const title = document.createElement("h3");
    title.className = "entry__title";
    title.textContent = entry.title || "Untitled";

    const date = document.createElement("span");
    date.className = "entry__date";
    date.textContent = formatDate(entry.createdAt);

    const snip = document.createElement("p");
    snip.className = "entry__snippet";
    if (entry.html) {
      snip.innerHTML = entry.html;                 // show formatting in the preview
    } else {
      snip.textContent = snippet(bodyText(entry)); // plain fallback for old entries
    }

    li.append(title, date, snip);

    // Open the full entry on click or keyboard (Enter / Space)
    li.addEventListener("click", () => openEntry(entry));
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEntry(entry); }
    });

    list.append(li);
  }
}

/* ---------- Reading modal (one entry, full text) ---------- */
function openEntry(entry) {
  openId = entry.id;
  detailTitle.textContent = entry.title || "Untitled";
  detailDate.textContent = formatDate(entry.createdAt);
  // Render the saved formatting. Safe here: it's only ever the owner's own
  // content, readable only by the owner (sealed rules) — no third-party input.
  if (entry.html) {
    detailBody.innerHTML = entry.html;
  } else {
    detailBody.textContent = entry.text || "";
  }
  modalEl.hidden = false;
  detailCard.scrollTop = 0; // start the reading view at the top
}

function closeEntry() {
  openId = null;
  modalEl.hidden = true;
}

/* ---------- Live load (sorted newest-first client-side) ---------- */
function startListening(uid) {
  const q = query(entriesRef, where("uid", "==", uid));
  unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const entries = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        // Hide pre-cutoff entries from the site (still retained in Firestore).
        // Pending writes (createdAt null) are brand-new, so always show them.
        .filter((e) => !e.createdAt || e.createdAt.toMillis() >= HIDE_BEFORE_MS);
      entries.sort((a, b) => {
        const ta = a.createdAt ? a.createdAt.toMillis() : Infinity; // pending writes on top
        const tb = b.createdAt ? b.createdAt.toMillis() : Infinity;
        return tb - ta;
      });
      render(entries);
    },
    (error) => {
      // Surface listener failures instead of silently showing nothing
      console.error("Journal live-load failed:", error.code, error.message);
      list.innerHTML = "";
      empty.hidden = false;
      empty.textContent = "Couldn't load entries (" + error.code + "). Check the console (F12).";
    }
  );
}

/* ---------- Save a new entry ---------- */
async function handleSubmit(event) {
  event.preventDefault();
  const html = editor.innerHTML.trim();
  const text = (editor.innerText || "").trim(); // plain copy for snippet/search
  if (!text) return; // nothing written

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";
  msg.hidden = true;
  try {
    await addDoc(entriesRef, {
      uid: auth.currentUser.uid,
      title: titleInput.value.trim(),
      html,                 // formatted content
      text,                 // plain-text version
      createdAt: serverTimestamp(),
    });
    form.reset();           // clears the title input
    editor.innerHTML = "";  // contenteditable isn't a form field, so clear it manually
    editor.focus();
  } catch (err) {
    msg.textContent = "Couldn't save — check your connection.";
    msg.hidden = false;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save entry";
  }
}

/* ---------- Delete ---------- */
async function removeEntry(id) {
  if (!confirm("Delete this entry? This can't be undone.")) return false;
  try {
    await deleteDoc(doc(db, "entries", id));
    return true;
  } catch (err) {
    alert("Couldn't delete that entry. Please try again.");
    return false;
  }
}

/* ---------- Wire up ---------- */
form.addEventListener("submit", handleSubmit);
detailClose.addEventListener("click", closeEntry);
detailDelete.addEventListener("click", async () => {
  if (openId && (await removeEntry(openId))) closeEntry();
});

// Close on backdrop click or Escape
modalEl.addEventListener("click", (e) => { if (e.target.dataset.close) closeEntry(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modalEl.hidden) closeEntry();
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    closeEntry();       // make sure no popup is open on login
    startListening(user.uid);
  } else if (unsubscribe) {
    unsubscribe();      // stop the live feed
    unsubscribe = null;
    list.innerHTML = "";
    closeEntry();
  }
});
