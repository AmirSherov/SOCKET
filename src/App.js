'use strict';
import './App.scss';
import { BrowserRouter } from 'react-router-dom';
import Routes from './Routes';
import { GlobalProvider } from "./context/index"
function App() {
  return (
    <BrowserRouter>
      <GlobalProvider>
        <Routes />
      </GlobalProvider>
    </BrowserRouter>
  );
}

export default App;
