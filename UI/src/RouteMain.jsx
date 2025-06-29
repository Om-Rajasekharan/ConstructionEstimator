import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthSuccess from './AuthSuccess';
import App from './App';

function RouteMain() {
  return (
    <Router>
      <Routes>
        <Route path="/auth-success" element={<AuthSuccess />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </Router>
  );
}

export default RouteMain;
