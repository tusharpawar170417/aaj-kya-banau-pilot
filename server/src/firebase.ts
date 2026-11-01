import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

export const localStore = {
  users: [] as any[],
  chefProfiles: [] as any[],
  recipes: [] as any[],
  ratings: [] as any[],
  follows: [] as any[],
  savedRecipes: [] as any[],
  reports: [] as any[],
};

export async function getDb(): Promise<Firestore | null> {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return null;
  }

  if (getApps().length === 0) {
    initializeApp({
      projectId,
      credential: applicationDefault(),
    });
  }

  try {
    return getFirestore();
  } catch {
    return null;
  }
}
