import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
export default function HowCommissionsWork() {
  var navigate = useNavigate();
  useEffect(function() { navigate('/compensation-plan', { replace: true }); }, []);
  return null;
}
