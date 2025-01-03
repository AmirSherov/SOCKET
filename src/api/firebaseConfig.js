import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC-xtGARuxmJn0uC25SXlz7PSHk33LPXsQ",
  authDomain: "telegram-76dde.firebaseapp.com",
  databaseURL: "https://telegram-76dde-default-rtdb.firebaseio.com",
  projectId: "telegram-76dde",
  storageBucket: "telegram-76dde.firebasestorage.app",
  messagingSenderId: "52195159082",
  appId: "1:52195159082:web:5271f2f4f344b74ac9a753"
};

const app = initializeApp(firebaseConfig);
export const realtimeDb = getDatabase(app);
export const firestoreDb = getFirestore(app);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
export const googleAuth = googleProvider

export const githubProvider = new GithubAuthProvider();
githubProvider.addScope('user');
githubProvider.setCustomParameters({
    'allow_signup': 'true'
});