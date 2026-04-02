import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { nameWithRole } from '@/lib/roleUtils';
import ChangeHistory, { recordHistory } from '@/components/ChangeHistory';

interface Question { id: string; topic: string; question: string; status: string | null; created_at: string; user_id: string; }
interface Answer { id: string; answer: string; created_at: string; mentor_id: string; visibility: string; }

export default function Doucovani() {
  const { user, isLektor, isStaff, isDeveloper } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [topic, setTopic] = useState('Matematika');
  const [questionText, setQuestionText] = useState('');
  const [context, setContext] = useState('');
  const [selectedQ, setSelectedQ] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [answerText, setAnswerText] = useState('');
  const [answerVisibility, setAnswerVisibility] = useState('public_all');
  const [mentorProfiles, setMentorProfiles] = useState<Record<string, string>>({});
  const [mentorRoles, setMentorRoles] = useState<Record<string, string>>({});

  const canAnswer = isLektor || isStaff || isDeveloper;

  const load = async () => {
    const { data } = await supabase.from('tutoring_questions').select('*').order('created_at', { ascending: false });
    if (data) {
      setQuestions(data);
      const ids = [...new Set(data.map(q => q.user_id))];
      if (ids.length > 0) {
        const [profRes, roleRes] = await Promise.all([
          supabase.from('profiles').select('user_id, display_name').in('user_id', ids),
          supabase.from('user_roles').select('user_id, role').in('user_id', ids),
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
    }
  };
  useEffect(() => { if (user) load(); }, [user]);

  const handleSubmitQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from('tutoring_questions').insert({ user_id: user.id, topic, question: questionText, context: context || null });
    if (error) toast.error(error.message);
    else {
      toast.success('Dotaz odeslán');
      setQuestionText(''); setContext(''); load();
    }
  };

  const deleteQuestion = async (q: Question) => {
    if (!confirm('Opravdu smazat tento dotaz?')) return;
    const { error } = await supabase.from('tutoring_questions').delete().eq('id', q.id);
    if (error) toast.error(error.message);
    else {
      if (user) await recordHistory('tutoring_question', q.id, user.id, 'delete', { question: q.question, topic: q.topic });
      toast.success('Dotaz smazán');
      if (selectedQ === q.id) { setSelectedQ(null); setAnswers([]); }
      load();
    }
  };

  const deleteAnswer = async (aId: string) => {
    if (!confirm('Opravdu smazat tuto odpověď?')) return;
    const { error } = await supabase.from('tutoring_answers').delete().eq('id', aId);
    if (error) toast.error(error.message);
    else {
      if (user && selectedQ) await recordHistory('tutoring_answer', aId, user.id, 'delete', {});
      toast.success('Odpověď smazána');
      if (selectedQ) loadAnswers(selectedQ);
    }
  };

  const loadAnswers = async (qId: string) => {
    setSelectedQ(qId);
    const { data } = await supabase.from('tutoring_answers').select('*').eq('question_id', qId).order('created_at');
    if (data) {
      const question = questions.find(q => q.id === qId);
      const filtered = data.filter(a => {
        if (canAnswer) return true;
        if (a.visibility === 'public_all') return true;
        if (a.visibility === 'private_asker' && question?.user_id === user?.id) return true;
        return false;
      });
      setAnswers(filtered);
      // Load mentor profiles & roles
      const mentorIds = [...new Set(filtered.map(a => a.mentor_id))];
      if (mentorIds.length > 0) {
        const [pRes, rRes] = await Promise.all([
          supabase.from('profiles').select('user_id, display_name').in('user_id', mentorIds),
          supabase.from('user_roles').select('user_id, role').in('user_id', mentorIds),
        ]);
        if (pRes.data) {
          const m: Record<string, string> = {};
          pRes.data.forEach(p => { m[p.user_id] = p.display_name; });
          setMentorProfiles(m);
        }
        if (rRes.data) {
          const m: Record<string, string> = {};
          rRes.data.forEach(r => { m[r.user_id] = r.role; });
          setMentorRoles(m);
        }
      }
    }
  };

  const handleSubmitA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedQ) return;
    const { error } = await supabase.from('tutoring_answers').insert({
      question_id: selectedQ, mentor_id: user.id, answer: answerText, visibility: answerVisibility,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(answerVisibility === 'private_asker' ? 'Odpověď odeslána jen tazateli' : 'Odpověď zveřejněna');
      if (user) await recordHistory('tutoring_question', selectedQ, user.id, 'answer', { visibility: answerVisibility });
      setAnswerText(''); setAnswerVisibility('public_all');
      loadAnswers(selectedQ);
      await supabase.from('tutoring_questions').update({ status: 'answered' }).eq('id', selectedQ);
      load();
    }
  };

  return (
    <AppLayout searchLabel="Najít dotaz" searchPlaceholder="např. matematika, kreslení" searchTags={['nevyřešené', 'nejlepší odpovědi', 'nové']}>
      <main className="grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-5 items-start">
        <div className="grid gap-[18px]">
          <article className="feature-card grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-4 animate-float-in">
            <div>
              <h2 className="mt-0 text-[22px]">Polož dotaz a mentor ti odpoví</h2>
              <p>Stačí napsat otázku, přidat téma a počkat na odpověď.</p>
              <p className="text-muted-foreground">Průměrná doba odpovědi: 3 hodiny.</p>
            </div>
            <div className="grid place-items-center"><div className="poster-gradient" /></div>
          </article>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <article className="panel-card animate-slide-up stagger-1">
              <h3 className="mt-0 mb-2">Jak to funguje</h3>
              <ul className="pl-4 text-sm"><li>Napiš krátký a jasný dotaz</li><li>Vyber téma, aby mentor našel cestu</li><li>Dostaneš upozornění, až přijde odpověď</li></ul>
            </article>
            <article className="panel-card animate-slide-up stagger-2">
              <h3 className="mt-0 mb-2">Doporučená témata</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Matematika', 'Český jazyk', 'Vědy', 'Umění', 'Programování', 'Herní design'].map(t => (
                  <span key={t} className="px-2.5 py-1.5 rounded-full text-xs font-bold border border-border bg-muted/50 text-foreground hover:bg-muted transition-colors cursor-default">{t}</span>
                ))}
              </div>
            </article>
          </div>

          <div className="panel-card animate-slide-up stagger-3" id="poloz-dotaz">
            <h3 className="mt-0 mb-2">Polož dotaz</h3>
            <form onSubmit={handleSubmitQ} className="grid gap-2.5">
              <select value={topic} onChange={e => setTopic(e.target.value)} className="border-2 border-border rounded-xl py-2.5 px-3 text-sm bg-card outline-none focus:border-secondary transition-colors">
                <option>Matematika</option><option>Český jazyk</option><option>Vědy</option><option>Umění</option><option>Programování</option><option>Obecné</option>
              </select>
              <textarea placeholder="Napiš svůj dotaz... (podporuje Markdown a $\LaTeX$)" value={questionText} onChange={e => setQuestionText(e.target.value)} required className="border-2 border-border rounded-xl py-2.5 px-3 text-sm outline-none min-h-[120px] resize-y font-mono focus:border-secondary transition-colors" />
              <input placeholder="Kde ses zasekl/a? (volitelné)" value={context} onChange={e => setContext(e.target.value)} className="border-2 border-border rounded-xl py-2.5 px-3 text-sm outline-none focus:border-secondary transition-colors" />
              <button type="submit" className="btn-alik-primary">Odeslat dotaz</button>
            </form>
          </div>

          <div className="catalog-card animate-slide-up stagger-4">
            <h3 className="mt-0 mb-2.5">Poslední dotazy</h3>
            <div className="grid gap-2.5">
              {questions.map(q => (
                <div key={q.id} className="catalog-item-card cursor-pointer hover:shadow-sm transition-all duration-200" onClick={() => loadAnswers(q.id)} style={{ background: selectedQ === q.id ? 'hsl(var(--muted))' : undefined }}>
                  <div className="flex-1">
                    <strong>{q.question.slice(0, 60)}{q.question.length > 60 ? '...' : ''}</strong>
                    <span className="block text-xs text-muted-foreground">{nameWithRole(profiles[q.user_id] || 'Uživatel', userRoles[q.user_id])}</span>
                    <ChangeHistory entityType="tutoring_question" entityId={q.id} authorId={q.user_id} />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs whitespace-nowrap" style={{ color: 'hsl(var(--ring))' }}>{q.topic} • {q.status === 'answered' ? '✅' : '⏳'}</span>
                    {(user?.id === q.user_id || isStaff || isDeveloper) && (
                      <button onClick={e => { e.stopPropagation(); deleteQuestion(q); }} className="text-xs font-bold px-2 py-0.5 rounded-lg hover:brightness-95 transition-all" style={{ background: '#fde8e8', color: '#991b1b' }}>🗑</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedQ && (
            <div className="panel-card animate-fade-in">
              <h3 className="mt-0 mb-2">Odpovědi</h3>
              {answers.length === 0 && <p className="text-muted-foreground text-sm">Zatím žádná odpověď.</p>}
              {answers.map(a => (
                <div key={a.id} className="catalog-item-card mb-2 flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <strong className="text-xs">{nameWithRole(mentorProfiles[a.mentor_id] || 'Mentor', mentorRoles[a.mentor_id])}</strong>
                    {a.visibility === 'private_asker' && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#fff3cd', color: '#856404' }}>🔒 Soukromé</span>}
                    {(isStaff || isDeveloper) && (
                      <button onClick={() => deleteAnswer(a.id)} className="text-xs font-bold px-2 py-0.5 rounded-lg hover:brightness-95 transition-all" style={{ background: '#fde8e8', color: '#991b1b' }}>🗑</button>
                    )}
                  </div>
                  <div className="text-sm w-full"><MarkdownRenderer content={a.answer} /></div>
                  <span className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString('cs')}</span>
                  <ChangeHistory entityType="tutoring_answer" entityId={a.id} authorId={a.mentor_id} />
                </div>
              ))}
              {canAnswer && (
                <form onSubmit={handleSubmitA} className="grid gap-2 mt-3">
                  <textarea placeholder="Vaše odpověď... (podporuje Markdown a $\LaTeX$)" value={answerText} onChange={e => setAnswerText(e.target.value)} required className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[80px] font-mono focus:border-secondary transition-colors" />
                  <div className="flex gap-2 items-center">
                    <select value={answerVisibility} onChange={e => setAnswerVisibility(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card">
                      <option value="public_all">🌐 Zveřejnit všem</option>
                      <option value="private_asker">🔒 Jen tazateli</option>
                    </select>
                    <button type="submit" className="btn-alik-accent text-sm">Odpovědět</button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        <aside className="grid gap-[18px]">
          <div className="panel-card animate-slide-up stagger-2">
            <h4 className="mt-0">Stav dotazu</h4>
            <ul className="pl-4 text-sm">
              <li>Celkem dotazů: {questions.length}</li>
              <li>Čeká na odpověď: {questions.filter(q => q.status === 'pending').length}</li>
              <li>Zodpovězeno: {questions.filter(q => q.status === 'answered').length}</li>
            </ul>
          </div>
          <button className="btn-alik-accent" onClick={() => document.getElementById('poloz-dotaz')?.scrollIntoView({ behavior: 'smooth' })}>Položit dotaz</button>
        </aside>
      </main>
    </AppLayout>
  );
}
