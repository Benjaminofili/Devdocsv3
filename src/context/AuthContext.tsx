import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  GithubAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth } from '../lib/firebase/config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoggingIn: boolean;
  signInWithGithub: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGithub = async () => {
    setIsLoggingIn(true);
    const provider = new GithubAuthProvider();
    provider.addScope('repo');
    
    try {
      const result = await signInWithPopup(auth, provider);
      
      // Capture GitHub Access Token
      const credential = GithubAuthProvider.credentialFromResult(result);
      const githubToken = credential?.accessToken;

      if (githubToken) {
        // Send the token to the secure backend route for encryption and storage
        const firebaseIdToken = await result.user.getIdToken();
        const response = await fetch('/api/auth/save-github-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${firebaseIdToken}`,
          },
          body: JSON.stringify({ githubToken }),
        });
        if (!response.ok) {
          console.error('Failed to save GitHub token securely:', await response.text());
        }
      }
    } catch (error) {
      console.error("Error signing in with GitHub:", error);
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isLoggingIn, signInWithGithub, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
