import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBtrnYPNQnJgd59_Rxv1UhzGxug71LnQdk",
  authDomain: "dev-docs-fe4c5.firebaseapp.com",
  projectId: "dev-docs-fe4c5",
  storageBucket: "dev-docs-fe4c5.firebasestorage.app",
  messagingSenderId: "642153434046",
  appId: "1:642153434046:web:e35bcfccbf293403aac7ef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
