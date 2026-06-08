/* =========================================================
   Firebase setup for the portfolio
   ---------------------------------------------------------
   NOTE: These keys are SAFE to keep in public code / GitHub.
   Firebase web config is a project identifier, not a secret.
   Your data is protected by Security Rules, not by hiding this.
   ========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyAAxzG9RUsA9UXYwNWvuemLeRZ_s44YcDs",
  authDomain: "myportfolio-c9cac.firebaseapp.com",
  projectId: "myportfolio-c9cac",
  storageBucket: "myportfolio-c9cac.firebasestorage.app",
  messagingSenderId: "111404876132",
  appId: "1:111404876132:web:96d4b70322860d4dae3a71",
  measurementId: "G-GPDN1V2PGH",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Visitor analytics (Google Analytics). Auto-collects page views, visitor
// counts, location, device/browser, and traffic source. Guarded by
// isSupported() so it never breaks the page where analytics can't run.
isSupported().then((ok) => { if (ok) getAnalytics(app); });
