import { useEffect, useState, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ImageUploader from '@/components/ImageUploader';
import AvatarPicker from '@/components/AvatarPicker';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { getRoleSymbol, ROLE_LABELS, ROLE_COLORS } from '@/lib/roleUtils';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const db = () => supabase as any;

interface UploadedImage {
  id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  status: string;
  embed_code: string | null;
  rejection_reason: string | null;
  rejection_details: string | null;
  license_type: string;
  author_name: string;
  is_avatar: boolean;
  created_at: string;
}

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
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [authLoading, user]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarUrl(profile.avatar_url || null);
    }
    if (user) {
      loadBio();
      loadImages();
    }
  }, [profile, user]);

  const loadBio = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('bio').eq('user_id', user.id).single();
    if (data?.bio) setBio(data.bio);
  };

  const loadImages = async () => {
    if (!user) return;
    setLoadingImages(true);
    const { data } = await db().from('uploaded_images').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setImages(data);
    setLoadingImages(false);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ display_name: displayName, bio, avatar_url: avatarUrl }).eq('user_id', user.id);
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

  const deleteImage = async (img: UploadedImage) => {
    if (!confirm('Opravdu smazat tento obrázek?')) return;
    const { error } = await db().from('uploaded_images').delete().eq('id', img.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Obrázek smazán');
    setImages(prev => prev.filter(i => i.id !== img.id));
  };

  const copyEmbedCode = (code: string) => {
    navigator.clipboard.writeText(`(vlož ${code})`);
    toast.success('Kód zkopírován do schránky');
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-emerald-500/90 text-white border-0 text-[10px]">✅ Schváleno</Badge>;
      case 'rejected': return <Badge className="bg-red-500/90 text-white border-0 text-[10px]">❌ Zamítnuto</Badge>;
      default: return <Badge className="bg-amber-500/90 text-white border-0 text-[10px]">⏳ Čeká na kontrolu</Badge>;
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Načítání...</div>;

  return (
    <AppLayout>
      <main className="max-w-2xl mx-auto space-y-6">
        {/* Profile card */}
        <div className="panel-card animate-float-in">
          <h2 className="mt-0 text-xl">👤 Můj profil</h2>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-5">
            <div
              className="w-20 h-20 rounded-2xl border-2 border-border overflow-hidden cursor-pointer flex items-center justify-center transition-transform duration-200 hover:scale-105"
              style={{ background: avatarUrl ? `url(${avatarUrl}) center/cover` : 'linear-gradient(180deg, #8fd3ff, #3f87ff)' }}
              onClick={() => setShowAvatarPicker(true)}
            >
              {!avatarUrl && <span className="text-3xl text-white font-extrabold">{displayName?.[0]?.toUpperCase() || '?'}</span>}
            </div>
            <div className="grid gap-1.5">
              <button onClick={() => setShowAvatarPicker(true)} className="btn-alik-outline text-xs">
                🖼️ Vybrat z obrázků
              </button>
              {avatarUrl && <button onClick={removeAvatar} className="text-xs text-destructive font-bold">Odebrat avatar</button>}
            </div>
          </div>

          {showAvatarPicker && (
            <AvatarPicker
              onSelect={(url) => { setAvatarUrl(url); toast.success('Avatar vybrán (uložte profil)'); }}
              onClose={() => setShowAvatarPicker(false)}
            />
          )}

          {/* Role badge */}
          <div className="mb-4">
            <span className="text-xs font-extrabold px-3 py-1 rounded-full text-white" style={{ background: ROLE_COLORS[role || 'student'] }}>
              {ROLE_LABELS[role || 'student']}{getRoleSymbol(role)}
            </span>
          </div>

          {/* Name */}
          <div className="grid gap-1.5 mb-4">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Zobrazované jméno</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="border-2 border-border rounded-xl py-2.5 px-3 text-base outline-none bg-card focus:border-secondary transition-colors"
              placeholder="Vaše jméno"
            />
          </div>

          {/* Bio with MD preview */}
          <div className="grid gap-1.5 mb-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bio (podporuje Markdown + LaTeX)</label>
              <button
                onClick={() => setPreviewBio(!previewBio)}
                className="text-xs font-bold px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                {previewBio ? '✏ Upravit' : '👁 Náhled'}
              </button>
            </div>
            {previewBio ? (
              <div className="border-2 border-accent/30 rounded-xl p-3 min-h-[120px] bg-card">
                <MarkdownRenderer content={bio} />
              </div>
            ) : (
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                className="border-2 border-border rounded-xl py-2.5 px-3 text-sm outline-none bg-card focus:border-secondary min-h-[120px] resize-y font-mono transition-colors"
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

        {/* Image Uploader */}
        <ImageUploader onUploaded={() => loadImages()} />

        {/* My Images Gallery */}
        <div className="panel-card animate-float-in">
          <h4 className="mt-0 text-sm font-extrabold">🖼️ Moje obrázky</h4>

          {loadingImages ? (
            <p className="text-xs text-muted-foreground">Načítání...</p>
          ) : images.length === 0 ? (
            <p className="text-xs text-muted-foreground">Zatím nemáte žádné nahrané obrázky.</p>
          ) : (
            <div className="grid gap-3">
              {images.map(img => (
                <div key={img.id} className="flex gap-3 p-3 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-border flex-shrink-0">
                    <img src={img.file_url} alt={img.file_name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 grid gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold truncate">{img.file_name}</span>
                      {statusBadge(img.status)}
                      {img.is_avatar && <Badge className="bg-blue-500/80 text-white border-0 text-[10px]">Avatar</Badge>}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {img.license_type} · {(img.file_size / 1024).toFixed(0)} KB · {new Date(img.created_at).toLocaleDateString('cs-CZ')}
                    </span>

                    {img.status === 'approved' && img.embed_code && (
                      <button
                        onClick={() => copyEmbedCode(img.embed_code!)}
                        className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded-lg w-fit hover:bg-accent transition-colors cursor-pointer"
                      >
                        📋 (vlož {img.embed_code})
                      </button>
                    )}

                    {img.status === 'rejected' && img.rejection_reason && (
                      <span className="text-[10px] text-destructive">Důvod: {img.rejection_reason}</span>
                    )}
                  </div>

                  {(img.status === 'pending' || img.status === 'rejected') && (
                    <button
                      onClick={() => deleteImage(img)}
                      className="text-xs text-destructive font-bold self-start hover:underline flex-shrink-0"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </AppLayout>
  );
}
