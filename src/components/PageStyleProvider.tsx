import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function PageStyleProvider() {
  const location = useLocation();
  const [styles, setStyles] = useState<{ page_path: string; css_content: string; class_name: string | null }[]>([]);

  useEffect(() => {
    supabase.from('page_styles').select('page_path, css_content, class_name').eq('is_active', true)
      .then(({ data }) => { if (data) setStyles(data); });
  }, []);

  // Find matching style for current path
  const match = styles.find(s => {
    if (s.page_path === location.pathname) return true;
    if (s.page_path.endsWith('*') && location.pathname.startsWith(s.page_path.slice(0, -1))) return true;
    return false;
  });

  useEffect(() => {
    // Add/remove class from body
    const prev = document.body.dataset.pageClass;
    if (prev) document.body.classList.remove(prev);
    if (match?.class_name) {
      document.body.classList.add(match.class_name);
      document.body.dataset.pageClass = match.class_name;
    }
    return () => {
      if (match?.class_name) document.body.classList.remove(match.class_name);
    };
  }, [match?.class_name, location.pathname]);

  if (!match?.css_content) return null;

  return <style dangerouslySetInnerHTML={{ __html: match.css_content }} />;
}
