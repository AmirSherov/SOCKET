'use strict';
import './App.scss';
import { BrowserRouter } from 'react-router-dom';
import Routes from './Routes';
import { GlobalProvider } from "./context/index"
import { Toaster } from 'react-hot-toast';
function App() {
  return (
    <BrowserRouter>
      <GlobalProvider>
      <Toaster position="top-center"
        zIndex={9999999999}
      />
        <Routes />
      </GlobalProvider>
    </BrowserRouter>
  );
}

export default App;
