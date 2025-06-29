import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function AuthSuccess({ onAuth }) {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      localStorage.setItem('token', token);
      onAuth && onAuth({ token });
      navigate('/', { replace: true });
    }
  }, [onAuth, navigate]);

  return <div>Signing you in...</div>;
}

export default AuthSuccess;
