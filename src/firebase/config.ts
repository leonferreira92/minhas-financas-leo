import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: appletConfig.apiKey || "AIzaSyA6SPisJ3DkG9lpKtuq2ZZvYe8cKNlAxfM",
  authDomain: appletConfig.authDomain || "gen-lang-client-0039679199.firebaseapp.com",
  projectId: appletConfig.projectId || "gen-lang-client-0039679199",
  storageBucket: appletConfig.storageBucket || "gen-lang-client-0039679199.firebasestorage.app",
  messagingSenderId: appletConfig.messagingSenderId || "487650344076",
  appId: appletConfig.appId || "1:487650344076:web:5f2df0c356732488098fa9",
  measurementId: appletConfig.measurementId || "",
  firestoreDatabaseId: appletConfig.firestoreDatabaseId || "ai-studio-copyoffinanaspro-bc264f67-4bcd-49ec-83aa-0eade5a8c42b"
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
