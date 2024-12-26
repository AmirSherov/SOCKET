import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGlobalContext } from '../../context';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, firestoreDb } from '../../api/firebaseConfig';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import Button from '../../hooks/Button';
import './auth.scss';
import { initializeNotifications } from '../../api/firebaseConfig';
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
      
      // Добавляем инициализацию уведомлений после успешного входа
      await initializeNotifications(user.uid);
      
      dispatch({
        type: 'SET_USER',
        payload: user,
      });
      localStorage.setItem('userId', user.id);
      navigate('/', { replace: true });
    } catch (error) {
      setError(error.message);
    }
  };

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
    }

    if (loading) {
      setError('Users are still loading. Please wait.');
      return;
    }

    const user = users.find(u => u.email === email);
    
    if (user && user.password === password) {
      try {
        dispatch({
          type: 'SET_USER',
          payload: user,
        });
        localStorage.setItem('userId', user.id);
        navigate('/', { replace: true });
      } catch (error) {
        console.error('Login failed:', error);
        setError('Login failed');
      }
    } else {
      setError('Invalid email or password');
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userRef = doc(firestoreDb, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);
      
      const newUser = {
        id: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || 'No Name',
        photoURL: result.user.photoURL,
        createdAt: Date.now(),
        contacts: [],
        nickname: '@' + result.user.email.split('@')[0]
      };

      if (!userSnap.exists()) {
        await setDoc(userRef, newUser);
      }

      const userData = userSnap.exists() ? userSnap.data() : newUser;
      
      dispatch({
        type: 'SET_USER',
        payload: userData
      });
      
      localStorage.setItem('userId', result.user.uid);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Google sign in error:', error);
      setError('Ошибка входа через Google: ' + error.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Login</h2>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" style={{ width: '100%', height: '40px' }}>
              Login
            </button>
          </form>
        )}
        <Button
          type="button"
          onClick={signInWithGoogle}
          width="100%"
          height="40px"
          bg="#4285F4"
          textColor="#fff"
        >
          Sign in with Google
        </Button>
        <p>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
