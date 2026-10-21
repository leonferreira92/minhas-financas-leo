import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: appletConfig.apiKey || "AIzaSyDPB5YUBJiz-G463Gq2xE00vVDIqYZ9M8M",
  authDomain: appletConfig.authDomain || "financas-pessoais-pro.firebaseapp.com",
  projectId: appletConfig.projectId || "financas-pessoais-pro",
  storageBucket: appletConfig.storageBucket || "financas-pessoais-pro.firebasestorage.app",
  messagingSenderId: appletConfig.messagingSenderId || "1041146878015",
  appId: appletConfig.appId || "1:1041146878015:web:e9e44c2fd48c93b8b8808a",
  measurementId: appletConfig.measurementId || "",
  firestoreDatabaseId: "(default)"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Conexão principal com o banco (default) do novo projeto financas-pessoais-pro
export const db: Firestore = getFirestore(app);

// Referência ao banco antigo (caso exista transações antigas para migrar)
export const OLD_DATABASE_ID = "ai-studio-copyoffinanaspro-bc264f67-4bcd-49ec-83aa-0eade5a8c42b";
let oldDbInstance: Firestore | null = null;
try {
  oldDbInstance = getFirestore(app, OLD_DATABASE_ID);
} catch (e) {
  oldDbInstance = null;
}
export const oldDb: Firestore | null = oldDbInstance;

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar');

export default firebaseConfig;
