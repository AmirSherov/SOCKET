import React, { useState, useEffect } from 'react';
import { auth, googleAuth, githubProvider } from '../../api/firebaseConfig';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { useGlobalContext } from '../../context';
import { doc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import Button from '../../hooks/Button';
import { firestoreDb } from '../../api/firebaseConfig';
import './auth.scss';
import { FaGoogle, FaGithub, FaEnvelope, FaLock, FaUser, FaAt } from 'react-icons/fa';
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
        status: true, 
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
      navigate('/conversations', { replace: true });
    } catch (error) {
      setError(error.message);
    }
  };
  const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleAuth);
        const user = result.user;
        let finalNickname;
        const usersRef = collection(firestoreDb, 'users');
        const q = query(usersRef, where("id", "==", user.uid)); 
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            const defaultNickname = '@' + user.email.split('@')[0];
            const nicknameQuery = query(usersRef, where("nickname", "==", defaultNickname));
            const nicknameSnapshot = await getDocs(nicknameQuery);
            finalNickname = nicknameSnapshot.empty 
                ? defaultNickname 
                : `${defaultNickname}${Math.floor(Math.random() * 1000)}`;
            await setDoc(doc(firestoreDb, 'users', user.uid), {
                id: user.uid, 
                email: user.email,
                displayName: user.displayName || 'User',
                nickname: finalNickname,
                photoURL: user.photoURL || '',
                contacts: [],
                bio: '',
                createdAt: new Date().toISOString(),
                status: true,
                lastSeen: new Date().toISOString()
            });
            dispatch({
                type: 'SET_USER',
                payload: {
                    email: user.email,
                    id: user.uid, 
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
                    id: user.uid,
                    nickname: userData.nickname,
                    displayName: userData.displayName,
                    photoURL: userData.photoURL
                }
            });
        }
        localStorage.setItem('userId', user.uid)
        navigate('/conversations', { replace: true });
    } catch (error) {
        console.error("Error during Google sign-in:", error);
        setError(error.message);
    }
};
  const signInWithGithub = async () => {
    try {
        const result = await signInWithPopup(auth, githubProvider);
        const user = result.user;
        const githubUser = result._tokenResponse;
        let finalNickname;
        const usersRef = collection(firestoreDb, 'users');
        const q = query(usersRef, where("id", "==", user.uid));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            const defaultNickname = '@' + (githubUser.screenName || user.email.split('@')[0]);
            const nicknameQuery = query(usersRef, where("nickname", "==", defaultNickname));
            const nicknameSnapshot = await getDocs(nicknameQuery);
            
            finalNickname = nicknameSnapshot.empty 
                ? defaultNickname 
                : `${defaultNickname}${Math.floor(Math.random() * 1000)}`;
            await setDoc(doc(firestoreDb, 'users', user.uid), {
                id: user.uid,
                email: user.email,
                displayName: githubUser.screenName || githubUser.displayName || user.email.split('@')[0],
                nickname: finalNickname,
                photoURL: githubUser.photoUrl || user.photoURL || '',
                contacts: [],
                bio: '',
                createdAt: new Date().toISOString(),
                status: true,
                lastSeen: new Date().toISOString()
            });
            dispatch({
                type: 'SET_USER',
                payload: {
                    email: user.email,
                    id: user.uid,
                    nickname: finalNickname,
                    displayName: githubUser.screenName || githubUser.displayName || user.email.split('@')[0],
                    photoURL: githubUser.photoUrl || user.photoURL || ''
                }
            });
        } else {
            const userData = querySnapshot.docs[0].data();
            dispatch({
                type: 'SET_USER',
                payload: {
                    email: user.email,
                    id: user.uid,
                    nickname: userData.nickname,
                    displayName: userData.displayName,
                    photoURL: userData.photoURL
                }
            });
        }
        localStorage.setItem('userId', user.uid);
        navigate('/conversations');
    } catch (error) {
        console.error("Error during GitHub sign-in:", error);
        setError(error.message);
    }
};
  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2 className="title-with-animation">Регистрация</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <FaEnvelope className="input-icon" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="input-group">
            <FaLock className="input-icon" />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="input-group">
            <FaAt className="input-icon" />
            <input
              type="text"
              placeholder="@никнейм"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>
          <div className="input-group">
            <FaUser className="input-icon" />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <Button type="submit" width="100%" height="40px" className="primary-button">
            Зарегистрироватся
          </Button>
        </form>
        <div className="social-buttons">
          <Button
            type="button"
            onClick={signInWithGoogle}
            className="social-button google"
          >
            <FaGoogle /> Google
          </Button>
          <Button
            type="button"
            onClick={signInWithGithub}
            className="social-button github"
          >
            <FaGithub /> GitHub
          </Button>
        </div>
        <p className="auth-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}