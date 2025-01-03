import { Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage/page';
import Login from './pages/Login/page';
import Register from './pages/Register/page';
import NotFound from './pages/NotFound/page';
import Chating from './components/chating/chatid';
import LandingPage from "./LandingPage.jsx";
function RouterRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/conversations" element={<MainPage />} />
      <Route path="/" element={<LandingPage />} />
      <Route path="/chating/:chatid" element={<Chating />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default RouterRoutes;