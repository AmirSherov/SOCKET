import { useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { firestoreDb } from '../api/firebaseConfig';
export const useOnlineStatus = (userId) => {
  useEffect(() => {
    if (!userId) return;
    const userRef = doc(firestoreDb, 'users', userId);
    const setOnline = async () => {
      await setDoc(userRef, {
        status: true,
        lastSeen: new Date().toISOString()
      }, { merge: true }); 
    };
    const setOffline = async () => {
      await setDoc(userRef, {
        status: false,
        lastSeen: new Date().toISOString()
      }, { merge: true });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setOnline();
      } else {
        setOffline();
      }
    };
    window.addEventListener('beforeunload', setOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    setOnline();
    return () => {
      setOffline();
      window.removeEventListener('beforeunload', setOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);
};