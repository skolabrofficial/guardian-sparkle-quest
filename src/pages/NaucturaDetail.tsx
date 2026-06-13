import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { STATUS_INFO, ArticleStatus, allowedTransitions } from '@/lib/articleStatus';
import { computeDiffSnippet } from '@/lib/articleDiff';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ArticleDiffView from '@/components/ArticleDiffView';
import { toast } from 'sonner';

interface Article {
  id: string; title: string; perex: string | null; content: string;
  cover_image: string | null; topic_id: string | null;
  author_id: string | null; author_override: string | null;
  status: ArticleStatus; status_note: string | null;
  rejection_reason: string | null; deleted_reason: string | null;
  flagged_source: string | null; scheduled_for: string | null;
  published_at: string | null; originality_score: number | null;
  originality_notes: string | null; originality_checked_at: string | null;
  created_at: string; updated_at: string;
}
interface Topic { id: string; name: string; symbol: string; color: string; }

const ROLE_BADGE: Record<string, { label: string; bg: string }> = {
  rektor:  { label: 'rektor',   bg: '#254BFF' },
  spravce: { label: 'správce',  bg: '#258B25' },
  lektor:  { label: 'lektor',   bg: '#C0392B' },
  student: { label: 'student',  bg: '#888' },
  editor:  { label: 'redakce',  bg: '#7a4a8a' },
};

export default function NaucturaDetail() {
  const { id } = useParams();
  const { user, isRektor } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const editMode = params.get('edit') === '1';

  const [article, setArticle] = useState<Article | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [authorProfile, setAuthorProfile] = useState<any>(null);
  const [isEditorAccess, setIsEditorAccess] = useState(false);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [statusLog, setStatusLog] = useState<any[]>([]);
  const [origChecks, setOrigChecks] = useState<any[]>([]);
  const [kval, setKval] = useState<any[]>([]);
  const [kvalProfiles, setKvalProfiles] = useState<Record<string, any>>({});
  const [kvalRoles, setKvalRoles] = useState<Record<string, string>>({});
  const [newKval, setNewKval] = useState('');
  const [editForm, setEditForm] = useState<Partial<Article> | null>(null);
  const [transitionPick, setTransitionPick] = useState<{ to: ArticleStatus; needsReason?: boolean } | null>(null);
  const [transitionReason, setTransitionReason] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [origDraft, setOrigDraft] = useState({ score: '', verdict: 'ok', notes: '', sources: '' });
  const [authorOverrideDraft, setAuthorOverrideDraft] = useState('');
  const [changeAuthorUsername, setChangeAuthorUsername] = useState('');

  useEffect(() => { if (id) load(); }, [id]);

  async function load() {
    const sb: any = supabase;
    const [aRes, tRes] = await Promise.all([
      sb.from('articles').select('*').eq('id', id).maybeSingle(),
      sb.from('article_topics').select('*').order('name'),
    ]);
    if (!aRes.data) { toast.error('Článek nenalezen nebo nemáte přístup'); navigate('/nauctura'); return; }
    const art = aRes.data as Article;
    setArticle(art);
    setTopics(tRes.data || []);
    setAuthorOverrideDraft(art.author_override || '');

    if (art.author_id) {
      const { data: p } = await sb.from('profiles').select('user_id, display_name, username, avatar_url').eq('user_id', art.author_id).maybeSingle();
      setAuthorProfile(p);
    }
    if (user) {
      const { data: ed } = await sb.from('article_editors').select('id, topic_id').eq('user_id', user.id);
      const has = (ed || []).some((e: any) => !e.topic_id || e.topic_id === art.topic_id);
      setIsEditorAccess(has || isRektor);
    }

    const [rRes, sRes, oRes, kRes] = await Promise.all([
      sb.from('article_revisions').select('*').eq('article_id', id).order('created_at', { ascending: false }),
      sb.from('article_status_log').select('*').eq('article_id', id).order('created_at', { ascending: false }),
      sb.from('article_originality_checks').select('*').eq('article_id', id).order('created_at', { ascending: false }),
      sb.from('article_kvalitarka').select('*').eq('article_id', id).order('created_at'),
    ]);
    setRevisions(rRes.data || []);
    setStatusLog(sRes.data || []);
    setOrigChecks(oRes.data || []);
    setKval(kRes.data || []);

    const allActorIds = [
      ...(rRes.data || []).map((r: any) => r.editor_id),
      ...(sRes.data || []).map((r: any) => r.actor_id),
      ...(oRes.data || []).map((r: any) => r.checked_by),
      ...(kRes.data || []).map((r: any) => r.author_id),
    ].filter(Boolean);
    if (allActorIds.length) {
      const ids = [...new Set(allActorIds)];
      const [pRes, urRes] = await Promise.all([
        sb.from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', ids),
        sb.from('user_roles').select('user_id, role').in('user_id', ids),
      ]);
      const pm: Record<string, any> = {};
      (pRes.data || []).forEach((p: any) => { pm[p.user_id] = p; });
      setKvalProfiles(pm);
      const { pickHighestRole } = await import('@/lib/rolePriority');
      const rm: Record<string, string> = {};
      ids.forEach(uid => {
        const roles = (urRes.data || []).filter((x: any) => x.user_id === uid).map((x: any) => x.role);
        const best = pickHighestRole(roles);
        if (best) rm[uid] = best;
      });
      setKvalRoles(rm);
    }
  }

  if (!article) return <AppLayout><p className="text-muted-foreground">Načítání…</p></AppLayout>;

  const topic = topics.find(t => t.id === article.topic_id);
  const isAuthor = user?.id === article.author_id;
  const canEdit = isAuthor || isEditorAccess;
  const actorRole = isRektor ? 'rektor' : isEditorAccess ? 'editor' : isAuthor ? 'author' : 'none';
  const transitions = canEdit ? allowedTransitions(article.status, actorRole as any) : [];
  const info = STATUS_INFO[article.status];
  const authorLabel = article.author_override || authorProfile?.display_name || 'Neznámý';

  function startEdit() {
    setEditForm({
      title: article!.title, perex: article!.perex || '', content: article!.content,
      cover_image: article!.cover_image || '', topic_id: article!.topic_id,
    });
    setParams({ edit: '1' });
  }
  function cancelEdit() { setEditForm(null); setParams({}); }

  async function saveEdit() {
    if (!editForm || !user) return;
    const sb: any = supabase;
    const fields: (keyof Article)[] = ['title', 'perex', 'content', 'cover_image', 'topic_id'];
    const revRows: any[] = [];
    for (const f of fields) {
      const oldV = (article as any)[f] ?? '';
      const newV = (editForm as any)[f] ?? '';
      if (String(oldV) !== String(newV)) {
        const snip = computeDiffSnippet(String(oldV), String(newV));
        revRows.push({
          article_id: article!.id, editor_id: user.id, field: f as string,
          old_value: String(oldV), new_value: String(newV),
          ...snip,
        });
      }
    }
    const { error } = await sb.from('articles').update({ ...editForm, updated_at: new Date().toISOString() }).eq('id', article!.id);
    if (error) { toast.error(error.message); return; }
    if (revRows.length) await sb.from('article_revisions').insert(revRows);
    toast.success('Uloženo');
    cancelEdit();
    load();
  }

  async function doTransition() {
    if (!transitionPick || !user) return;
    if (transitionPick.needsReason && transitionReason.trim().length < 3) { toast.error('Zadejte důvod'); return; }
    const sb: any = supabase;
    const patch: any = { status: transitionPick.to, updated_at: new Date().toISOString() };
    if (transitionPick.to === 'published') patch.published_at = new Date().toISOString();
    if (transitionPick.to === 'scheduled') {
      if (!scheduledFor) { toast.error('Vyberte datum a čas'); return; }
      patch.scheduled_for = new Date(scheduledFor).toISOString();
    }
    if (transitionPick.to === 'rejected') patch.rejection_reason = transitionReason;
    if (transitionPick.to === 'flagged_stolen') patch.flagged_source = transitionReason;
    const { error } = await sb.from('articles').update(patch).eq('id', article!.id);
    if (error) { toast.error(error.message); return; }
    await sb.from('article_status_log').insert({
      article_id: article!.id, actor_id: user.id, from_status: article!.status, to_status: transitionPick.to,
      reason: transitionReason || null,
    });
    setTransitionPick(null); setTransitionReason(''); setScheduledFor('');
    toast.success('Stav změněn'); load();
  }

  async function doDelete() {
    if (!user || !isRektor) return;
    if (deleteReason.trim().length < 3) { toast.error('Zadejte důvod smazání'); return; }
    const sb: any = supabase;
    await sb.from('articles').update({ status: 'deleted', deleted_reason: deleteReason }).eq('id', article!.id);
    await sb.from('article_status_log').insert({ article_id: article!.id, actor_id: user.id, from_status: article!.status, to_status: 'deleted', reason: deleteReason });
    toast.success('Smazáno'); setShowDelete(false); load();
  }

  async function postKval(parentId: string | null = null) {
    if (!user || !newKval.trim()) return;
    const sb: any = supabase;
    const { error } = await sb.from('article_kvalitarka').insert({ article_id: article!.id, author_id: user.id, parent_id: parentId, body: newKval.trim() });
    if (error) { toast.error(error.message); return; }
    setNewKval(''); load();
  }

  async function saveOriginality() {
    if (!user) return;
    const sb: any = supabase;
    let sources: any = [];
    try { sources = origDraft.sources ? origDraft.sources.split('\n').filter(Boolean).map(s => ({ url: s })) : []; } catch { /* ignore */ }
    const { error } = await sb.from('article_originality_checks').insert({
      article_id: article!.id, checked_by: user.id, score: origDraft.score ? Number(origDraft.score) : null,
      verdict: origDraft.verdict, notes: origDraft.notes, sources,
    });
    if (error) { toast.error(error.message); return; }
    await sb.from('articles').update({
      originality_score: origDraft.score ? Number(origDraft.score) : null,
      originality_notes: origDraft.notes, originality_checked_at: new Date().toISOString(),
    }).eq('id', article!.id);
    setOrigDraft({ score: '', verdict: 'ok', notes: '', sources: '' });
    toast.success('Originalita zaznamenána'); load();
  }

  async function saveAuthorOverride() {
    if (!canEdit) return;
    const sb: any = supabase;
    const old = article!.author_override || '';
    if (old === authorOverrideDraft) return;
    await sb.from('articles').update({ author_override: authorOverrideDraft || null }).eq('id', article!.id);
    await sb.from('article_revisions').insert({
      article_id: article!.id, editor_id: user!.id, field: 'author_override',
      old_value: old, new_value: authorOverrideDraft, ...computeDiffSnippet(old, authorOverrideDraft),
    });
    toast.success('Vepsaný autor uložen'); load();
  }

  async function changeAuthor() {
    if (!isRektor || !changeAuthorUsername.trim()) return;
    const sb: any = supabase;
    const { data: p } = await sb.from('profiles').select('user_id').eq('username', changeAuthorUsername.trim()).maybeSingle();
    if (!p) { toast.error('Uživatel nenalezen'); return; }
    const oldId = article!.author_id;
    await sb.from('articles').update({ author_id: p.user_id }).eq('id', article!.id);
    await sb.from('article_revisions').insert({
      article_id: article!.id, editor_id: user!.id, field: 'author_id',
      old_value: oldId || '', new_value: p.user_id, note: 'Změna autora rektorem',
    });
    setChangeAuthorUsername(''); toast.success('Autor změněn'); load();
  }

  const statusBadge = (s: ArticleStatus) => {
    const i = STATUS_INFO[s];
    return <span className="px-2 py-0.5 rounded-full font-bold text-xs" style={{ background: i.bg, color: i.color }}>{i.short}</span>;
  };

  return (
    <AppLayout>
      <Link to="/nauctura" className="text-sm text-muted-foreground hover:underline">← zpět do Naučtury</Link>

      <article className="panel-card mt-3" style={{ background: 'linear-gradient(180deg, #fffaf0 0%, #fff 60%)', border: '2px solid #d6c388' }}>
        {topic && <div className="text-xs uppercase tracking-wider font-bold" style={{ color: topic.color }}>{topic.symbol} {topic.name}</div>}
        {!editForm ? (
          <>
            <h1 className="text-4xl mt-2 mb-2" style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 700 }}>{article.title}</h1>
            {article.perex && <p className="text-lg italic text-muted-foreground mb-3">{article.perex}</p>}
            <div className="flex items-center gap-2 text-sm mb-2">
              <span>— <strong>{authorLabel}</strong></span>
              {statusBadge(article.status)}
              {article.published_at && <span className="text-xs text-muted-foreground">vydáno {new Date(article.published_at).toLocaleString('cs')}</span>}
            </div>
            {article.cover_image && <img src={article.cover_image} alt="" className="w-full max-h-96 object-cover rounded-xl my-4" />}
            <div className="mt-4">
              <MarkdownRenderer content={article.content || '*(prázdné)*'} />
            </div>
          </>
        ) : (
          <div className="space-y-3 mt-3">
            <input value={editForm.title || ''} onChange={e => setEditForm({ ...editForm, title: e.target.value })} placeholder="Název" className="w-full border-2 border-border rounded-xl py-2 px-3 text-2xl font-bold bg-card" />
            <textarea value={editForm.perex || ''} onChange={e => setEditForm({ ...editForm, perex: e.target.value })} placeholder="Perex (krátký úvod)" rows={2} className="w-full border-2 border-border rounded-xl py-2 px-3 bg-card italic" />
            <select value={editForm.topic_id || ''} onChange={e => setEditForm({ ...editForm, topic_id: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm bg-card">
              <option value="">— bez tématu —</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.symbol} {t.name}</option>)}
            </select>
            <input value={editForm.cover_image || ''} onChange={e => setEditForm({ ...editForm, cover_image: e.target.value })} placeholder="URL obálky (volitelné)" className="w-full border-2 border-border rounded-xl py-2 px-3 text-sm bg-card" />
            <textarea value={editForm.content || ''} onChange={e => setEditForm({ ...editForm, content: e.target.value })} placeholder="Obsah článku (Markdown, LaTeX)" rows={20} className="w-full border-2 border-border rounded-xl py-3 px-3 font-mono text-sm bg-card" />
            <div className="flex gap-2">
              <button onClick={saveEdit} className="btn-alik-primary">Uložit</button>
              <button onClick={cancelEdit} className="px-4 py-2 rounded-xl border-2 border-border">Zrušit</button>
            </div>
          </div>
        )}
      </article>

      {/* Boční nástroje */}
      {canEdit && !editForm && (
        <div className="panel-card mt-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={startEdit} className="btn-alik-primary text-sm">✎ Upravit</button>
            {transitions.map(tr => (
              <button key={tr.to} onClick={() => { setTransitionPick(tr); setTransitionReason(''); }} className="px-3 py-2 rounded-xl border-2 text-sm font-bold" style={{ borderColor: STATUS_INFO[tr.to].color, color: STATUS_INFO[tr.to].color }}>
                → {tr.label}
              </button>
            ))}
            {isRektor && article.status !== 'deleted' && (
              <button onClick={() => setShowDelete(true)} className="px-3 py-2 rounded-xl border-2 border-destructive text-destructive text-sm font-bold">🗑 Smazat článek</button>
            )}
          </div>

          {transitionPick && (
            <div className="mt-3 p-3 border-2 border-dashed border-border rounded-xl space-y-2">
              <div className="text-sm font-bold">Změna stavu: {STATUS_INFO[transitionPick.to].label}</div>
              {transitionPick.to === 'scheduled' && (
                <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} className="border-2 border-border rounded-lg py-1.5 px-2 text-sm" />
              )}
              <textarea value={transitionReason} onChange={e => setTransitionReason(e.target.value)} placeholder={transitionPick.needsReason ? 'Důvod (povinné)' : 'Poznámka (volitelná)'} rows={2} className="w-full border-2 border-border rounded-lg py-2 px-2 text-sm" />
              <div className="flex gap-2">
                <button onClick={doTransition} className="btn-alik-primary text-sm">Potvrdit</button>
                <button onClick={() => setTransitionPick(null)} className="px-3 py-1.5 rounded-lg border-2 border-border text-sm">Zrušit</button>
              </div>
            </div>
          )}
          {showDelete && (
            <div className="mt-3 p-3 border-2 border-destructive rounded-xl space-y-2">
              <div className="text-sm font-bold text-destructive">Smazat článek</div>
              <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)} placeholder="Důvod smazání (povinné)" rows={2} className="w-full border-2 border-border rounded-lg py-2 px-2 text-sm" />
              <div className="flex gap-2">
                <button onClick={doDelete} className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold">Smazat</button>
                <button onClick={() => setShowDelete(false)} className="px-3 py-1.5 rounded-lg border-2 border-border text-sm">Zrušit</button>
              </div>
            </div>
          )}

          {/* Vepsání autora + změna autora */}
          {canEdit && (
            <div className="mt-4 grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider">Vepsaný autor (přepíše)</label>
                <div className="flex gap-2 mt-1">
                  <input value={authorOverrideDraft} onChange={e => setAuthorOverrideDraft(e.target.value)} placeholder='např. „Tomáš N. & redakce“' className="flex-1 border-2 border-border rounded-lg py-1.5 px-2 text-sm" />
                  <button onClick={saveAuthorOverride} className="btn-alik-primary text-xs">Uložit</button>
                </div>
              </div>
              {isRektor && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider">Změna autora (jen rektor)</label>
                  <div className="flex gap-2 mt-1">
                    <input value={changeAuthorUsername} onChange={e => setChangeAuthorUsername(e.target.value)} placeholder="username nového autora" className="flex-1 border-2 border-border rounded-lg py-1.5 px-2 text-sm" />
                    <button onClick={changeAuthor} className="btn-alik-primary text-xs">Změnit</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Originalita */}
          {isEditorAccess && (
            <div className="mt-4 border-t pt-3">
              <h4 className="font-bold text-sm mb-2">🔍 Ověření originality</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <input type="number" min="0" max="100" value={origDraft.score} onChange={e => setOrigDraft({ ...origDraft, score: e.target.value })} placeholder="Skóre 0–100" className="border-2 border-border rounded-lg py-1.5 px-2 text-sm" />
                <select value={origDraft.verdict} onChange={e => setOrigDraft({ ...origDraft, verdict: e.target.value })} className="border-2 border-border rounded-lg py-1.5 px-2 text-sm">
                  <option value="ok">OK</option>
                  <option value="suspicious">Podezřelé</option>
                  <option value="stolen">Ukradený</option>
                </select>
                <input value={origDraft.notes} onChange={e => setOrigDraft({ ...origDraft, notes: e.target.value })} placeholder="Poznámka" className="border-2 border-border rounded-lg py-1.5 px-2 text-sm col-span-2" />
                <textarea value={origDraft.sources} onChange={e => setOrigDraft({ ...origDraft, sources: e.target.value })} placeholder="Zdroje, jeden URL na řádek" rows={2} className="col-span-2 md:col-span-3 border-2 border-border rounded-lg py-1.5 px-2 text-sm" />
                <button onClick={saveOriginality} className="btn-alik-primary text-xs">Zapsat</button>
              </div>
              {origChecks.length > 0 && (
                <ul className="mt-3 text-xs space-y-1">
                  {origChecks.map(c => (
                    <li key={c.id} className="border border-border rounded-lg p-2">
                      <strong>{c.verdict}</strong> {c.score != null && `(${c.score}%)`} — {kvalProfiles[c.checked_by]?.display_name || '?'} · {new Date(c.created_at).toLocaleString('cs')}
                      {c.notes && <div className="text-muted-foreground">{c.notes}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Protokol změn */}
      {canEdit && (
        <details className="panel-card mt-4">
          <summary className="cursor-pointer font-extrabold">📜 Protokol změn ({revisions.length + statusLog.length})</summary>
          <div className="mt-3 space-y-3">
            {statusLog.map(s => {
              const r = kvalRoles[s.actor_id] || 'editor';
              const badge = ROLE_BADGE[r] || ROLE_BADGE.editor;
              return (
                <div key={s.id} className="border-2 border-border rounded-xl p-3 text-sm">
                  <div className="flex items-center gap-2 mb-1 text-xs">
                    <span className="px-1.5 py-0.5 rounded font-bold text-white" style={{ background: badge.bg }}>{badge.label}</span>
                    <strong>{kvalProfiles[s.actor_id]?.display_name || s.actor_id?.slice(0, 8)}</strong>
                    <span className="text-muted-foreground">změnil stav</span>
                    <span className="text-muted-foreground">· {new Date(s.created_at).toLocaleString('cs')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {s.from_status && statusBadge(s.from_status)} → {statusBadge(s.to_status)}
                  </div>
                  {s.reason && <div className="mt-1 italic text-muted-foreground">„{s.reason}"</div>}
                </div>
              );
            })}
            {revisions.map(r => {
              const role = kvalRoles[r.editor_id] || 'editor';
              const badge = ROLE_BADGE[role] || ROLE_BADGE.editor;
              return (
                <div key={r.id} className="border-2 border-border rounded-xl p-3 text-sm">
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <span className="px-1.5 py-0.5 rounded font-bold text-white" style={{ background: badge.bg }}>{badge.label}</span>
                    <strong>{kvalProfiles[r.editor_id]?.display_name || r.editor_id?.slice(0, 8)}</strong>
                    <span className="text-muted-foreground">upravil</span>
                    <span className="text-muted-foreground">· {new Date(r.created_at).toLocaleString('cs')}</span>
                  </div>
                  <ArticleDiffView
                    field={r.field}
                    before={r.diff_before} oldChunk={r.diff_old} newChunk={r.diff_new} after={r.diff_after}
                    fallbackOld={r.old_value} fallbackNew={r.new_value}
                  />
                  {r.note && <div className="mt-1 italic text-muted-foreground">„{r.note}"</div>}
                </div>
              );
            })}
            {revisions.length + statusLog.length === 0 && <p className="text-muted-foreground text-sm">Zatím žádné záznamy.</p>}
          </div>
        </details>
      )}

      {/* Kvalitárka */}
      {canEdit && (
        <section className="panel-card mt-4" style={{ background: '#f6f1e6', border: '2px solid #c9b27a' }}>
          <h3 className="text-2xl mt-0" style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 700 }}>🗨️ Kvalitárka</h3>
          <p className="text-xs text-muted-foreground mb-3">Diskuse mezi autorem a redakcí pod článkem.</p>
          <div className="space-y-2 mb-3">
            {kval.filter(k => !k.parent_id).map(k => (
              <KvalItem key={k.id} item={k} children={kval.filter(c => c.parent_id === k.id)} profiles={kvalProfiles} roles={kvalRoles} onReload={load} userId={user?.id} isRektor={isRektor} />
            ))}
            {kval.length === 0 && <p className="text-sm text-muted-foreground italic">Zatím žádný příspěvek.</p>}
          </div>
          {user && (
            <div>
              <textarea value={newKval} onChange={e => setNewKval(e.target.value)} placeholder="Napište příspěvek…" rows={3} className="w-full border-2 border-border rounded-xl py-2 px-3 text-sm bg-card" />
              <button onClick={() => postKval(null)} className="btn-alik-primary text-sm mt-2">Odeslat</button>
            </div>
          )}
        </section>
      )}
    </AppLayout>
  );
}

function KvalItem({ item, children, profiles, roles, onReload, userId, isRektor }: any) {
  const sb: any = supabase;
  const [reply, setReply] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [editBody, setEditBody] = useState<string | null>(null);
  const profile = profiles[item.author_id];
  const role = roles[item.author_id] || 'student';
  const badge = ROLE_BADGE[role] || ROLE_BADGE.student;
  const canModify = item.author_id === userId || isRektor;

  async function send() {
    if (!reply.trim()) return;
    await sb.from('article_kvalitarka').insert({ article_id: item.article_id, parent_id: item.id, author_id: userId, body: reply.trim() });
    setReply(''); setShowReply(false); onReload();
  }
  async function saveEdit() {
    if (editBody == null) return;
    await sb.from('article_kvalitarka').update({ body: editBody, edited_at: new Date().toISOString() }).eq('id', item.id);
    setEditBody(null); onReload();
  }
  async function del() {
    if (!confirm('Smazat?')) return;
    await sb.from('article_kvalitarka').update({ is_deleted: true, body: '(smazáno)' }).eq('id', item.id);
    onReload();
  }
  return (
    <div className="border-2 border-border bg-card rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1 text-xs">
        <span className="px-1.5 py-0.5 rounded font-bold text-white" style={{ background: badge.bg }}>{badge.label}</span>
        <strong>{profile?.display_name || '?'}</strong>
        <span className="text-muted-foreground">· {new Date(item.created_at).toLocaleString('cs')}</span>
        {item.edited_at && <span className="text-muted-foreground text-[10px]">(upraveno)</span>}
      </div>
      {editBody != null ? (
        <div>
          <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={2} className="w-full border-2 border-border rounded-lg py-1 px-2 text-sm" />
          <div className="flex gap-1 mt-1">
            <button onClick={saveEdit} className="btn-alik-primary text-xs">Uložit</button>
            <button onClick={() => setEditBody(null)} className="px-2 py-1 rounded-lg border-2 border-border text-xs">Zrušit</button>
          </div>
        </div>
      ) : (
        <p className="text-sm whitespace-pre-wrap">{item.body}</p>
      )}
      <div className="flex gap-3 mt-2 text-xs">
        {userId && <button onClick={() => setShowReply(!showReply)} className="text-muted-foreground hover:text-foreground">↩ Odpovědět</button>}
        {canModify && !item.is_deleted && <button onClick={() => setEditBody(item.body)} className="text-muted-foreground hover:text-foreground">✎ Upravit</button>}
        {canModify && !item.is_deleted && <button onClick={del} className="text-destructive">Smazat</button>}
      </div>
      {showReply && (
        <div className="mt-2">
          <textarea value={reply} onChange={e => setReply(e.target.value)} rows={2} placeholder="Odpověď…" className="w-full border-2 border-border rounded-lg py-1 px-2 text-sm" />
          <button onClick={send} className="btn-alik-primary text-xs mt-1">Odeslat</button>
        </div>
      )}
      {children.length > 0 && (
        <div className="ml-4 mt-3 space-y-2 border-l-2 border-border pl-3">
          {children.map((c: any) => (
            <KvalItem key={c.id} item={c} children={[]} profiles={profiles} roles={roles} onReload={onReload} userId={userId} isRektor={isRektor} />
          ))}
        </div>
      )}
    </div>
  );
}
