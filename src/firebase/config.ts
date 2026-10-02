import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyB0lOaJchUodU5ocuNXmMJPpYp8qJQWmF4",
  authDomain: "gen-lang-client-0039679199.firebaseapp.com",
  projectId: "gen-lang-client-0039679199",
  storageBucket: "gen-lang-client-0039679199.firebasestorage.app",
  messagingSenderId: "487650344076",
  appId: "1:487650344076:web:fe4abb23a5bf5a57098fa9",
  measurementId: "G-F2SWWEFW9E",
  firestoreDatabaseId: "ai-studio-copyoffinanaspro-bc264f67-4bcd-49ec-83aa-0eade5a8c42b"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

let firestoreInstance: Firestore;
try {
  firestoreInstance = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
} catch (e) {
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar');

export default firebaseConfig;
