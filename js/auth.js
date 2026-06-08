/* =========================================================
   Arvin Joseph Gonzaga — Portfolio auth (private journal)
   ---------------------------------------------------------
   - No visible login button. The login modal opens only when
     the URL ends with #journal  (e.g. .../index.html#journal).
   - Login only (no public signup). One account = yours.
   - When signed in, the full-screen journal is shown.
   ========================================================= */

import { auth } from "./firebase-config.js?v=3";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ---------- Elements ---------- */
const modal      = document.getElementById("authModal");
const closeBtn   = document.getElementById("authClose");
const form       = document.getElementById("authForm");
const emailInput = document.getElementById("authEmail");
const passInput  = document.getElementById("authPassword");
const msg        = document.getElementById("authMsg");
const submitBtn  = document.getElementById("authSubmit");

const journal       = document.getElementById("journal");
const journalUser   = document.getElementById("journalUser");
const journalLogout = document.getElementById("journalLogout");

/* ---------- Modal open / close ---------- */
function openModal() {
  clearMsg();
  modal.hidden = false;
  emailInput.focus();
}
function closeModal() {
  modal.hidden = true;
  form.reset();
  clearMsg();
  // Drop the #journal tag from the URL so closing feels clean
  if (location.hash === "#journal") {
    history.replaceState(null, "", location.pathname + location.search);
  }
}

/* Open the modal whenever the page is visited/navigated to with #journal */
function checkHash() {
  if (location.hash === "#journal" && journal.hidden) openModal();
}

/* ---------- Messages ---------- */
function showMsg(text) {
  msg.textContent = text;
  msg.dataset.kind = "error";
  msg.hidden = false;
}
function clearMsg() {
  msg.textContent = "";
  msg.hidden = true;
}

function friendlyError(code) {
  switch (code) {
    case "auth/invalid-email":          return "That email address doesn't look right.";
    case "auth/missing-password":       return "Please enter your password.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":         return "Email or password is incorrect.";
    case "auth/too-many-requests":      return "Too many attempts. Please wait a moment.";
    case "auth/network-request-failed": return "Network error — check your connection.";
    default:                            return "Couldn't sign in. Please try again.";
  }
}

/* ---------- Sign in ---------- */
async function handleSubmit(event) {
  event.preventDefault();
  clearMsg();

  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in…";
  try {
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passInput.value);
    closeModal();
    // onAuthStateChanged reveals the journal automatically.
  } catch (err) {
    showMsg(friendlyError(err.code));
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign in";
  }
}

/* ---------- Show/hide journal on login state ---------- */
function renderAuthState(user) {
  if (user) {
    modal.hidden = true;
    journal.hidden = false;
    journalUser.textContent = user.email;
    document.body.classList.add("journal-open"); // locks page scroll behind it
  } else {
    journal.hidden = true;
    document.body.classList.remove("journal-open");
  }
}

/* ---------- Wire up ---------- */
form.addEventListener("submit", handleSubmit);
closeBtn.addEventListener("click", closeModal);
journalLogout.addEventListener("click", () => signOut(auth));

modal.addEventListener("click", (e) => { if (e.target.dataset.close) closeModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.hidden) closeModal();
});

window.addEventListener("hashchange", checkHash);
onAuthStateChanged(auth, renderAuthState);
checkHash(); // handle the case where the page loads already at #journal
