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

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
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

  const createFirestoreUser = async (user) => {
    try {
      await setDoc(doc(firestoreDb, 'users', user.uid), {
        id: user.uid,
        email: user.email,
        password: user.password, // Add password
        createdAt: Date.now(),
        contacts: [],
        photoURL: user.photoURL || null,
        displayName: user.displayName || null,
        nickname: user.nickname || null
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
      await createFirestoreUser({
        ...userCredential.user,
        password, // Add password here
        nickname,
        photoURL: avatarUrl || null
      });
      
      dispatch({
        type: 'SET_USER',
        payload: {
          email: userCredential.user.email,
          id: userCredential.user.uid,
          nickname,
          photoURL: avatarUrl
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

  const handleAvatarUpload = () => {
    const client = filestack.init('A9SyIIcLaSvaAOwQJBrC4z');
    const options = {
      maxFiles: 1,
      accept: ['image/*'],
      transformations: {
        crop: {
          force: true,
          aspectRatio: 1
        },
        circle: true
      },
      maxSize: 2 * 1024 * 1024,
    };

    client.picker(options).open()
      .then(result => {
        if (result.filesUploaded.length > 0) {
          setAvatarUrl(result.filesUploaded[0].url);
        }
      })
      .catch(err => {
        console.error("Error uploading file:", err);
        setError('Error uploading avatar');
      });
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
          {avatarUrl && (
            <div className="avatar-preview">
              <img src={avatarUrl} alt="Avatar preview" />
            </div>
          )}
          <Button
            type="button"
            onClick={handleAvatarUpload}
            width="100%"
            height="40px"
          >
            {avatarUrl ? 'Change Avatar' : 'Upload Avatar'}
          </Button>
          <Button type="submit" width="100%" height="40px">
            Зарегистрироваться
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