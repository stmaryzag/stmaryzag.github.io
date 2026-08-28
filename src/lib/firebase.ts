import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";
import { getAnalytics } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: "AIzaSyC-eTvrgJ6TkNyQ4GcMEEK-4VjAZtbRej4",
  authDomain: "stmary-5a276.firebaseapp.com",
  projectId: "stmary-5a276",
  storageBucket: "stmary-5a276.firebasestorage.app",
  messagingSenderId: "157183274524",
  appId: "1:157183274524:web:0fb707446792884d1139d9",
  measurementId: "G-XKFCFWLCFG"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

// Only initialize messaging if supported in the browser
export let messaging = null;
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.error("Firebase Messaging not supported", error);
  }
}
