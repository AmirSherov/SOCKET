import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGlobalContext } from '../../context';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleAuth, githubProvider, firestoreDb } from '../../api/firebaseConfig';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import Button from '../../hooks/Button';
import { FaGoogle, FaGithub, FaEnvelope, FaLock } from 'react-icons/fa';
import './auth.scss';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { dispatch } = useGlobalContext();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      navigate('/', { replace: true });
    }
    const loadUsers = async () => {
      try {
        const usersCollection = collection(firestoreDb, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersList);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(firestoreDb, 'users', user.uid));
      if (!userDoc.exists()) {
        throw new Error('User does not exist in database');
      }
      
      const userData = userDoc.data();
      
      dispatch({
        type: 'SET_USER',
        payload: {
          email: userData.email,
          id: userData.id,
          nickname: userData.nickname,
          displayName: userData.displayName,
          photoURL: userData.photoURL || ''
        }
      });

      localStorage.setItem('userId', user.uid);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      setError('Неверный email или пароль');
      toast.error('Неверный email или пароль');
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleAuth);
      const user = result.user;
      
      // Check if user exists in Firestore
      const userRef = doc(firestoreDb, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        setError('Аккаунт не существует. Пожалуйста, зарегистрируйтесь.');
        return;
      }

      const userData = userSnap.data();
      dispatch({
        type: 'SET_USER',
        payload: userData
      });
      
      localStorage.setItem('userId', user.uid);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Google sign in error:', error);
      setError('Ошибка входа через Google');
    }
  };

  const signInWithGithub = async () => {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      const user = result.user;
      
      // Check if user exists in Firestore
      const userRef = doc(firestoreDb, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        setError('Аккаунт не существует. Пожалуйста, зарегистрируйтесь.');
        return;
      }

      const userData = userSnap.data();
      dispatch({
        type: 'SET_USER',
        payload: userData
      });
      
      localStorage.setItem('userId', user.uid);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('GitHub sign in error:', error);
      setError('Ошибка входа через GitHub');
    }
  };

  return (
     <div className='auth-container'>
 <div className="auth-form">
        <h2 className="title-with-animation">Войти в аккаунт</h2>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="loading">Loading...</p>
        ) : (
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <FaEnvelope className="input-icon" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <FaLock className="input-icon" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="primary-button">
              Войти
            </Button>
          </form>
        )}
        <div className="social-buttons">
          <button
            type="button"
            onClick={signInWithGoogle}
            className="social-button google"
          >
            <FaGoogle /> Google
          </button>
          <button
            type="button"
            onClick={signInWithGithub}
            className="social-button github"
          >
            <FaGithub /> GitHub
          </button>
        </div>
        <p className="auth-link">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </div>
     </div>
  );
}
