// public/js/firebase.js

// Firebase initialization
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// If you’d like analytics:
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDq7K_18TCLbFhOEYaICCFcs6_cwdBcmsE",
  authDomain: "duelmasters-b0a97.firebaseapp.com",
  projectId: "duelmasters-b0a97",
  storageBucket: "duelmasters-b0a97.firebasestorage.app",
  messagingSenderId: "720233563583",
  appId: "1:720233563583:web:a428850e3a49f6fc338d0a",
  measurementId: "G-ZQJ2M31GN8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
// If you imported analytics above, uncomment:
// export const analytics = getAnalytics(app);
