import React, { useState, useEffect } from 'react';
import * as filestack from 'filestack-js';
import { auth, googleProvider } from '../../api/firebaseConfig';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { useGlobalContext } from '../../context';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
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
        password: password, // Добавляем пароль (небезопасно!)
        displayName: username || userData.displayName || email.split('@')[0],
        nickname: nickname,
        photoURL: userData.photoURL || '',
        createdAt: Date.now(),
        contacts: [],
        bio: ''
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
      
      navigate('/');
    } catch (error) {
      setError(error.message);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await createFirestoreUser(result.user);
      dispatch({ 
        type: 'SET_USER', 
        payload: {
          email: result.user.email,
          id: result.user.uid,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL
        } 
      });
      navigate('/');
    } catch (error) {
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
          textColor="#fff"
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