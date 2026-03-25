import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Question { id: string; topic: string; question: string; status: string | null; created_at: string; }
interface Answer { id: string; answer: string; created_at: string; }

export default function Doucovani() {
  const { user, isLektor, isStaff } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topic, setTopic] = useState('Matematika');
  const [questionText, setQuestionText] = useState('');
  const [context, setContext] = useState('');
  const [selectedQ, setSelectedQ] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [answerText, setAnswerText] = useState('');

  const load = async () => {
    const { data } = await supabase.from('tutoring_questions').select('*').order('created_at', { ascending: false });
    if (data) setQuestions(data);
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
    if (data) setAnswers(data);
  };

  const handleSubmitA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedQ) return;
    const { error } = await supabase.from('tutoring_answers').insert({ question_id: selectedQ, mentor_id: user.id, answer: answerText });
    if (error) toast.error(error.message);
    else { toast.success('Odpověď odeslána'); setAnswerText(''); loadAnswers(selectedQ); }
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
              <small className="text-muted-foreground">Odpovíme co nejdříve.</small>
            </form>
          </div>

          <div className="catalog-card">
            <h3 className="mt-0 mb-2.5">Poslední dotazy</h3>
            <div className="grid gap-2.5">
              {questions.map(q => (
                <div key={q.id} className="catalog-item-card cursor-pointer" onClick={() => loadAnswers(q.id)}>
                  <strong>{q.question.slice(0, 60)}{q.question.length > 60 ? '...' : ''}</strong>
                  <span style={{ color: '#345b8b', whiteSpace: 'nowrap' }}>{q.topic} • {q.status}</span>
                </div>
              ))}
            </div>
          </div>

          {selectedQ && (
            <div className="panel-card">
              <h3 className="mt-0 mb-2">Odpovědi</h3>
              {answers.length === 0 && <p className="text-muted-foreground text-sm">Zatím žádná odpověď.</p>}
              {answers.map(a => (
                <div key={a.id} className="catalog-item-card mb-2"><span>{a.answer}</span></div>
              ))}
              {(isLektor || isStaff) && (
                <form onSubmit={handleSubmitA} className="grid gap-2 mt-3">
                  <textarea placeholder="Vaše odpověď..." value={answerText} onChange={e => setAnswerText(e.target.value)} required className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none min-h-[80px]" />
                  <button type="submit" className="btn-alik-accent text-sm">Odpovědět</button>
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
            </ul>
          </div>
          <button className="btn-alik-accent" onClick={() => document.getElementById('poloz-dotaz')?.scrollIntoView({ behavior: 'smooth' })}>Položit dotaz</button>
        </aside>
      </main>
    </AppLayout>
  );
}
