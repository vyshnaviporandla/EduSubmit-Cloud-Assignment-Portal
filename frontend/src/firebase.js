import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDkDB3hJautmcc4lSDDKN20-ZUUk82frbU",
  authDomain: "edusubmit-281e2.firebaseapp.com",
  projectId: "edusubmit-281e2",
  storageBucket: "edusubmit-281e2.firebasestorage.app",
  messagingSenderId: "196232460406",
  appId: "1:196232460406:web:1f23b8b14373cc7f42c757"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);