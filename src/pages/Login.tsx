import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error('Přihlášení se nezdařilo: ' + error.message);
    } else {
      toast.success('Přihlášení úspěšné!');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f4f7ff, #e8f6ff)' }}>
      <div className="panel-card w-full max-w-md">
        <h1 className="text-2xl font-extrabold text-primary mb-1">Přihlášení</h1>
        <p className="text-muted-foreground mb-6">Alíkova Univerzita</p>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border-2 border-blue-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-secondary"
          />
          <input
            type="password"
            placeholder="Heslo"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border-2 border-blue-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-secondary"
          />
          <button type="submit" disabled={loading} className="btn-alik-primary">
            {loading ? 'Přihlašování...' : 'Přihlásit se'}
          </button>
        </form>
        <p className="text-sm text-center mt-4 text-muted-foreground">
          Nemáte účet? <Link to="/register" className="text-primary font-bold">Registrovat se</Link>
        </p>
      </div>
    </div>
  );
}
