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
const textInput  = document.getElementById("entryText");
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

let unsubscribe = null; // stops the live listener on logout

/* ---------- Date formatting ---------- */
const fmt = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});
function formatDate(ts) {
  if (!ts) return "Saving…"; // serverTimestamp is briefly null right after write
  return fmt.format(ts.toDate());
}

/* Short one-line preview of an entry's body for the list */
function snippet(text, max = 150) {
  const t = text.replace(/\s+/g, " ").trim();
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
    snip.textContent = snippet(entry.text);

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
  detailBody.textContent = entry.text; // textContent = safe, preserves any characters
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
      const entries = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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
  const text = textInput.value.trim();
  if (!text) return;

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";
  msg.hidden = true;
  try {
    await addDoc(entriesRef, {
      uid: auth.currentUser.uid,
      title: titleInput.value.trim(),
      text,
      createdAt: serverTimestamp(),
    });
    form.reset();
    textInput.focus();
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
