import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { STATUS_INFO, ArticleStatus, allowedTransitions } from '@/lib/articleStatus';
import { computeDiffSnippet } from '@/lib/articleDiff';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ArticleDiffView from '@/components/ArticleDiffView';
import Protokol, { actionToDruh, roleToAutorita, FIELD_LABELS } from '@/components/Protokol';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Article {
  id: string; title: string; perex: string | null; content: string;
  cover_image: string | null; topic_id: string | null;
  author_id: string | null; author_override: string | null;
  status: ArticleStatus; status_note: string | null;
  rejection_reason: string | null; deleted_reason: string | null;
  flagged_source: string | null; scheduled_for: string | null;
  published_at: string | null; originality_score: number | null;
  originality_notes: string | null; originality_checked_at: string | null;
  is_featured: boolean; featured_until: string | null;
  taken_by: string | null; taken_at: string | null;
  theft_source: string | null; rating: number | null;
  created_at: string; updated_at: string;
}
interface Topic { id: string; name: string; symbol: string; color: string; }

export default function NaucturaDetail() {
  const { id } = useParams();
  const { user, isRektor } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const editMode = params.get('edit') === '1';

  const [article, setArticle] = useState<Article | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [authorProfile, setAuthorProfile] = useState<any>(null);
  const [takenProfile, setTakenProfile] = useState<any>(null);
  const [isEditorAccess, setIsEditorAccess] = useState(false);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [statusLog, setStatusLog] = useState<any[]>([]);
  const [origChecks, setOrigChecks] = useState<any[]>([]);
  const [kval, setKval] = useState<any[]>([]);
  const [pointsTx, setPointsTx] = useState<any[]>([]);
  const [actorProfiles, setActorProfiles] = useState<Record<string, any>>({});
  const [actorRoles, setActorRoles] = useState<Record<string, string>>({});
  const [newKval, setNewKval] = useState('');
  const [editForm, setEditForm] = useState<Partial<Article> | null>(null);
  const [transitionPick, setTransitionPick] = useState<{ to: ArticleStatus; needsReason?: boolean } | null>(null);
  const [transitionReason, setTransitionReason] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const [theftSource, setTheftSource] = useState('');
  const [publishFeatured, setPublishFeatured] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [origDraft, setOrigDraft] = useState({ score: '', verdict: 'ok', notes: '', sources: '' });
  const [authorOverrideDraft, setAuthorOverrideDraft] = useState('');
  const [changeAuthorUsername, setChangeAuthorUsername] = useState('');
  const [pointsDraft, setPointsDraft] = useState({ amount: '5', reason: '' });
  const [ratingDraft, setRatingDraft] = useState<number>(0);

  useEffect(() => { if (id) load(); /* eslint-disable-next-line */ }, [id]);

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
    setRatingDraft(art.rating || 0);

    if (art.author_id) {
      const { data: p } = await sb.from('profiles').select('user_id, display_name, username, avatar_url').eq('user_id', art.author_id).maybeSingle();
      setAuthorProfile(p);
    } else setAuthorProfile(null);
    if (art.taken_by) {
      const { data: p } = await sb.from('profiles').select('user_id, display_name, username, avatar_url').eq('user_id', art.taken_by).maybeSingle();
      setTakenProfile(p);
    } else setTakenProfile(null);

    if (user) {
      const { data: ed } = await sb.from('article_editors').select('id, topic_id').eq('user_id', user.id);
      const has = (ed || []).some((e: any) => !e.topic_id || e.topic_id === art.topic_id);
      setIsEditorAccess(has || isRektor);
    }

    const [rRes, sRes, oRes, kRes, ptRes] = await Promise.all([
      sb.from('article_revisions').select('*').eq('article_id', id).order('created_at', { ascending: false }),
      sb.from('article_status_log').select('*').eq('article_id', id).order('created_at', { ascending: false }),
      sb.from('article_originality_checks').select('*').eq('article_id', id).order('created_at', { ascending: false }),
      sb.from('article_kvalitarka').select('*').eq('article_id', id).order('created_at'),
      sb.from('article_points').select('*').eq('article_id', id).order('created_at', { ascending: false }),
    ]);
    setRevisions(rRes.data || []);
    setStatusLog(sRes.data || []);
    setOrigChecks(oRes.data || []);
    setKval(kRes.data || []);
    setPointsTx(ptRes.data || []);

    const allActorIds = [
      ...(rRes.data || []).map((r: any) => r.editor_id),
      ...(sRes.data || []).map((r: any) => r.actor_id),
      ...(oRes.data || []).map((r: any) => r.checked_by),
      ...(kRes.data || []).map((r: any) => r.author_id),
      ...(ptRes.data || []).map((r: any) => r.granted_by),
    ].filter(Boolean);
    if (allActorIds.length) {
      const ids = [...new Set(allActorIds)];
      const [pRes, urRes] = await Promise.all([
        sb.from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', ids),
        sb.from('user_roles').select('user_id, role').in('user_id', ids),
      ]);
      const pm: Record<string, any> = {};
      (pRes.data || []).forEach((p: any) => { pm[p.user_id] = p; });
      setActorProfiles(pm);
      const { pickHighestRole } = await import('@/lib/rolePriority');
      const rm: Record<string, string> = {};
      ids.forEach(uid => {
        const roles = (urRes.data || []).filter((x: any) => x.user_id === uid).map((x: any) => x.role);
        const best = pickHighestRole(roles);
        if (best) rm[uid] = best;
      });
      setActorRoles(rm);
    }
  }

  if (!article) return <AppLayout><p className="text-muted-foreground">Načítání…</p></AppLayout>;

  const topic = topics.find(t => t.id === article.topic_id);
  const isAuthor = user?.id === article.author_id;
  const canEdit = isAuthor || isEditorAccess;
  const actorRoleStr: 'author' | 'editor' | 'rektor' | 'none' =
    isRektor ? 'rektor' : isEditorAccess ? 'editor' : isAuthor ? 'author' : 'none';
  const transitions = canEdit ? allowedTransitions(article.status, actorRoleStr as any) : [];
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
    const saveGroup = crypto.randomUUID();
    const revRows: any[] = [];
    for (const f of fields) {
      const oldV = (article as any)[f] ?? '';
      const newV = (editForm as any)[f] ?? '';
      if (String(oldV) !== String(newV)) {
        const snip = computeDiffSnippet(String(oldV), String(newV));
        revRows.push({
          article_id: article!.id, editor_id: user.id, field: f as string,
          old_value: String(oldV), new_value: String(newV), save_group: saveGroup,
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
    if (transitionPick.to === 'published') {
      patch.published_at = new Date().toISOString();
      if (publishFeatured) {
        patch.is_featured = true;
        patch.featured_until = new Date(Date.now() + 3 * 86400000).toISOString();
      }
    }
    if (transitionPick.to === 'scheduled') {
      if (!scheduledFor) { toast.error('Vyberte datum a čas'); return; }
      patch.scheduled_for = new Date(scheduledFor).toISOString();
    }
    if (transitionPick.to === 'rejected') patch.rejection_reason = transitionReason;
    if (transitionPick.to === 'flagged_stolen') {
      patch.flagged_source = transitionReason;
      patch.theft_source = theftSource || 'other';
    }
    const { error } = await sb.from('articles').update(patch).eq('id', article!.id);
    if (error) { toast.error(error.message); return; }
    await sb.from('article_status_log').insert({
      article_id: article!.id, actor_id: user.id, from_status: article!.status, to_status: transitionPick.to,
      reason: transitionReason || null,
    });
    setTransitionPick(null); setTransitionReason(''); setScheduledFor(''); setPublishFeatured(false); setTheftSource('');
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
    if (!isEditorAccess) { toast.error('Vepsaného autora upravuje jen redakce'); return; }
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

  async function takeArticle() {
    const sb: any = supabase;
    const { error } = await Promise.resolve(sb.rpc('take_article', { _article_id: article!.id }));
    if (error) toast.error(error.message); else { toast.success('Přebral/a jsi posouzení článku'); load(); }
  }
  async function releaseArticle() {
    const sb: any = supabase;
    const { error } = await Promise.resolve(sb.rpc('release_article', { _article_id: article!.id }));
    if (error) toast.error(error.message); else { toast.success('Uvolněno'); load(); }
  }

  async function addPoints() {
    const amt = Number(pointsDraft.amount);
    if (!amt || !article?.author_id) { toast.error('Zadejte počet bodů a článek musí mít autora'); return; }
    const sb: any = supabase;
    const { error } = await sb.from('article_points').insert({
      user_id: article.author_id, article_id: article.id, amount: amt,
      reason: pointsDraft.reason || null, granted_by: user!.id,
    });
    if (error) toast.error(error.message); else { toast.success('Vavřínové body připsány'); setPointsDraft({ amount: '5', reason: '' }); load(); }
  }

  async function saveRating() {
    const sb: any = supabase;
    const { error } = await sb.from('articles').update({ rating: ratingDraft || null }).eq('id', article!.id);
    if (error) toast.error(error.message); else { toast.success('Hodnocení uloženo'); load(); }
  }

  /* ---------- Render ---------- */

  const totalPoints = pointsTx.reduce((s, p) => s + (p.amount || 0), 0);

  // Group revisions by save_group (or by id when no group)
  const groupedRevisions: Record<string, any[]> = {};
  revisions.forEach(r => {
    const k = r.save_group || r.id;
    (groupedRevisions[k] = groupedRevisions[k] || []).push(r);
  });
  // Merge with status log into a chronological feed
  type FeedItem = { type: 'status' | 'edit'; created_at: string; actor_id: string; data: any };
  const feed: FeedItem[] = [
    ...statusLog.map(s => ({ type: 'status' as const, created_at: s.created_at, actor_id: s.actor_id, data: s })),
    ...Object.values(groupedRevisions).map(group => ({
      type: 'edit' as const, created_at: group[0].created_at, actor_id: group[0].editor_id, data: group,
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <AppLayout>
      <Link to="/nauctura" className="text-sm text-muted-foreground hover:underline">← zpět do Naučtury</Link>

      <article className="panel-card mt-3">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
          {topic && <div className="text-xs uppercase tracking-wider font-bold" style={{ color: topic.color }}>{topic.symbol} {topic.name}</div>}
          <div className="flex items-center gap-2">
            {article.is_featured && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">★ Významný</span>}
            <span className="px-2 py-0.5 rounded-full font-bold text-xs" style={{ background: info.bg, color: info.color }}>{info.short}</span>
          </div>
        </div>

        {!editForm ? (
          <>
            <h1 className="text-3xl md:text-4xl mt-1 mb-2 font-bold">{article.title}</h1>
            {article.perex && <p className="text-lg italic text-muted-foreground mb-3 whitespace-pre-wrap">{article.perex}</p>}
            <div className="flex items-center gap-2 text-sm mb-2 flex-wrap">
              <span>— {authorProfile?.username
                ? <Link to={`/uziv/${authorProfile.username}`} className="font-bold hover:underline">{authorLabel}</Link>
                : <strong>{authorLabel}</strong>}</span>
              {article.published_at && <span className="text-xs text-muted-foreground">vydáno {new Date(article.published_at).toLocaleString('cs')}</span>}
              {article.rating && <span className="text-amber-600 font-bold">{'★'.repeat(article.rating)}</span>}
              {totalPoints !== 0 && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${totalPoints > 0 ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'}`}>
                  {totalPoints > 0 ? '+' : ''}{totalPoints} 🌿 Vavřínových bodů
                </span>
              )}
            </div>
            {article.cover_image && <img src={article.cover_image} alt="" className="w-full max-h-96 object-cover rounded-xl my-4" />}
            <div className="mt-4">
              <MarkdownRenderer content={article.content || '*(prázdné)*'} />
            </div>
          </>
        ) : (
          <div className="space-y-3 mt-3">
            <input value={editForm.title || ''} onChange={e => setEditForm({ ...editForm, title: e.target.value })} placeholder="Název" className="w-full border-2 border-border rounded-xl py-2 p[...]
            <textarea value={editForm.perex || ''} onChange={e => setEditForm({ ...editForm, perex: e.target.value })} placeholder="Perex (krátký úvod)" rows={2} className="w-full border-2 bor[...]
            <select value={editForm.topic_id || ''} onChange={e => setEditForm({ ...editForm, topic_id: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm bg-card">
              <option value="">— bez tématu —</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.symbol} {t.name}</option>)}
            </select>
            <input value={editForm.cover_image || ''} onChange={e => setEditForm({ ...editForm, cover_image: e.target.value })} placeholder="URL obálky (volitelné)" className="w-full border-2 b[...]
            <textarea value={editForm.content || ''} onChange={e => setEditForm({ ...editForm, content: e.target.value })} placeholder="Obsah článku (Markdown, LaTeX)" rows={20} className="w-fu[...]
            <div className="flex gap-2">
              <Button onClick={saveEdit}>Uložit (jako jeden záznam protokolu)</Button>
              <Button variant="outline" onClick={cancelEdit}>Zrušit</Button>
            </div>
          </div>
        )}
      </article>

      {/* Redakční přebírka */}
      {isEditorAccess && !editForm && article.status !== 'published' && article.status !== 'deleted' && (
        <div className="panel-card mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm">
              {article.taken_by
                ? <>Posuzuje: <strong>{takenProfile?.display_name || '(redaktor)'}</strong>{article.taken_at && <span className="text-xs text-muted-foreground"> od {new Date(article.taken_at).toL[...]
                : <em className="text-muted-foreground">Článek si zatím nikdo z redakce nepřebral.</em>}
            </div>
            <div className="flex gap-2">
              {(!article.taken_by || article.taken_by !== user?.id) && (
                <Button size="sm" onClick={takeArticle}>👋 Přebrat článek</Button>
              )}
              {article.taken_by === user?.id && (
                <Button size="sm" variant="outline" onClick={releaseArticle}>Uvolnit</Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Boční nástroje */}
      {canEdit && !editForm && (
        <div className="panel-card mt-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={startEdit}>✎ Upravit</Button>
            {transitions.map(tr => (
              <button key={tr.to} onClick={() => { setTransitionPick(tr); setTransitionReason(''); setPublishFeatured(false); }} className="px-3 py-2 rounded-xl border-2 text-sm font-bold" style=[...]
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
                <div>
                  <Label className="text-xs">Datum a čas vydání</Label>
                  <Input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} />
                </div>
              )}
              {transitionPick.to === 'published' && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={publishFeatured} onChange={e => setPublishFeatured(e.target.checked)} />
                  <span><strong>★ Významný</strong> — automaticky se připne na titulku po dobu 3 dnů</span>
                </label>
              )}
              {transitionPick.to === 'flagged_stolen' && (
                <div>
                  <Label className="text-xs">Zdroj krádeže</Label>
                  <select value={theftSource} onChange={e => setTheftSource(e.target.value)} className="w-full border-2 border-border rounded-md py-1.5 px-2 text-sm bg-background">
                    <option value="">— vyberte —</option>
                    <option value="alikoviny">Alíkoviny</option>
                    <option value="ai">AI (ChatGPT, Gemini, …)</option>
                    <option value="web">Webový zdroj</option>
                    <option value="book">Kniha / tištěné</option>
                    <option value="other">Jiné</option>
                  </select>
                </div>
              )}
              <Textarea value={transitionReason} onChange={e => setTransitionReason(e.target.value)} placeholder={transitionPick.needsReason ? 'Důvod (povinné)' : 'Poznámka (volitelná)'} rows[...]
              <div className="flex gap-2">
                <Button size="sm" onClick={doTransition}>Potvrdit</Button>
                <Button size="sm" variant="outline" onClick={() => setTransitionPick(null)}>Zrušit</Button>
              </div>
            </div>
          )}
          {showDelete && (
            <div className="mt-3 p-3 border-2 border-destructive rounded-xl space-y-2">
              <div className="text-sm font-bold text-destructive">Smazat článek</div>
              <Textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)} placeholder="Důvod smazání (povinné)" rows={2} />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={doDelete}>Smazat</Button>
                <Button size="sm" variant="outline" onClick={() => setShowDelete(false)}>Zrušit</Button>
              </div>
            </div>
          )}

          {/* Vepsání autora (jen redakce) + změna autora (rektor) */}
          <div className="mt-4 grid md:grid-cols-2 gap-3">
            {isEditorAccess && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider">Vepsaný autor (přepíše skutečného)</label>
                <div className="flex gap-2 mt-1">
                  <Input value={authorOverrideDraft} onChange={e => setAuthorOverrideDraft(e.target.value)} placeholder='např. „Tomáš N. & redakce"' />
                  <Button size="sm" onClick={saveAuthorOverride}>Uložit</Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Upravuje pouze redakce.</p>
              </div>
            )}
            {isRektor && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider">Změna skutečného autora (jen rektor)</label>
                <div className="flex gap-2 mt-1">
                  <Input value={changeAuthorUsername} onChange={e => setChangeAuthorUsername(e.target.value)} placeholder="username nového autora" />
                  <Button size="sm" onClick={changeAuthor}>Změnit</Button>
                </div>
              </div>
            )}
          </div>

          {/* Hodnocení + Vavřínové body */}
          {isEditorAccess && (
            <div className="mt-4 border-t pt-3 grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-sm mb-2">★ Redakční hodnocení (1–5)</h4>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setRatingDraft(n)} className={`text-2xl ${n <= ratingDraft ? 'text-amber-500' : 'text-muted-foreground'}`}>★</button>
                  ))}
                  <Button size="sm" className="ml-2" onClick={saveRating}>Uložit</Button>
                  {article.rating && <Button size="sm" variant="ghost" onClick={() => { setRatingDraft(0); saveRating(); }}>Zrušit</Button>}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-2">🌿 Vavřínové body (odměna / trest)</h4>
                <div className="flex gap-2">
                  <Input type="number" value={pointsDraft.amount} onChange={e => setPointsDraft({ ...pointsDraft, amount: e.target.value })} className="w-20" placeholder="±n" />
                  <Input value={pointsDraft.reason} onChange={e => setPointsDraft({ ...pointsDraft, reason: e.target.value })} placeholder="Důvod / poznámka" />
                  <Button size="sm" onClick={addPoints}>Připsat</Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Záporné číslo = strhnutí.</p>
                {pointsTx.length > 0 && (
                  <ul className="mt-2 text-xs space-y-1 max-h-32 overflow-auto">
                    {pointsTx.map(p => (
                      <li key={p.id} className="border border-border rounded px-2 py-1 flex justify-between">
                        <span><strong className={p.amount > 0 ? 'text-emerald-600' : 'text-red-600'}>{p.amount > 0 ? '+' : ''}{p.amount}</strong> {p.reason}</span>
                        <span className="text-muted-foreground">{actorProfiles[p.granted_by]?.display_name || '—'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Originalita */}
          {isEditorAccess && (
            <div className="mt-4 border-t pt-3">
              <h4 className="font-bold text-sm mb-2">🔍 Ověření originality</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <input type="number" min={0} max={100} value={origDraft.score} onChange={e => setOrigDraft({ ...origDraft, score: e.target.value })} placeholder="Skóre 0–100" className="border[...]
                <select value={origDraft.verdict} onChange={e => setOrigDraft({ ...origDraft, verdict: e.target.value })} className="border-2 border-border rounded-lg py-1.5 px-2 text-sm">
                  <option value="ok">OK</option>
                  <option value="suspicious">Podezřelé</option>
                  <option value="stolen">Ukradený</option>
                </select>
                <input value={origDraft.notes} onChange={e => setOrigDraft({ ...origDraft, notes: e.target.value })} placeholder="Poznámka" className="border-2 border-border rounded-lg py-1.5 px[...]
                <textarea value={origDraft.sources} onChange={e => setOrigDraft({ ...origDraft, sources: e.target.value })} placeholder="Zdroje, jeden URL na řádek" rows={2} className="col-span[...]
                <Button size="sm" onClick={saveOriginality}>Zapsat</Button>
              </div>
              {origChecks.length > 0 && (
                <ul className="mt-3 text-xs space-y-1">
                  {origChecks.map(c => (
                    <li key={c.id} className="border border-border rounded-lg p-2">
                      <strong>{c.verdict}</strong> {c.score != null && `(${c.score}%)`} — {actorProfiles[c.checked_by]?.display_name || '?'} · {new Date(c.created_at).toLocaleString('cs')}
                      {c.notes && <div className="text-muted-foreground">{c.notes}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Protokol změn — jednotný formát Protokol */}
      {canEdit && (
        <details className="panel-card mt-4" open>
          <summary className="cursor-pointer font-extrabold">📜 Protokol změn ({feed.length})</summary>
          <div className="mt-3 space-y-3">
            {feed.length === 0 && <p className="text-muted-foreground text-sm">Zatím žádné záznamy.</p>}
            {feed.map((item, idx) => {
              const profile = actorProfiles[item.actor_id];
              const role = actorRoles[item.actor_id] || 'editor';
              if (item.type === 'status') {
                const s = item.data;
                return (
                  <div key={`s-${s.id}`}>
                    <Protokol
                      druh={s.actor_id ? actionToDruh('status.' + s.to_status) : 223}
                      autorita={s.actor_id ? roleToAutorita(role) : 1}
                      nick={s.actor_id ? (profile?.display_name || 'redakce') : 'systém'}
                      nickHref={profile?.username ? `/uziv/${profile.username}` : undefined}
                      profilovka={profile?.avatar_url || undefined}
                      cas={new Date(s.created_at)}
                      kontext={<>změnu stavu článku{s.from_status ? <> z <em>{STATUS_INFO[s.from_status as ArticleStatus]?.label || s.from_status}</em></> : null} na <strong>{STATUS_INFO[s.to_[...]
                      text={s.reason ? <em>„{s.reason}"</em> : undefined}
                    />
                  </div>
                );
              }
              // edit group
              const group: any[] = item.data;
              return (
                <div key={`e-${idx}`} className="space-y-2">
                  <Protokol
                    druh={24}
                    autorita={roleToAutorita(role)}
                    nick={profile?.display_name || '?'}
                    nickHref={profile?.username ? `/uziv/${profile.username}` : undefined}
                    profilovka={profile?.avatar_url || undefined}
                    cas={new Date(group[0].created_at)}
                    kontext={<>úpravu článku — změněno {group.length} {group.length === 1 ? 'pole' : group.length < 5 ? 'pole' : 'polí'} ({group.map(g => FIELD_LABELS[g.field] || g.field)[...]
                  />
                  <div className="ml-8 space-y-2">
                    {group.map(r => (
                      <ArticleDiffView key={r.id}
                        field={r.field}
                        before={r.diff_before} oldChunk={r.diff_old} newChunk={r.diff_new} after={r.diff_after}
                        fallbackOld={r.old_value} fallbackNew={r.new_value}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {/* Kvalitárka */}
      {canEdit && (
        <section className="panel-card mt-4">
          <h3 className="text-2xl mt-0 font-bold">🗨️ Kvalitárka</h3>
          <p className="text-xs text-muted-foreground mb-3">Diskuse mezi autorem a redakcí pod článkem.</p>
          <div className="space-y-2 mb-3">
            {kval.filter(k => !k.parent_id).map(k => (
              <KvalItem key={k.id} item={k} children={kval.filter(c => c.parent_id === k.id)} profiles={actorProfiles} roles={actorRoles} onReload={load} userId={user?.id} isRektor={isRektor} />
            ))}
            {kval.length === 0 && <p className="text-sm text-muted-foreground italic">Zatím žádný příspěvek.</p>}
          </div>
          {user && (
            <div>
              <Textarea value={newKval} onChange={e => setNewKval(e.target.value)} placeholder="Napište příspěvek…" rows={3} />
              <Button className="mt-2" onClick={() => postKval(null)}>Odeslat</Button>
            </div>
          )}
        </section>
      )}
    </AppLayout>
  );
}

const ROLE_BADGE_BG: Record<string, string> = {
  rektor: '#254BFF', spravce: '#258B25', lektor: '#C0392B', student: '#888', editor: '#7a4a8a',
};

function KvalItem({ item, children, profiles, roles, onReload, userId, isRektor }: any) {
  const sb: any = supabase;
  const [reply, setReply] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [editBody, setEditBody] = useState<string | null>(null);
  const profile = profiles[item.author_id];
  const role = roles[item.author_id] || 'student';
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
        <span className="px-1.5 py-0.5 rounded font-bold text-white" style={{ background: ROLE_BADGE_BG[role] || '#888' }}>{role}</span>
        <strong>{profile?.display_name || '?'}</strong>
        <span className="text-muted-foreground">· {new Date(item.created_at).toLocaleString('cs')}</span>
        {item.edited_at && <span className="text-muted-foreground text-[10px]">(upraveno)</span>}
      </div>
      {editBody != null ? (
        <div>
          <Textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={2} />
          <div className="flex gap-1 mt-1">
            <Button size="sm" onClick={saveEdit}>Uložit</Button>
            <Button size="sm" variant="outline" onClick={() => setEditBody(null)}>Zrušit</Button>
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
          <Textarea value={reply} onChange={e => setReply(e.target.value)} rows={2} placeholder="Odpověď…" />
          <Button size="sm" className="mt-1" onClick={send}>Odeslat</Button>
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
