import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface ContentBlock {
  id: string;
  page_path: string;
  title: string;
  content: string;
  style_preset: string;
  custom_css: string | null;
  position: string;
  sort_order: number;
  is_active: boolean;
  link_url: string | null;
  link_text: string | null;
  image_url: string | null;
}

const PRESET_STYLES: Record<string, { bg: string; border: string; titleColor: string; shadow: string }> = {
  announcement: {
    bg: 'linear-gradient(135deg, #fffbe8 0%, #fff7cc 100%)',
    border: '2px solid #e8d44d',
    titleColor: '#8b6914',
    shadow: '0 4px 16px rgba(232,212,77,0.18)',
  },
  contest: {
    bg: 'radial-gradient(farthest-corner at 45px 45px, rgba(255,247,192,1), rgba(255,255,208,0.3))',
    border: '2px solid gold',
    titleColor: '#0068bc',
    shadow: '0 4px 16px rgba(255,224,0,0.22), 0 0 0.75em rgba(142,178,41,0.15) inset',
  },
  joke: {
    bg: 'linear-gradient(135deg, #f7e8fe 0%, #f0d4ff 100%)',
    border: '2px solid #b44aee',
    titleColor: '#7c3aed',
    shadow: '0 4px 16px rgba(187,68,238,0.15)',
  },
  article: {
    bg: 'linear-gradient(180deg, rgba(230,246,174,0.9) 0%, rgba(255,255,255,0.85) 100%)',
    border: '2px solid #8ac926',
    titleColor: '#3d6b00',
    shadow: '0 4px 16px rgba(138,201,38,0.15)',
  },
  promo: {
    bg: 'linear-gradient(135deg, #cfe1ff 0%, #e8f0ff 100%)',
    border: '2px solid #3388dd',
    titleColor: '#1a5aa0',
    shadow: '0 4px 16px rgba(51,136,221,0.15)',
  },
  warning: {
    bg: 'linear-gradient(135deg, #fde8e8 0%, #fff0f0 100%)',
    border: '2px solid #ef4444',
    titleColor: '#991b1b',
    shadow: '0 4px 16px rgba(239,68,68,0.15)',
  },
  custom: {
    bg: 'hsl(var(--muted))',
    border: '2px solid hsl(var(--border))',
    titleColor: 'hsl(var(--foreground))',
    shadow: '0 4px 16px rgba(0,0,0,0.06)',
  },
};

interface Props {
  position?: 'top' | 'bottom' | 'sidebar';
}

export default function ContentBlocks({ position = 'top' }: Props) {
  const location = useLocation();
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);

  useEffect(() => {
    supabase
      .from('content_blocks')
      .select('*')
      .eq('is_active', true)
      .eq('position', position)
      .order('sort_order')
      .then(({ data }) => {
        if (data) setBlocks(data as ContentBlock[]);
      });
  }, [position]);

  const matchingBlocks = blocks.filter(b => {
    if (b.page_path === location.pathname) return true;
    if (b.page_path === '*') return true;
    if (b.page_path.endsWith('*') && location.pathname.startsWith(b.page_path.slice(0, -1))) return true;
    return false;
  });

  if (matchingBlocks.length === 0) return null;

  return (
    <div className="grid gap-4 mb-5 animate-fade-in">
      {matchingBlocks.map(block => {
        const preset = PRESET_STYLES[block.style_preset] || PRESET_STYLES.custom;
        return (
          <div key={block.id}>
            {block.custom_css && (
              <style dangerouslySetInnerHTML={{ __html: block.custom_css }} />
            )}
            <div
              className="rounded-2xl p-5 transition-all duration-300 hover:scale-[1.005]"
              style={{
                background: preset.bg,
                border: preset.border,
                boxShadow: preset.shadow,
              }}
            >
              <div className={`flex gap-4 ${block.image_url ? 'flex-col sm:flex-row' : ''}`}>
                {block.image_url && (
                  <div className="shrink-0">
                    <img
                      src={block.image_url}
                      alt={block.title}
                      className="rounded-xl object-cover w-full sm:w-[160px] sm:h-[120px]"
                      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                    />
                  </div>
                )}
                <div className="flex-1">
                  {block.title && (
                    <h3
                      className="mt-0 mb-2 text-lg font-extrabold"
                      style={{ color: preset.titleColor }}
                    >
                      {block.title}
                    </h3>
                  )}
                  {block.content && (
                    <div className="text-sm leading-relaxed">
                      <MarkdownRenderer content={block.content} />
                    </div>
                  )}
                  {block.link_url && (
                    <a
                      href={block.link_url}
                      className="inline-block mt-3 px-4 py-1.5 rounded-lg text-sm font-bold text-white no-underline transition-all hover:brightness-110 hover:shadow-md"
                      style={{
                        background: preset.titleColor,
                        boxShadow: '0.1em 0.1em 0.25em rgba(0,0,0,0.12)',
                      }}
                    >
                      {block.link_text || 'Více →'}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { PRESET_STYLES };
