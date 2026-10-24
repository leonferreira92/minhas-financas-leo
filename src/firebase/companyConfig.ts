import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * Firebase do app empresa (Vida de Artista).
 * Separado de `financas-pessoais-pro` — só usado para ler companySummary.
 */
export const companyFirebaseConfig = {
  apiKey: 'AIzaSyBbfoCP7bgFFNJsMD7ZijAI7cQHvNTDFaQ',
  authDomain: 'leo-ferreira-app.firebaseapp.com',
  projectId: 'leo-ferreira-app',
  storageBucket: 'leo-ferreira-app.firebasestorage.app',
  messagingSenderId: '669579008508',
  appId: '1:669579008508:web:fbf01ddaa338d24ce9ba79'
};

const COMPANY_APP_NAME = 'leo-ferreira-app';

function getOrInitCompanyApp(): FirebaseApp {
  const existing = getApps().find(a => a.name === COMPANY_APP_NAME);
  if (existing) return existing;
  try {
    return getApp(COMPANY_APP_NAME);
  } catch {
    return initializeApp(companyFirebaseConfig, COMPANY_APP_NAME);
  }
}

export const companyApp = getOrInitCompanyApp();
export const companyAuth: Auth = getAuth(companyApp);
export const companyDb: Firestore = getFirestore(companyApp);

export default companyFirebaseConfig;
