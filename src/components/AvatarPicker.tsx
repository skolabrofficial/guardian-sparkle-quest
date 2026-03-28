import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ApprovedImage {
  id: string;
  file_url: string;
  file_name: string;
  license_type: string;
}

interface Props {
  onSelect: (url: string) => void;
  onClose: () => void;
}

const db = () => supabase as any;

export default function AvatarPicker({ onSelect, onClose }: Props) {
  const { user } = useAuth();
  const [images, setImages] = useState<ApprovedImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // User can pick from their own approved images that allow usage
      const { data } = await db()
        .from('uploaded_images')
        .select('id, file_url, file_name, license_type')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (data) setImages(data);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="panel-card max-w-lg w-full max-h-[70vh] overflow-y-auto animate-float-in">
        <div className="flex items-center justify-between mb-3">
          <h3 className="mt-0 text-base font-extrabold">🖼️ Vyberte profilový obrázek</h3>
          <button onClick={onClose} className="text-xs font-bold px-2 py-1 rounded-lg bg-muted hover:bg-muted/80">✕</button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Vyberte ze svých schválených obrázků. Obrázky musí být nejprve nahrány a schváleny.</p>

        {loading ? (
          <p className="text-sm text-muted-foreground">Načítání...</p>
        ) : images.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nemáte žádné schválené obrázky. Nahrajte obrázek a počkejte na schválení.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {images.map(img => (
              <button
                key={img.id}
                onClick={() => { onSelect(img.file_url); onClose(); }}
                className="rounded-xl overflow-hidden border-2 border-border hover:border-primary transition-all hover:scale-105 aspect-square"
              >
                <img src={img.file_url} alt={img.file_name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
