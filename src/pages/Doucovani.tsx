import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Question { id: string; topic: string; question: string; status: string | null; created_at: string; user_id: string; }
interface Answer { id: string; answer: string; created_at: string; mentor_id: string; visibility: string; }

export default function Doucovani() {
  const { user, isLektor, isStaff, isDeveloper } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [topic, setTopic] = useState('Matematika');
  const [questionText, setQuestionText] = useState('');
  const [context, setContext] = useState('');
  const [selectedQ, setSelectedQ] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [answerText, setAnswerText] = useState('');
  const [answerVisibility, setAnswerVisibility] = useState('public_all');

  const canAnswer = isLektor || isStaff || isDeveloper;

  const load = async () => {
    const { data } = await supabase.from('tutoring_questions').select('*').order('created_at', { ascending: false });
    if (data) {
      setQuestions(data);
      const ids = [...new Set(data.map(q => q.user_id))];
      if (ids.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('user_id, display_name').in('user_id', ids);
        if (profs) {
          const map: Record<string, string> = {};
          profs.forEach(p => { map[p.user_id] = p.display_name; });
          setProfiles(map);
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
    else { toast.success('Dotaz odeslán'); setQuestionText(''); setContext(''); load(); }
  };

  const loadAnswers = async (qId: string) => {
    setSelectedQ(qId);
    const { data } = await supabase.from('tutoring_answers').select('*').eq('question_id', qId).order('created_at');
    if (data) {
      // Filter: show all to staff, show public_all to everyone, show private only to asker
      const question = questions.find(q => q.id === qId);
      const filtered = data.filter(a => {
        if (canAnswer) return true;
        if (a.visibility === 'public_all') return true;
        if (a.visibility === 'private_asker' && question?.user_id === user?.id) return true;
        return false;
      });
      setAnswers(filtered);
    }
  };

  const handleSubmitA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedQ) return;
    const { error } = await supabase.from('tutoring_answers').insert({
      question_id: selectedQ,
      mentor_id: user.id,
      answer: answerText,
      visibility: answerVisibility,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(answerVisibility === 'private_asker' ? 'Odpověď odeslána jen tazateli' : 'Odpověď zveřejněna');
      setAnswerText('');
      setAnswerVisibility('public_all');
      loadAnswers(selectedQ);
      // Update question status
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
            <article className="panel-card">
              <h3 className="mt-0 mb-2">Jak to funguje</h3>
              <ul className="pl-4 text-sm"><li>Napiš krátký a jasný dotaz</li><li>Vyber téma, aby mentor našel cestu</li><li>Dostaneš upozornění, až přijde odpověď</li></ul>
            </article>
            <article className="panel-card">
              <h3 className="mt-0 mb-2">Doporučená témata</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Matematika', 'Český jazyk', 'Vědy', 'Umění', 'Programování', 'Herní design'].map(t => (
                  <span key={t} className="px-2.5 py-1.5 rounded-full text-xs font-bold border border-blue-200" style={{ background: '#f1f5ff', color: '#315493' }}>{t}</span>
                ))}
              </div>
            </article>
          </div>

          <div className="panel-card" id="poloz-dotaz">
            <h3 className="mt-0 mb-2">Polož dotaz</h3>
            <form onSubmit={handleSubmitQ} className="grid gap-2.5">
              <select value={topic} onChange={e => setTopic(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2.5 px-3 text-sm bg-card outline-none">
                <option>Matematika</option><option>Český jazyk</option><option>Vědy</option><option>Umění</option><option>Programování</option><option>Obecné</option>
              </select>
              <textarea placeholder="Napiš svůj dotaz..." value={questionText} onChange={e => setQuestionText(e.target.value)} required className="border-2 border-blue-200 rounded-xl py-2.5 px-3 text-sm outline-none min-h-[120px] resize-y" />
              <input placeholder="Kde ses zasekl/a? (volitelné)" value={context} onChange={e => setContext(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2.5 px-3 text-sm outline-none" />
              <button type="submit" className="btn-alik-primary">Odeslat dotaz</button>
            </form>
          </div>

          <div className="catalog-card">
            <h3 className="mt-0 mb-2.5">Poslední dotazy</h3>
            <div className="grid gap-2.5">
              {questions.map(q => (
                <div key={q.id} className="catalog-item-card cursor-pointer" onClick={() => loadAnswers(q.id)} style={{ background: selectedQ === q.id ? '#dbeafe' : undefined }}>
                  <div>
                    <strong>{q.question.slice(0, 60)}{q.question.length > 60 ? '...' : ''}</strong>
                    <span className="block text-xs text-muted-foreground">{profiles[q.user_id] || 'Uživatel'}</span>
                  </div>
                  <span style={{ color: '#345b8b', whiteSpace: 'nowrap' }}>{q.topic} • {q.status === 'answered' ? '✅' : '⏳'}</span>
                </div>
              ))}
            </div>
          </div>

          {selectedQ && (
            <div className="panel-card">
              <h3 className="mt-0 mb-2">Odpovědi</h3>
              {answers.length === 0 && <p className="text-muted-foreground text-sm">Zatím žádná odpověď.</p>}
              {answers.map(a => (
                <div key={a.id} className="catalog-item-card mb-2 flex-col">
                  <span className="text-sm">{a.answer}</span>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString('cs')}</span>
                    {a.visibility === 'private_asker' && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#fff3cd', color: '#856404' }}>🔒 Soukromé</span>}
                  </div>
                </div>
              ))}
              {canAnswer && (
                <form onSubmit={handleSubmitA} className="grid gap-2 mt-3">
                  <textarea placeholder="Vaše odpověď..." value={answerText} onChange={e => setAnswerText(e.target.value)} required className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none min-h-[80px]" />
                  <div className="flex gap-2 items-center">
                    <select value={answerVisibility} onChange={e => setAnswerVisibility(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none">
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
          <div className="panel-card">
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
