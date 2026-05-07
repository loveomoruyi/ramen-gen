/**
 * Ramen Jin POS — Firebase Configuration
 * 
 * Client-side Firebase initialization using compat SDK (CDN).
 * This file initializes Firebase and Firestore for use across the site.
 * 
 * Usage: Include Firebase CDN scripts before this file in HTML:
 *   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
 *   <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
 *   <script src="/firebase/firebase-config.js"></script>
 */

const firebaseConfig = {
  apiKey: "AIzaSyBSW0gtDSjX83oLwHQXJWjUylES4ini254",
  authDomain: "ramen-jin-pos.firebaseapp.com",
  projectId: "ramen-jin-pos",
  storageBucket: "ramen-jin-pos.firebasestorage.app",
  messagingSenderId: "354284008628",
  appId: "1:354284008628:web:7e6da17cf0bab758d41be1",
  measurementId: "G-SLXFEFXT6W"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Initialize Firestore
const db = firebase.firestore();

// Enable offline persistence for better UX
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not available in this browser');
  }
});

console.log('🔥 Firebase initialized for Ramen Jin POS');
