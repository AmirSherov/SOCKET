import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGlobalContext } from '../../context';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, firestoreDb } from '../../api/firebaseConfig';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import Button from '../../hooks/Button';
import './auth.scss';
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
        console.log('Users loaded:', usersList);
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
      
      // Получаем данные пользователя из Firestore
      const userDoc = await getDoc(doc(firestoreDb, 'users', user.uid));
      const userData = userDoc.data();

      dispatch({
        type: 'SET_USER',
        payload: {
          email: user.email,
          id: user.uid,
          nickname: userData.nickname,
          displayName: userData.displayName,
          photoURL: userData.photoURL || ''
        }
      });
      
      localStorage.setItem('userId', user.uid);
      navigate('/', { replace: true });
    } catch (error) {
      setError(error.message);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userRef = doc(firestoreDb, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      let userData;
      if (!userSnap.exists()) {
        userData = {
          id: user.uid,
          email: user.email,
          displayName: user.displayName || 'No Name',
          photoURL: user.photoURL,
          createdAt: new Date().toISOString(),
          contacts: [],
          nickname: '@' + user.email.split('@')[0]
        };
        await setDoc(userRef, userData);
      } else {
        userData = userSnap.data();
      }

      dispatch({
        type: 'SET_USER',
        payload: userData
      });
      
      localStorage.setItem('userId', user.uid);
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
          textcolor="#fff"
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
