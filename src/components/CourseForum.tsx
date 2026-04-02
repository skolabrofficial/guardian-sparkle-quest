import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { nameWithRole } from '@/lib/roleUtils';
import ChangeHistory, { recordHistory } from '@/components/ChangeHistory';

interface ForumPost {
  id: string;
  course_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  is_pinned: boolean | null;
  is_locked: boolean | null;
  is_deleted: boolean | null;
  label: string | null;
  moved_from_course_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  courseId: string;
  courseName: string;
  allCourses: { id: string; title: string }[];
  facultyDeanId?: string | null;
}

const LABELS = ['důležité', 'vyřešeno', 'otázka', 'upozornění', 'tip', 'off-topic'];

export default function CourseForum({ courseId, courseName, allCourses, facultyDeanId }: Props) {
  const { user, role, isDeveloper, isStaff, isLektor } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [newContent, setNewContent] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [movePostId, setMovePostId] = useState<string | null>(null);
  const [moveTargetCourse, setMoveTargetCourse] = useState('');

  const isDean = user?.id === facultyDeanId;
  const canMark = isLektor || isStaff || isDeveloper;
  const canDelete = isDean || isStaff || isDeveloper;
  const canMove = isStaff || isDeveloper;
  const canEditAny = isDeveloper;

  const load = async () => {
    const { data } = await supabase
      .from('forum_posts')
      .select('*')
      .eq('course_id', courseId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) setPosts(data);

    if (data && data.length > 0) {
      const authorIds = [...new Set(data.map(p => p.author_id))];
      const [profRes, roleRes] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name').in('user_id', authorIds),
        supabase.from('user_roles').select('user_id, role').in('user_id', authorIds),
      ]);
      if (profRes.data) {
        const map: Record<string, string> = {};
        profRes.data.forEach(p => { map[p.user_id] = p.display_name; });
        setProfiles(map);
      }
      if (roleRes.data) {
        const map: Record<string, string> = {};
        roleRes.data.forEach(r => { map[r.user_id] = r.role; });
        setUserRoles(map);
      }
    }
  };

  useEffect(() => { if (user) load(); }, [user, courseId]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newContent.trim()) return;
    const { error } = await supabase.from('forum_posts').insert({ course_id: courseId, author_id: user.id, content: newContent });
    if (error) toast.error(error.message);
    else {
      toast.success('Příspěvek přidán');
      setNewContent('');
      load();
    }
  };

  const handleReplyWithHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !replyTo || !replyContent.trim()) return;
    const { data, error } = await supabase.from('forum_posts').insert({ course_id: courseId, author_id: user.id, content: replyContent, parent_id: replyTo }).select('id').single();
    if (error) toast.error(error.message);
    else {
      if (data) await recordHistory('forum_post', replyTo, user.id, 'answer', { reply_id: data.id });
      toast.success('Odpověď přidána'); setReplyContent(''); setReplyTo(null); load();
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !replyTo || !replyContent.trim()) return;
    const { error } = await supabase.from('forum_posts').insert({ course_id: courseId, author_id: user.id, content: replyContent, parent_id: replyTo });
    if (error) toast.error(error.message);
    else { toast.success('Odpověď přidána'); setReplyContent(''); setReplyTo(null); load(); }
  };

  const labelPost = async (postId: string, label: string | null) => {
    const post = posts.find(p => p.id === postId);
    const { error } = await supabase.from('forum_posts').update({ label }).eq('id', postId);
    if (error) toast.error(error.message);
    else {
      if (user) await recordHistory('forum_post', postId, user.id, 'label', { label: { from: post?.label || '—', to: label || '—' } });
      load();
    }
  };

  const togglePin = async (post: ForumPost) => {
    const newVal = !post.is_pinned;
    const { error } = await supabase.from('forum_posts').update({ is_pinned: newVal }).eq('id', post.id);
    if (error) toast.error(error.message);
    else {
      if (user) await recordHistory('forum_post', post.id, user.id, 'pin', { is_pinned: { from: post.is_pinned, to: newVal } });
      load();
    }
  };

  const toggleLock = async (post: ForumPost) => {
    const newVal = !post.is_locked;
    const { error } = await supabase.from('forum_posts').update({ is_locked: newVal }).eq('id', post.id);
    if (error) toast.error(error.message);
    else {
      if (user) await recordHistory('forum_post', post.id, user.id, 'lock', { is_locked: { from: post.is_locked, to: newVal } });
      load();
    }
  };

  const deletePost = async (postId: string) => {
    const { error } = await supabase.from('forum_posts').update({ is_deleted: true }).eq('id', postId);
    if (error) toast.error(error.message);
    else {
      if (user) await recordHistory('forum_post', postId, user.id, 'delete', {});
      toast.success('Příspěvek smazán'); load();
    }
  };

  const restorePost = async (postId: string) => {
    const { error } = await supabase.from('forum_posts').update({ is_deleted: false }).eq('id', postId);
    if (error) toast.error(error.message);
    else {
      if (user) await recordHistory('forum_post', postId, user.id, 'publish', { action: 'Obnovení příspěvku' });
      toast.success('Příspěvek obnoven'); load();
    }
  };

  const movePost = async () => {
    if (!movePostId || !moveTargetCourse) return;
    const targetName = allCourses.find(c => c.id === moveTargetCourse)?.title || moveTargetCourse;
    const { error } = await supabase.from('forum_posts').update({ course_id: moveTargetCourse, moved_from_course_id: courseId }).eq('id', movePostId);
    if (error) toast.error(error.message);
    else {
      if (user) await recordHistory('forum_post', movePostId, user.id, 'move', { from_course: courseName, to_course: targetName });
      toast.success('Příspěvek přesunut'); setMovePostId(null); setMoveTargetCourse(''); load();
    }
  };

  const saveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    const { error } = await supabase.from('forum_posts').update({ content: editContent }).eq('id', editingId);
    if (error) toast.error(error.message);
    else {
      if (user) await recordHistory('forum_post', editingId, user.id, 'update', { content: { from: '(předchozí obsah)', to: editContent.slice(0, 100) + '...' } });
      toast.success('Upraveno'); setEditingId(null); setEditContent(''); load();
    }
  };

  const topPosts = posts.filter(p => !p.parent_id);
  const getReplies = (parentId: string) => posts.filter(p => p.parent_id === parentId);

  const getLabelColor = (label: string) => {
    const map: Record<string, string> = {
      důležité: '#dc2626', vyřešeno: '#16a34a', otázka: '#2563eb',
      upozornění: '#ea580c', tip: '#7c3aed', 'off-topic': '#6b7280',
    };
    return map[label] || '#6b7280';
  };

  const renderPost = (post: ForumPost, isReply = false) => (
    <div key={post.id} className={`rounded-xl p-3.5 ${isReply ? 'ml-6 mt-2' : 'mt-3'} ${post.is_deleted ? 'opacity-50' : ''} transition-all duration-200 hover:shadow-md`} style={{ background: post.is_pinned ? '#fffbe8' : '#f6f9ff', border: `1px solid ${post.is_pinned ? '#e8d44d' : '#d4e0f7'}` }}>
      <div className="flex justify-between items-start gap-2 mb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <strong className="text-sm">{nameWithRole(profiles[post.author_id] || 'Uživatel', userRoles[post.author_id])}</strong>
          <span className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString('cs')}</span>
          {post.is_pinned && <span className="text-xs font-bold" style={{ color: '#b8860b' }}>📌 Připnuto</span>}
          {post.is_locked && <span className="text-xs font-bold text-muted-foreground">🔒 Zamčeno</span>}
          {post.label && <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: getLabelColor(post.label) }}>{post.label}</span>}
          {post.is_deleted && <span className="text-xs text-red-500 font-bold">🗑 Smazáno</span>}
          {post.moved_from_course_id && <span className="text-xs text-muted-foreground">↗ Přesunuto</span>}
        </div>
      </div>

      {editingId === post.id ? (
        <div className="grid gap-2 mt-2">
          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[60px] focus:border-secondary transition-colors" />
          <div className="flex gap-2">
            <button onClick={saveEdit} className="btn-alik-primary text-xs">Uložit</button>
            <button onClick={() => setEditingId(null)} className="btn-alik-outline text-xs">Zrušit</button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-sm my-1"><MarkdownRenderer content={post.content} /></div>
          <ChangeHistory entityType="forum_post" entityId={post.id} authorId={post.author_id} />
        </>
      )}

      <div className="flex gap-1.5 flex-wrap mt-2">
        {!post.is_locked && !post.is_deleted && (
          <button onClick={() => { setReplyTo(post.id); setReplyContent(''); }} className="text-xs font-bold px-2.5 py-1 rounded-lg hover:brightness-95 transition-all" style={{ background: '#eef5ff', color: '#2e4c7c' }}>💬 Odpovědět</button>
        )}
        {canMark && !post.is_deleted && (
          <>
            <button onClick={() => togglePin(post)} className="text-xs font-bold px-2.5 py-1 rounded-lg hover:brightness-95 transition-all" style={{ background: '#fff8e0', color: '#8b6914' }}>{post.is_pinned ? 'Odepnout' : '📌 Připnout'}</button>
            <button onClick={() => toggleLock(post)} className="text-xs font-bold px-2.5 py-1 rounded-lg hover:brightness-95 transition-all" style={{ background: '#f0f4ff', color: '#4a5c8a' }}>{post.is_locked ? 'Odemknout' : '🔒 Zamknout'}</button>
            <select value={post.label || ''} onChange={e => labelPost(post.id, e.target.value || null)} className="text-xs rounded-lg px-2 py-1 border border-border outline-none bg-card">
              <option value="">Bez štítku</option>
              {LABELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </>
        )}
        {canDelete && !post.is_deleted && (
          <button onClick={() => deletePost(post.id)} className="text-xs font-bold px-2.5 py-1 rounded-lg hover:brightness-95 transition-all" style={{ background: '#fde8e8', color: '#991b1b' }}>🗑 Smazat</button>
        )}
        {canDelete && post.is_deleted && (
          <button onClick={() => restorePost(post.id)} className="text-xs font-bold px-2.5 py-1 rounded-lg hover:brightness-95 transition-all" style={{ background: '#e8fde8', color: '#166534' }}>♻ Obnovit</button>
        )}
        {canMove && !post.is_deleted && (
          <button onClick={() => { setMovePostId(post.id); setMoveTargetCourse(''); }} className="text-xs font-bold px-2.5 py-1 rounded-lg hover:brightness-95 transition-all" style={{ background: '#f0eaff', color: '#5b21b6' }}>↗ Přesunout</button>
        )}
        {canEditAny && !post.is_deleted && (
          <button onClick={() => { setEditingId(post.id); setEditContent(post.content); }} className="text-xs font-bold px-2.5 py-1 rounded-lg hover:brightness-95 transition-all" style={{ background: '#fef3c7', color: '#92400e' }}>✏ Upravit</button>
        )}
      </div>

      {movePostId === post.id && (
        <div className="grid gap-2 mt-2 p-3 rounded-xl animate-fade-in" style={{ background: '#f5f0ff' }}>
          <select value={moveTargetCourse} onChange={e => setMoveTargetCourse(e.target.value)} className="text-sm rounded-xl py-2 px-3 border-2 border-border outline-none bg-card">
            <option value="">Vyberte cílové fórum</option>
            {allCourses.filter(c => c.id !== courseId).map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={movePost} disabled={!moveTargetCourse} className="btn-alik-primary text-xs">Přesunout</button>
            <button onClick={() => setMovePostId(null)} className="btn-alik-outline text-xs">Zrušit</button>
          </div>
        </div>
      )}

      {replyTo === post.id && (
        <form onSubmit={handleReply} className="grid gap-2 mt-2 animate-fade-in">
          <textarea value={replyContent} onChange={e => setReplyContent(e.target.value)} placeholder="Vaše odpověď..." required className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[50px] focus:border-secondary transition-colors" />
          <div className="flex gap-2">
            <button type="submit" className="btn-alik-primary text-xs">Odpovědět</button>
            <button type="button" onClick={() => setReplyTo(null)} className="btn-alik-outline text-xs">Zrušit</button>
          </div>
        </form>
      )}

      {getReplies(post.id).map(r => renderPost(r, true))}
    </div>
  );

  return (
    <div className="panel-card animate-slide-up">
      <h3 className="mt-0 mb-1">💬 Diskuzní fórum — {courseName}</h3>
      <p className="text-xs text-muted-foreground mb-3">{topPosts.length} příspěvků</p>

      <form onSubmit={handlePost} className="grid gap-2 mb-4">
        <textarea
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          placeholder="Napište příspěvek do fóra... (podporuje Markdown a $\LaTeX$)"
          required
          className="border-2 border-border rounded-xl py-2.5 px-3 text-sm outline-none min-h-[70px] resize-y focus:border-secondary transition-colors"
        />
        <button type="submit" className="btn-alik-primary text-sm w-fit">Přidat příspěvek</button>
      </form>

      <div>
        {topPosts.map(p => renderPost(p))}
        {topPosts.length === 0 && <p className="text-muted-foreground text-sm">Zatím žádné příspěvky. Buďte první!</p>}
      </div>
    </div>
  );
}
