// src/lib/firebase/usage-history.ts
import { db } from './config';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit 
} from 'firebase/firestore';

export async function getGenerationHistory(userId: string) {
  const q = query(
    collection(db, 'generation_history'),
    where('user_id', '==', userId),
    orderBy('created_at', 'desc'),
    limit(20)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
