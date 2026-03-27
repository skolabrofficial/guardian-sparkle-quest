import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { nameWithRole } from '@/lib/roleUtils';

const REJECTION_REASONS = [
  'Nevhodný obsah',
  'Porušení autorských práv',
  'Pornografický nebo sexuální obsah',
  'Násilí nebo grafický obsah',
  'Nenávistný projev',
  'Spam nebo reklama',
  'Nízká kvalita / rozmazaný obrázek',
  'Obsahuje osobní údaje',
  'Obrázek je příliš malý',
  'Obrázek nesouvisí s účelem',
  'Duplicitní nahrání',
  'Falešný nebo manipulovaný obsah',
  'Porušení pravidel komunity',
  'Nevhodné pro děti',
  'Obsahuje vodoznak třetí strany',
  'Nesprávný formát souboru',
  'Chybí informace o autorovi',
  'Nesprávná licence',
  'Obrázek je zavádějící',
  'Jiný důvod (upřesněte)',
];

const LICENSE_LABELS: Record<string, string> = {
  personal: 'Jen pro své použití',
  university: 'Pro všechny na univerzitě',
  'CC0': 'CC0',
  'CC-BY': 'CC BY',
  'CC-BY-SA': 'CC BY-SA',
  'CC-BY-NC': 'CC BY-NC',
  'CC-BY-NC-SA': 'CC BY-NC-SA',
  'CC-BY-ND': 'CC BY-ND',
  'CC-BY-NC-ND': 'CC BY-NC-ND',
};

function generateEmbedCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return `(vlož ${result})`;
}

// Bypass strict typing for tables not yet in generated types
const db = () => supabase as any;

interface Props {
  profiles?: any[];
  roles?: any[];
}

export default function ImageModeration({ profiles = [], roles = [] }: Props) {
  const { user } = useAuth();
  const [images, setImages] = useState<any[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionDetails, setRejectionDetails] = useState('');
  const [editField, setEditField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const loadImages = async () => {
    let q = db().from('uploaded_images').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    if (data) setImages(data);
  };

  useEffect(() => { loadImages(); }, [filter]);

  useEffect(() => {
    const channel = supabase.channel('image-moderation')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'uploaded_images' }, () => loadImages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [filter]);

  const getUserName = (userId: string) => {
    const p = profiles.find((p: any) => p.user_id === userId);
    const r = roles.find((r: any) => r.user_id === userId);
    return nameWithRole(p?.display_name || userId?.slice(0, 8) || '—', r?.role);
  };

  const approveImage = async (img: any) => {
    if (!user) return;
    const code = generateEmbedCode();
    await db().from('uploaded_images').update({
      status: 'approved', embed_code: code, reviewed_by: user.id, reviewed_at: new Date().toISOString(),
    }).eq('id', img.id);
    toast.success(`Schváleno! Kód: ${code}`);
    await supabase.from('notifications').insert({
      user_id: img.user_id,
      title: '🖼️ Obrázek schválen',
      message: `Váš obrázek "${img.file_name}" byl schválen. Kód pro vložení: ${code}`,
    });
    loadImages();
    setSelectedImage(null);
  };

  const rejectImage = async (img: any) => {
    if (!user || !rejectionReason) { toast.error('Vyberte důvod zamítnutí'); return; }
    await db().from('uploaded_images').update({
      status: 'rejected', rejection_reason: rejectionReason, rejection_details: rejectionDetails || null,
      reviewed_by: user.id, reviewed_at: new Date().toISOString(),
    }).eq('id', img.id);
    toast.success('Obrázek zamítnut');
    await supabase.from('notifications').insert({
      user_id: img.user_id,
      title: '🖼️ Obrázek zamítnut',
      message: `Váš obrázek "${img.file_name}" byl zamítnut. Důvod: ${rejectionReason}${rejectionDetails ? ` — ${rejectionDetails}` : ''}`,
    });
    setRejectionReason(''); setRejectionDetails('');
    loadImages();
    setSelectedImage(null);
  };

  const googleImage = (url: string) => {
    window.open(`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}`, '_blank');
  };

  const updateImageField = async (imgId: string, field: string, value: string) => {
    await db().from('uploaded_images').update({ [field]: value }).eq('id', imgId);
    toast.success('Aktualizováno');
    loadImages();
    setEditField(null);
  };

  const markGoogleMatch = async (imgId: string, found: boolean, url?: string) => {
    await db().from('uploaded_images').update({ google_match_found: found, google_match_url: url || null }).eq('id', imgId);
    toast.success(found ? 'Shoda označena' : 'Shoda odstraněna');
    loadImages();
  };

  const statusColors: Record<string, string> = { pending: 'hsl(var(--chart-4))', approved: 'hsl(var(--chart-2))', rejected: 'hsl(var(--destructive))' };
  const statusLabels: Record<string, string> = { pending: '⏳ Čeká', approved: '✅ Schváleno', rejected: '❌ Zamítnuto' };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="mt-0 text-lg font-extrabold">🖼️ Moderace obrázků</h3>
        <div className="flex gap-1">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${filter === f ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted hover:bg-muted/80'}`}>
              {f === 'pending' ? '⏳ Čekající' : f === 'approved' ? '✅ Schválené' : f === 'rejected' ? '❌ Zamítnuté' : '📋 Vše'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {images.map((img: any) => (
          <div key={img.id} onClick={() => setSelectedImage(img)} className="rounded-2xl border-2 border-border overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all bg-card group">
            <div className="relative h-36 overflow-hidden bg-muted/30">
              <img src={img.file_url} alt={img.file_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              {img.google_match_found && <div className="absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded-lg bg-accent text-accent-foreground">🔍 Shoda</div>}
              {img.is_avatar && <div className="absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-lg bg-secondary text-secondary-foreground">👤 Avatar</div>}
            </div>
            <div className="p-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold truncate max-w-[60%]">{img.file_name}</span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full text-primary-foreground" style={{ background: statusColors[img.status] }}>
                  {statusLabels[img.status] || img.status}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{getUserName(img.user_id)} • {new Date(img.created_at).toLocaleDateString('cs')}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{LICENSE_LABELS[img.license_type] || img.license_type}</div>
            </div>
          </div>
        ))}
      </div>
      {images.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Žádné obrázky v této kategorii.</p>}

      {selectedImage && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <div className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="relative">
              <img src={selectedImage.file_url} alt={selectedImage.file_name} className="w-full max-h-64 object-contain bg-muted/30 rounded-t-2xl" />
              <button onClick={() => setSelectedImage(null)} className="absolute top-3 right-3 bg-destructive text-destructive-foreground font-bold w-8 h-8 rounded-full flex items-center justify-center">✕</button>
            </div>
            <div className="p-5 grid gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-base font-extrabold mt-0">{selectedImage.file_name}</h4>
                  <p className="text-xs text-muted-foreground">Nahrál: {getUserName(selectedImage.user_id)} • {new Date(selectedImage.created_at).toLocaleString('cs')}</p>
                </div>
                <span className="text-xs font-extrabold px-3 py-1 rounded-full text-primary-foreground" style={{ background: statusColors[selectedImage.status] }}>
                  {statusLabels[selectedImage.status]}
                </span>
              </div>

              {selectedImage.google_match_found && (
                <div className="rounded-xl p-3 text-sm bg-accent/20 border-l-4 border-accent">
                  🔍 <strong>Google nalezl shodu!</strong> {selectedImage.google_match_url && <a href={selectedImage.google_match_url} target="_blank" rel="noopener" className="underline ml-1">Zobrazit</a>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { key: 'author_name', label: 'Autor', value: selectedImage.author_name },
                  { key: 'source_url', label: 'Zdroj', value: selectedImage.source_url },
                  { key: 'license_type', label: 'Licence', value: LICENSE_LABELS[selectedImage.license_type] || selectedImage.license_type },
                  { key: 'mime_type', label: 'Typ', value: selectedImage.mime_type },
                ].map(({ key, label, value }) => (
                  <div key={key}>
                    <span className="text-xs font-bold text-muted-foreground uppercase">{label}</span>
                    {editField === key ? (
                      <div className="flex gap-1 mt-1">
                        <input value={editValues[key] || ''} onChange={e => setEditValues({ ...editValues, [key]: e.target.value })} className="border rounded-lg px-2 py-1 text-xs flex-1 outline-none" />
                        <button onClick={() => updateImageField(selectedImage.id, key, editValues[key] || '')} className="text-xs font-bold px-2 py-1 rounded-lg bg-primary text-primary-foreground">✓</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs">{value || '—'}</span>
                        <button onClick={() => { setEditField(key); setEditValues({ ...editValues, [key]: value || '' }); }} className="text-xs opacity-50 hover:opacity-100">✏️</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selectedImage.embed_code && (
                <div className="rounded-xl p-3 text-sm bg-accent/10 border-l-4 border-accent">
                  <span className="font-bold">Kód pro vložení:</span>
                  <code className="ml-2 bg-muted px-2 py-0.5 rounded font-mono text-xs">{selectedImage.embed_code}</code>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                {(selectedImage.file_size / 1024).toFixed(0)} KB • {selectedImage.is_avatar ? '👤 Profilový obrázek' : '🖼️ Běžný obrázek'}
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => googleImage(selectedImage.file_url)} className="text-xs font-bold px-3 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                  🔍 Googlovat obrázek
                </button>
                <button onClick={() => markGoogleMatch(selectedImage.id, !selectedImage.google_match_found)} className="text-xs font-bold px-3 py-2 rounded-xl bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">
                  {selectedImage.google_match_found ? '❌ Zrušit shodu' : '✅ Označit shodu'}
                </button>
                <a href={selectedImage.file_url} target="_blank" rel="noopener" className="text-xs font-bold px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
                  🔗 Otevřít originál
                </a>
              </div>

              {selectedImage.status === 'pending' && (
                <div className="grid gap-3 mt-2">
                  <button onClick={() => approveImage(selectedImage)} className="btn-alik-primary text-sm w-full py-3">✅ Schválit obrázek</button>
                  <div className="border-2 border-destructive/30 rounded-xl p-3">
                    <h5 className="text-xs font-extrabold text-destructive mb-2">Zamítnout:</h5>
                    <select value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="border-2 border-destructive/20 rounded-xl py-2 px-3 text-xs outline-none w-full mb-2">
                      <option value="">Vyberte důvod...</option>
                      {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {rejectionReason === 'Jiný důvod (upřesněte)' && (
                      <input value={rejectionDetails} onChange={e => setRejectionDetails(e.target.value)} placeholder="Upřesněte důvod..." className="border-2 border-destructive/20 rounded-xl py-2 px-3 text-xs outline-none w-full mb-2" />
                    )}
                    <button onClick={() => rejectImage(selectedImage)} disabled={!rejectionReason} className="text-xs font-bold px-4 py-2 rounded-xl bg-destructive text-destructive-foreground w-full disabled:opacity-50">
                      ❌ Zamítnout
                    </button>
                  </div>
                </div>
              )}

              {selectedImage.status === 'rejected' && selectedImage.rejection_reason && (
                <div className="rounded-xl p-3 text-sm bg-destructive/10 border-l-4 border-destructive">
                  <strong>Důvod zamítnutí:</strong> {selectedImage.rejection_reason}
                  {selectedImage.rejection_details && <p className="text-xs mt-1">{selectedImage.rejection_details}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
