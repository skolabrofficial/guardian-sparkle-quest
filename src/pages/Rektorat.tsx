import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ImageModeration from '@/components/ImageModeration';
import ImageUploader from '@/components/ImageUploader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { nameWithRole, getRoleSymbol, ROLE_COLORS, ROLE_LABELS } from '@/lib/roleUtils';
import ChangeHistory, { recordHistory } from '@/components/ChangeHistory';
import { invalidateProfanityCache } from '@/hooks/useProfanityFilter';
import AdminSearch from '@/components/AdminSearch';
// RektoratBoard removed — toggle now lives in AppNav
import ChangelogPanel from '@/components/ChangelogPanel';
import UserLink from '@/components/UserLink';
import { ProtokolFromAudit } from '@/components/Protokol';

type Tab = 'prehled' | 'kurzy' | 'lektori' | 'studenti' | 'fakulty' | 'rozvrh' | 'dotazy' | 'vypisky' | 'oznameni' | 'reporty' | 'audit' | 'nastaveni' | 'notifikace' | 'role' | 'statistiky' | 'rozpocet' | 'smernice' | 'zpravy' | 'zadosti' | 'kvalita' | 'export' | 'import' | 'hromadne' | 'harmonogram' | 'bezpecnost' | 'klubovny' | 'kapacity' | 'mentori' | 'plany' | 'hodnoceni' | 'blokace' | 'forum' | 'emailove-sablony' | 'integrace' | 'obrazky' | 'odeslat-notifikaci' | 'styly-stranek' | 'obsahove-boxy' | 'filtr-slov' | 'hledani' | 'mezirozpravy';

const tabGroups: { group: string; items: { key: Tab; label: string; icon: string }[] }[] = [
  { group: '📊 Přehled', items: [
    { key: 'prehled', label: 'Dashboard', icon: '📊' },
    { key: 'hledani', label: 'Hledání', icon: '🔍' },
    { key: 'statistiky', label: 'Statistiky', icon: '📈' },
    { key: 'kvalita', label: 'Kvalita', icon: '✅' },
  ]},
  { group: '👥 Uživatelé', items: [
    { key: 'studenti', label: 'Studenti', icon: '🎓' },
    { key: 'lektori', label: 'Lektoři', icon: '👨‍🏫' },
    { key: 'mentori', label: 'Mentoři', icon: '🤝' },
    { key: 'uzivatele', label: 'Všichni uživatelé', icon: '👥' },
    { key: 'role', label: 'Práva', icon: '🔑' },
    { key: 'blokace', label: 'Blokace', icon: '🚫' },
  ]},
  { group: '📚 Výuka', items: [
    { key: 'kurzy', label: 'Kurzy', icon: '📚' },
    { key: 'fakulty', label: 'Fakulty', icon: '🏛' },
    { key: 'rozvrh', label: 'Rozvrh', icon: '📅' },
    { key: 'dotazy', label: 'Doučování', icon: '❓' },
    { key: 'vypisky', label: 'Výpisky', icon: '📝' },
    { key: 'forum', label: 'Fórum', icon: '💬' },
    { key: 'kapacity', label: 'Kapacity', icon: '👥' },
    { key: 'plany', label: 'Plány', icon: '🗺' },
    { key: 'hodnoceni', label: 'Hodnocení', icon: '⭐' },
  ]},
  { group: '📢 Komunikace', items: [
    { key: 'oznameni', label: 'Oznámení', icon: '📢' },
    { key: 'notifikace', label: 'Přehled notifikací', icon: '🔔' },
    { key: 'odeslat-notifikaci', label: 'Odeslat notifikaci', icon: '📨' },
    { key: 'mezirozpravy', label: 'Mezirozpravy', icon: '📨' },
    { key: 'zpravy', label: 'Zprávy Alíkovi', icon: '✉' },
    { key: 'emailove-sablony', label: 'E-mail šablony', icon: '📧' },
  ]},
  { group: '🖼️ Média', items: [
    { key: 'obrazky', label: 'Moderace obrázků', icon: '🖼️' },
  ]},
  { group: '🎨 Vzhled', items: [
    { key: 'obsahove-boxy', label: 'Obsahové boxy', icon: '📦' },
    { key: 'styly-stranek', label: 'Styly stránek', icon: '🎨' },
  ]},
  { group: '⚙ Systém', items: [
    { key: 'reporty', label: 'Hlášení', icon: '⚠' },
    { key: 'audit', label: 'Audit log', icon: '📋' },
    { key: 'zmenar', label: 'Změnář', icon: '📝' },
    { key: 'filtr-slov', label: 'Filtr slov', icon: '🤬' },
    { key: 'bezpecnost', label: 'Bezpečnost', icon: '🛡' },
    { key: 'rozpocet', label: 'Rozpočet', icon: '💰' },
    { key: 'smernice', label: 'Směrnice', icon: '📜' },
    { key: 'zadosti', label: 'Žádosti', icon: '📩' },
    { key: 'harmonogram', label: 'Harmonogram', icon: '🗓' },
    { key: 'klubovny', label: 'Klubovny', icon: '🏠' },
    { key: 'export', label: 'Export', icon: '📤' },
    { key: 'import', label: 'Import', icon: '📥' },
    { key: 'hromadne', label: 'Hromadné', icon: '⚡' },
    { key: 'integrace', label: 'Integrace', icon: '🔗' },
    { key: 'nastaveni', label: 'Konfigurace', icon: '⚙' },
  ]},
];

const allTabs = tabGroups.flatMap(g => g.items);

export default function Rektorat() {
  const { user, isStaff, isDeveloper, isLektor, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const t = searchParams.get('tab') as Tab | null;
    return (t && allTabs.find(x => x.key === t)) ? t : 'prehled';
  });
  const [courses, setCourses] = useState<any[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Načítání...</div>;

  return (
    <AppLayout searchLabel="Rektorát" searchPlaceholder="Hledat v rektorátu..." searchTags={['kurzy', 'uživatelé', 'blokace']}>
      
      <main className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        {/* Sidebar */}
        <aside className="panel-card !p-3 sticky top-4 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-extrabold text-foreground">🏛 Rektorát</h3>
            <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{allTabs.length}</span>
          </div>
          {tabGroups.map(g => (
            <div key={g.group} className="mb-3">
              <p className="text-[10px] font-extrabold uppercase text-muted-foreground px-1 mb-1">{g.group}</p>
              <div className="grid gap-1">
                {g.items.map(item => (
                  <button
                    key={item.key}
                    onClick={() => {
                      if (item.key === 'mezirozpravy') {
                        navigate('/rektorat/mezirozpravy');
                      } else {
                        setActiveTab(item.key);
                        navigate(`/rektorat?tab=${item.key}`);
                      }
                    }}
                    className={`text-left px-2 py-1.5 rounded text-xs font-semibold transition-all ${
                      activeTab === item.key
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Content */}
        <section className="panel-card min-h-screen">
          <p className="text-muted-foreground text-sm">Tab: <strong>{activeTab}</strong></p>
        </section>
      </main>
    </AppLayout>
  );
}
