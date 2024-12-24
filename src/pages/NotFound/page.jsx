import React from 'react';
import './notfound.scss';
import { Link } from 'react-router-dom';
function NotFound() {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1 className="not-found-title">404</h1>
        <p className="not-found-message">Oops! The page you’re looking for doesn’t exist.</p>
        <p className="not-found-suggestion">You can go back to the home page or check your URL.</p>
        <Link to="/" style={{ textDecoration: 'none' , color: 'white', fontWeight: 'bold', fontSize: '1.2rem' , marginRight: '10px', padding: '10px', border: '2px solid white', backgroundColor: 'transparent', borderRadius: '5px'}}>Home</Link>
      </div>
    </div>
  );
}

export default NotFound;
