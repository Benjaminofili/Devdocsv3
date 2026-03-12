// src/lib/firebase/saved-readmes.ts
import { db } from './config';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';

export interface SavedReadme {
  id?: string;
  userId: string;
  projectName: string;
  repoUrl?: string;
  content: string;
  stack?: string;
  createdAt: any;
  updatedAt: any;
}

export async function saveReadme(userId: string, data: Omit<SavedReadme, 'userId' | 'createdAt' | 'updatedAt'>) {
  return await addDoc(collection(db, 'saved_readmes'), {
    ...data,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getSavedReadmes(userId: string): Promise<SavedReadme[]> {
  const q = query(
    collection(db, 'saved_readmes'),
    where('userId', '==', userId)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as SavedReadme));
}

export async function deleteSavedReadme(readmeId: string) {
  return await deleteDoc(doc(db, 'saved_readmes', readmeId));
}

export async function updateSavedReadme(readmeId: string, content: string) {
  return await updateDoc(doc(db, 'saved_readmes', readmeId), {
    content,
    updatedAt: serverTimestamp(),
  });
}
