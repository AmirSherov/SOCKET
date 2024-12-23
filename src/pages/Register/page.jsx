import React, { useState } from 'react';
import { auth, googleProvider } from '../../api/firebaseConfig';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { useGlobalContext } from '../../context';
import { doc, setDoc } from 'firebase/firestore';
import Button from '../../hooks/Button';
import { firestoreDb } from '../../api/firebaseConfig';
import './auth.scss';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { dispatch } = useGlobalContext();

  const createFirestoreUser = async (user) => {
    try {
      await setDoc(doc(firestoreDb, 'users', user.uid), {
        id: user.uid,
        email: user.email,
        createdAt: Date.now(),
        contacts: [],
        photoURL: user.photoURL || null,
        displayName: user.displayName || null
      });
    } catch (error) {
      console.error("Error creating user in Firestore:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      dispatch({
        type: 'SET_USER',
        payload: {
          email: userCredential.user.email,
          id: userCredential.user.uid
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
        <h2>Register</h2>
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
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="button" onclick={handleSubmit} width="100%" height="40px">
            Register
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