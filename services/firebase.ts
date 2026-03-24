import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBG3ASzqNad31LwWfoAK5fQtQzykwD91R4",
  authDomain: "srtc-student-registration.firebaseapp.com",
  projectId: "srtc-student-registration",
  storageBucket: "srtc-student-registration.firebasestorage.app",
  messagingSenderId: "782725512423",
  appId: "1:782725512423:web:32d5bb13d21a99d7303642",
  measurementId: "G-80JSD8GF9L"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);
export default app;
