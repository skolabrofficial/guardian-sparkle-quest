import { useEffect, useState, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Profil() {
  const { user, profile, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewBio, setPreviewBio] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [authLoading, user]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarUrl(profile.avatar_url || null);
    }
    if (user) loadBio();
  }, [profile, user]);

  const loadBio = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('bio').eq('user_id', user.id).single();
    if (data?.bio) setBio(data.bio);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      display_name: displayName,
      bio,
      avatar_url: avatarUrl,
    }).eq('user_id', user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Profil uložen');
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Maximální velikost je 2 MB'); return; }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
    setUploading(false);
    toast.success('Avatar nahrán');
  };

  const removeAvatar = async () => {
    if (!user) return;
    setAvatarUrl(null);
    toast.success('Avatar odstraněn (uložte profil)');
  };

  const roleLabel: Record<string, string> = {
    developer: 'Vývojář', dohledci: 'Dohledčí', lektor: 'Lektor', student: 'Student',
  };
  const roleColors: Record<string, string> = {
    developer: '#991b1b', dohledci: '#b45309', lektor: '#166534', student: '#1e40af',
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Načítání...</div>;

  return (
    <AppLayout>
      <main className="max-w-2xl mx-auto">
        <div className="panel-card animate-float-in">
          <h2 className="mt-0 text-xl">👤 Můj profil</h2>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-5">
            <div
              className="w-20 h-20 rounded-2xl border-2 border-border overflow-hidden cursor-pointer flex items-center justify-center"
              style={{ background: avatarUrl ? `url(${avatarUrl}) center/cover` : 'linear-gradient(180deg, #8fd3ff, #3f87ff)' }}
              onClick={() => fileRef.current?.click()}
            >
              {!avatarUrl && <span className="text-3xl text-white font-extrabold">{displayName?.[0]?.toUpperCase() || '?'}</span>}
            </div>
            <div className="grid gap-1.5">
              <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
              <button onClick={() => fileRef.current?.click()} className="btn-alik-outline text-xs" disabled={uploading}>
                {uploading ? 'Nahrávání...' : '📷 Nahrát avatar'}
              </button>
              {avatarUrl && <button onClick={removeAvatar} className="text-xs text-red-500 font-bold">Odebrat avatar</button>}
            </div>
          </div>

          {/* Role badge */}
          <div className="mb-4">
            <span className="text-xs font-extrabold px-3 py-1 rounded-full text-white" style={{ background: roleColors[role || 'student'] }}>
              {roleLabel[role || 'student']}
            </span>
          </div>

          {/* Name */}
          <div className="grid gap-1.5 mb-4">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Zobrazované jméno</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="border-2 border-blue-200 rounded-xl py-2.5 px-3 text-base outline-none bg-card focus:border-secondary"
              placeholder="Vaše jméno"
            />
          </div>

          {/* Bio with MD preview */}
          <div className="grid gap-1.5 mb-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bio (podporuje Markdown + LaTeX)</label>
              <button
                onClick={() => setPreviewBio(!previewBio)}
                className="text-xs font-bold px-2 py-1 rounded-lg"
                style={{ background: previewBio ? '#dcfce7' : '#eef5ff', color: previewBio ? '#166534' : '#1e40af' }}
              >
                {previewBio ? '✏ Upravit' : '👁 Náhled'}
              </button>
            </div>
            {previewBio ? (
              <div className="border-2 border-green-200 rounded-xl p-3 min-h-[120px] bg-card">
                <MarkdownRenderer content={bio} />
              </div>
            ) : (
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                className="border-2 border-blue-200 rounded-xl py-2.5 px-3 text-sm outline-none bg-card focus:border-secondary min-h-[120px] resize-y font-mono"
                placeholder="Napište něco o sobě... Podporuje **Markdown** a $\LaTeX$"
              />
            )}
          </div>

          {/* Email (readonly) */}
          <div className="grid gap-1.5 mb-5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">E-mail</label>
            <input
              value={user?.email || ''}
              disabled
              className="border-2 border-border rounded-xl py-2.5 px-3 text-sm outline-none bg-muted opacity-60"
            />
          </div>

          <button onClick={saveProfile} disabled={saving} className="btn-alik-primary text-sm w-full">
            {saving ? 'Ukládání...' : '💾 Uložit profil'}
          </button>
        </div>
      </main>
    </AppLayout>
  );
}
