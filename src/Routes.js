import { Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage/page';
import Login from './pages/Login/page';
import Register from './pages/Register/page';
import NotFound from './pages/NotFound/page';

function RouterRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<MainPage />} />
      <Route path="/chat/:id" element={<MainPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default RouterRoutes;