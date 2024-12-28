import { useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { firestoreDb } from '../api/firebaseConfig';

export const useOnlineStatus = (userId) => {
  useEffect(() => {
    if (!userId) return;

    const userRef = doc(firestoreDb, 'users', userId);

    // Set online when component mounts
    const setOnline = async () => {
      await setDoc(userRef, {
        status: true,
        lastSeen: new Date().toISOString()
      }, { merge: true }); // This will add fields if they don't exist
    };

    // Set offline when user leaves/closes
    const setOffline = async () => {
      await setDoc(userRef, {
        status: false,
        lastSeen: new Date().toISOString()
      }, { merge: true });
    };

    // Register event listeners
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setOnline();
      } else {
        setOffline();
      }
    };

    // Handle tab close/browser close
    window.addEventListener('beforeunload', setOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set initial online status
    setOnline();

    // Cleanup
    return () => {
      setOffline();
      window.removeEventListener('beforeunload', setOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);
};