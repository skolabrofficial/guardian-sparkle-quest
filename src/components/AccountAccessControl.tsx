import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const db = () => supabase as any;
const SCOPE_LABELS: Record<string, string> = {
  wall: 'Úprava zdi', searches: 'Historie vyhledávání', account_actions: 'Zásahy v účtu', all: 'Všechny citlivé sekce',
};

export default function AccountAccessControl({ targetUserId, onAccessChanged }: { targetUserId: string; onAccessChanged?: () => void }) {
  const { user, isRektor, isSpravce } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [grants, setGrants] = useState<any[]>([]);
  const [scope, setScope] = useState('wall');
  const [reason, setReason] = useState('');
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [issuedCode, setIssuedCode] = useState('');

  const load = async () => {
    if (!user) return;
    const [r, a, g] = await Promise.all([
      db().from('account_access_requests').select('*').eq('target_user_id', targetUserId).order('created_at', { ascending: false }),
      db().from('account_access_approvals').select('*').order('created_at', { ascending: true }),
      db().from('account_access_grants').select('*').eq('target_user_id', targetUserId).is('revoked_at', null),
    ]);
    setRequests(r.data || []);
    setApprovals((a.data || []).filter((x: any) => (r.data || []).some((req: any) => req.id === x.request_id)));
    setGrants(g.data || []);
  };
  useEffect(() => { load(); }, [targetUserId, user?.id]);

  const createRequest = async () => {
    if (reason.trim().length < 5) return toast.error('Uveď důvod alespoň pěti znaky.');
    const { data, error } = await Promise.resolve(db().rpc('create_account_access_request', { _target_user_id: targetUserId, _scope: scope, _reason: reason.trim() }));
    if (error) return toast.error(error.message);
    setIssuedCode(data?.[0]?.access_code || '');
    setReason('');
    toast.success('Žádost založena. Kód si bezpečně poznamenej; znovu se nezobrazí.');
    load();
  };

  const decide = async (requestId: string, decision: 'approved' | 'rejected') => {
    const { error } = await Promise.resolve(db().rpc('decide_account_access_request', { _request_id: requestId, _decision: decision, _note: null }));
    if (error) return toast.error(error.message);
    toast.success(decision === 'approved' ? 'Schválení zaznamenáno.' : 'Žádost zamítnuta.');
    load();
  };

  const redeem = async (requestId: string) => {
    const code = (codes[requestId] || '').trim();
    if (!code) return toast.error('Zadej přístupový kód.');
    const { error } = await Promise.resolve(db().rpc('redeem_account_access_code', { _request_id: requestId, _code: code }));
    if (error) return toast.error(error.message);
    toast.success('Citlivá sekce byla odemčena.');
    setCodes(v => ({ ...v, [requestId]: '' }));
    await load();
    onAccessChanged?.();
  };

  const revoke = async (grantId: string) => {
    const { error } = await Promise.resolve(db().rpc('revoke_account_access', { _grant_id: grantId }));
    if (error) return toast.error(error.message);
    toast.success('Přístup byl odvolán.');
    await load();
    onAccessChanged?.();
  };

  if (!user || (!isRektor && !isSpravce)) return null;

  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-semibold">🔐 Odemknutí citlivých sekcí</h2>
        <p className="text-xs text-muted-foreground">Přístup schválí rektor, nebo dva různí správci. U správce se vlastní schválení nepočítá. Platí do ručního odvolání.</p>
      </div>
      {issuedCode && <div className="rounded-xl border border-primary/40 bg-primary/10 p-3"><strong>Nový kód:</strong> <code className="ml-2 font-bold tracking-widest">{issuedCode}</code><p clas[...]
      <div className="grid gap-2 md:grid-cols-[220px_1fr_auto] items-end">
        <div><Label>Rozsah</Label><select value={scope} onChange={e => setScope(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="wa[...]
        <div><Label>Důvod přístupu</Label><Textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} className="min-h-10" /></div>
        <Button onClick={createRequest}>Založit žádost</Button>
      </div>
      {grants.length > 0 && <div className="space-y-2"><h3 className="text-sm font-semibold">Aktivní přístupy</h3>{grants.map(g => <div key={g.id} className="flex justify-between items-center r[...]
      <div className="space-y-2">
        {requests.map(req => {
          const reqApprovals = approvals.filter(a => a.request_id === req.id && a.decision === 'approved');
          const mine = req.requested_by === user.id;
          const alreadyDecided = approvals.some(a => a.request_id === req.id && a.approver_id === user.id);
          return <div key={req.id} className="rounded-xl border border-border p-3 text-sm">
            <div className="flex justify-between gap-3 flex-wrap"><strong>{SCOPE_LABELS[req.scope]}</strong><span className="text-xs uppercase font-bold">{req.status}</span></div>
            <p className="text-xs text-muted-foreground my-1">{req.reason} • schválení {reqApprovals.length}{isRektor ? ' (rektor může rozhodnout sám)' : '/2'}</p>
            <div className="flex gap-2 flex-wrap">
              {req.status === 'pending' && !alreadyDecided && (isRektor || !mine) && <><Button size="sm" onClick={() => decide(req.id, 'approved')}>Schválit</Button><Button size="sm" variant="des[...]
              {req.status === 'approved' && mine && <><Input value={codes[req.id] || ''} onChange={e => setCodes(v => ({ ...v, [req.id]: e.target.value }))} placeholder="Přístupový kód" classN[...]
            </div>
          </div>;
        })}
      </div>
    </div>
  );
}
