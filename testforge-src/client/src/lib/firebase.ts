// Firebase app for TestForge login — the SAME project the portfolio journal uses
// (myportfolio-c9cac), so signing into TestForge uses your existing journal account.
// These values are public identifiers, not secrets (Firebase web config is safe in the
// bundle); the real protection is server-side token verification + Firestore rules.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAAxzG9RUsA9UXYwNWvuemLeRZ_s44YcDs',
  authDomain: 'myportfolio-c9cac.firebaseapp.com',
  projectId: 'myportfolio-c9cac',
  storageBucket: 'myportfolio-c9cac.firebasestorage.app',
  messagingSenderId: '111404876132',
  appId: '1:111404876132:web:96d4b70322860d4dae3a71',
};

// getApps() guard so HMR / double-mount doesn't re-initialize.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
