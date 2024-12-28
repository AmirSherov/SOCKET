import React, { useState, useEffect } from 'react';
import * as filestack from 'filestack-js';
import { auth, googleProvider } from '../../api/firebaseConfig';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { useGlobalContext } from '../../context';
import { doc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import Button from '../../hooks/Button';
import { firestoreDb } from '../../api/firebaseConfig';
import './auth.scss';
import { set } from 'firebase/database';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [existingNicknames, setExistingNicknames] = useState([]);
  const navigate = useNavigate();
  const { dispatch } = useGlobalContext();

  useEffect(() => {
    const loadExistingNicknames = async () => {
      const usersSnap = await getDocs(collection(firestoreDb, 'users'));
      const nicknames = usersSnap.docs.map(doc => doc.data().nickname);
      setExistingNicknames(nicknames);
    };
    loadExistingNicknames();
  }, []);

  const validateNickname = (nick) => {
    if (!nick.startsWith('@')) {
      return 'Никнейм должен начинаться с @';
    }
    if (existingNicknames.includes(nick)) {
      return 'Этот никнейм уже занят';
    }
    return null;
  };

  const createFirestoreUser = async (userData) => {
    try {
      await setDoc(doc(firestoreDb, 'users', userData.uid), {
        id: userData.uid,
        email: userData.email,
        displayName: username || userData.displayName || email.split('@')[0],
        nickname: nickname,
        photoURL: userData.photoURL || '',
        createdAt: new Date().toISOString(),
        contacts: [],
        bio: '',
        status: true, // Add initial status
        lastSeen: new Date().toISOString(),
        password: password,
      });
    } catch (error) {
      console.error("Error creating user in Firestore:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nicknameError = validateNickname(nickname);
    if (nicknameError) {
      setError(nicknameError);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await createFirestoreUser(user);
      
      dispatch({
        type: 'SET_USER',
        payload: {
          email: user.email,
          id: user.uid,
          nickname: nickname,
          displayName: username || email.split('@')[0],
          photoURL: ''
        }
      });

      localStorage.setItem('userId', user.uid);
      navigate('/');
    } catch (error) {
      setError(error.message);
    }
  };

  const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        let finalNickname;

        const usersRef = collection(firestoreDb, 'users');
        const q = query(usersRef, where("id", "==", user.id));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            const defaultNickname = '@' + user.email.split('@')[0];
            
            const nicknameQuery = query(usersRef, where("nickname", "==", defaultNickname));
            const nicknameSnapshot = await getDocs(nicknameQuery);
            
            finalNickname = nicknameSnapshot.empty 
                ? defaultNickname 
                : `${defaultNickname}${Math.floor(Math.random() * 1000)}`;

            await setDoc(doc(firestoreDb, 'users', user.id), {
                id: user.id,
                email: user.email,
                displayName: user.displayName || 'User',
                nickname: finalNickname,
                photoURL: user.photoURL || '',
                contacts: [],
                bio: '',
                createdAt: new Date().toISOString()
            });

            dispatch({
                type: 'SET_USER',
                payload: {
                    email: user.email,
                    id: user.id,
                    nickname: finalNickname,
                    displayName: user.displayName || 'User',
                    photoURL: user.photoURL || ''
                }
            });
        } else {
            const userData = querySnapshot.docs[0].data();
            dispatch({
                type: 'SET_USER',
                payload: {
                    email: user.email,
                    id: user.id,
                    nickname: userData.nickname,
                    displayName: userData.displayName,
                    photoURL: userData.photoURL
                }
            });
        }

        localStorage.setItem('userId', user.id);
        navigate('/');
    } catch (error) {
        console.error("Error during Google sign-in:", error);
        setError(error.message);
    }
};

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Регистрация</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="text"
            placeholder="@никнейм"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Button type="submit" width="100%" height="40px">
            Зарегистрироватся
          </Button>
        </form>
        <Button
          type="button"
          onclick={signInWithGoogle}
          width="100%"
          height="40px"
          bg="#4285F4"
        >
          Sign up with Google
        </Button>
        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}