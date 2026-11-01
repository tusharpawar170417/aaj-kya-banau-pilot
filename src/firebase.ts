import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  updateProfile,
  type UserCredential,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId,
);

let app: FirebaseApp | undefined;
if (firebaseEnabled) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

export const auth = app ? getAuth(app) : null;

export async function signInWithFirebaseEmail(email: string, password: string): Promise<UserCredential> {
  if (!auth) {
    throw new Error('Firebase is not configured yet.');
  }

  return signInWithEmailAndPassword(auth, email, password);
}

export async function createUserWithFirebaseEmail(email: string, password: string, name: string): Promise<UserCredential> {
  if (!auth) {
    throw new Error('Firebase is not configured yet.');
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (name && credential.user) {
    await updateProfile(credential.user, { displayName: name });
  }
  return credential;
}
