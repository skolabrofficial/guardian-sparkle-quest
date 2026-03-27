import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const CC_LICENSES = [
  { value: 'personal', label: 'Jen pro své použití' },
  { value: 'university', label: 'Pro všechny na univerzitě' },
  { value: 'CC0', label: 'CC0 — Bez autorských práv' },
  { value: 'CC-BY', label: 'CC BY — Uveďte autora' },
  { value: 'CC-BY-SA', label: 'CC BY-SA — Uveďte autora, zachovejte licenci' },
  { value: 'CC-BY-NC', label: 'CC BY-NC — Uveďte autora, neužívejte komerčně' },
  { value: 'CC-BY-NC-SA', label: 'CC BY-NC-SA — Uveďte autora, nekomerčně, zachovejte' },
  { value: 'CC-BY-ND', label: 'CC BY-ND — Uveďte autora, nezpracovávejte' },
  { value: 'CC-BY-NC-ND', label: 'CC BY-NC-ND — Uveďte autora, nekomerčně, nezpracovávejte' },
];

interface Props {
  isAvatar?: boolean;
  onUploaded?: (imageId: string) => void;
}

export default function ImageUploader({ isAvatar = false, onUploaded }: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [license, setLicense] = useState('personal');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error('Max 5 MB'); return; }
    if (!f.type.startsWith('image/')) { toast.error('Pouze obrázky'); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: storageErr } = await supabase.storage.from('uploads').upload(path, file);
      if (storageErr) throw storageErr;
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path);

      const { data, error } = await supabase.from('uploaded_images').insert({
        user_id: user.id,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        author_name: authorName,
        source_url: sourceUrl,
        license_type: license,
        is_avatar: isAvatar,
        status: 'pending',
      } as any).select().single();

      if (error) throw error;
      toast.success('Obrázek nahrán a čeká na schválení');
      onUploaded?.(data.id);
      setFile(null); setPreview(null); setAuthorName(''); setSourceUrl(''); setLicense('personal');
    } catch (err: any) {
      toast.error(err.message || 'Chyba při nahrávání');
    }
    setUploading(false);
  };

  return (
    <div className="panel-card animate-float-in">
      <h4 className="mt-0 text-sm font-extrabold">📤 Nahrát obrázek {isAvatar && '(profilový)'}</h4>
      <p className="text-xs text-muted-foreground mb-3">Obrázek projde kontrolou před zobrazením. Po schválení obdržíte kód pro vložení.</p>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      {!file ? (
        <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-border rounded-2xl py-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
          <span className="text-3xl block mb-2">🖼️</span>
          <span className="text-sm text-muted-foreground">Klikněte pro výběr obrázku</span>
        </button>
      ) : (
        <div className="grid gap-3">
          {preview && (
            <div className="relative rounded-xl overflow-hidden border border-border">
              <img src={preview} alt="Náhled" className="w-full max-h-48 object-contain bg-muted/30" />
              <button onClick={() => { setFile(null); setPreview(null); }} className="absolute top-2 right-2 text-xs font-bold bg-destructive text-white px-2 py-1 rounded-lg">✕</button>
            </div>
          )}
          <div className="text-xs text-muted-foreground">{file.name} — {(file.size / 1024).toFixed(0)} KB</div>

          <div className="grid gap-2">
            <input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="Autor obrázku" className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card focus:border-primary transition-colors" />
            <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="Odkaz na původ (URL)" className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card focus:border-primary transition-colors" />
            <select value={license} onChange={e => setLicense(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card focus:border-primary transition-colors">
              {CC_LICENSES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>

          <button onClick={handleUpload} disabled={uploading} className="btn-alik-primary text-sm w-full">
            {uploading ? '⏳ Nahrávání...' : '📤 Nahrát ke kontrole'}
          </button>
        </div>
      )}
    </div>
  );
}
