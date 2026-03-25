import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Heslo musí mít alespoň 6 znaků'); return; }
    setLoading(true);
    const { error } = await signUp(email, password, name);
    setLoading(false);
    if (error) {
      toast.error('Registrace se nezdařila: ' + error.message);
    } else {
      toast.success('Registrace úspěšná! Zkontrolujte e-mail pro potvrzení.');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f4f7ff, #e8f6ff)' }}>
      <div className="panel-card w-full max-w-md">
        <h1 className="text-2xl font-extrabold text-primary mb-1">Registrace</h1>
        <p className="text-muted-foreground mb-6">Alíkova Univerzita</p>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <input type="text" placeholder="Jméno" value={name} onChange={(e) => setName(e.target.value)} required className="border-2 border-blue-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-secondary" />
          <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required className="border-2 border-blue-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-secondary" />
          <input type="password" placeholder="Heslo (min. 6 znaků)" value={password} onChange={(e) => setPassword(e.target.value)} required className="border-2 border-blue-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-secondary" />
          <button type="submit" disabled={loading} className="btn-alik-primary">{loading ? 'Registrace...' : 'Registrovat se'}</button>
        </form>
        <p className="text-sm text-center mt-4 text-muted-foreground">
          Máte účet? <Link to="/login" className="text-primary font-bold">Přihlásit se</Link>
        </p>
        <p className="text-xs text-center mt-2 text-muted-foreground">První registrovaný uživatel získá roli Vývojář s plnými právy.</p>
      </div>
    </div>
  );
}
