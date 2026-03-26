import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function BlockGuard({ children }: { children: ReactNode }) {
  const { isBlocked, loading } = useAuth();
  if (loading) return null;
  if (isBlocked) return <Navigate to="/blocked" replace />;
  return <>{children}</>;
}
