import React from 'react';
import './notfound.scss';
import Button from "../../hooks/Button/index"
function NotFound() {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1 className="not-found-title">404</h1>
        <p className="not-found-message">Oops! The page you’re looking for doesn’t exist.</p>
        <p className="not-found-suggestion">You can go back to the home page or check your URL.</p>
        <Button type="link" ahref="/" children="Go to Home" width = "150px" height = "44px" borderColor = "white"  textColor = "#fff"  />
      </div>
    </div>
  );
}

export default NotFound;
