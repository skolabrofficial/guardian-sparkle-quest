import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface BlockRecord {
  id: string;
  reason: string;
  details: string | null;
  block_type: string;
  severity: string;
  is_permanent: boolean | null;
  blocked_at: string;
  expires_at: string | null;
  appeal_text: string | null;
  appeal_status: string | null;
  appeal_response: string | null;
  affected_areas: string[] | null;
  warning_count: number | null;
  block_count: number | null;
  escalated: boolean | null;
}

export default function Blocked() {
  const { user, signOut } = useAuth();
  const [block, setBlock] = useState<BlockRecord | null>(null);
  const [appealText, setAppealText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadBlock();
  }, [user]);

  const loadBlock = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_blocks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('blocked_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setBlock(data);
    setLoading(false);
  };

  // 1. Odesílání odvolání
  const submitAppeal = async () => {
    if (!block || !appealText.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('user_blocks').update({
      appeal_text: appealText,
      appeal_submitted_at: new Date().toISOString(),
      appeal_status: 'pending',
    }).eq('id', block.id);
    setSubmitting(false);
    if (error) toast.error(error.message);
    else { toast.success('Odvolání odesláno'); loadBlock(); }
  };

  // 2. Revize času do osvobození
  const getRemainingTime = () => {
    if (!block?.expires_at) return 'Neurčeno';
    const diff = new Date(block.expires_at).getTime() - Date.now();
    if (diff <= 0) return 'Blokace vypršela.';
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} dní, ${hours % 24} hodin`;
    return `${hours} hodin`;
  };

  // 3. Zjištění stupně závažnosti blokace
  const getSeverityLabel = () => {
    const map: Record<string, string> = { low: 'Drobná', standard: 'Klasická', high: 'Mimořádná', critical: 'Bezpečnostní hrozba' };
    return map[block?.severity || 'standard'] || block?.severity;
  };

  // 4. Zjištění momentního omezení
  const getBlockTypeLabel = () => {
    const map: Record<string, string> = { full: 'Plná blokace', partial: 'Částečná blokace', warning: 'Varování', temporary: 'Drobná - naučná' };
    return map[block?.block_type || 'full'] || block?.block_type;
  };

  // 5. Revize (ne)zamítnutí odvolání
  const canAppeal = () => {
    return block && (!block.appeal_status || block.appeal_status === 'none' || block.appeal_status === 'rejected');
  };

  // 6. Revize stavu odvolání
  const getAppealStatusLabel = () => {
    const map: Record<string, string> = { none: 'nepodáno', pending: 'neposouzeno', approved: 'schváleno', rejected: 'zámítnuto', reviewing: 'zpracováváno' };
    return map[block?.appeal_status || 'none'] || block?.appeal_status;
  };

  // 7. Pernamentnost blokace
  const isPermanent = () => block?.is_permanent === true;

  // 8. Zjištění ovlivněných oblastí
  const getAffectedAreas = () => {
    if (!block?.affected_areas?.length) return ['Veškerý přístup'];
    return block.affected_areas;
  };

  // 9. Zjištění (ne)platnosti blokace
  const isExpired = () => {
    if (!block?.expires_at) return false;
    return new Date(block.expires_at).getTime() < Date.now();
  };

  // 10. Zjištění počtu varování
  const getWarningInfo = () => {
    return `Počet varování: ${block?.warning_count || 0}`;
  };

  // 11. Zjištění pořadí blokace
  const getBlockCountInfo = () => {
    return `Pořadí blokace: ${block?.block_count || 1}. blokace`;
  };

  // 12. Zjištění vyeskalace blokace
  const isEscalated = () => block?.escalated === true;

  // 13. Formát a pásmo blokace
  const getBlockedDate = () => {
    if (!block) return '';
    return new Date(block.blocked_at).toLocaleString('cs-CZ');
  };

  // 14. Formát a pásmo expirace blokace
  const getExpiryDate = () => {
    if (!block?.expires_at) return 'Bez konce';
    return new Date(block.expires_at).toLocaleString('cs-CZ');
  };

  // 15. Get protocol number
  const getProtocolNumber = () => {
    if (!block) return '';
    return `BLK-${block.id.slice(0, 8).toUpperCase()}`;
  };

  // 16. Can resubmit appeal
  const canResubmitAppeal = () => {
    return block?.appeal_status === 'rejected';
  };

  // 17. Get appeal response
  const getAppealResponse = () => {
    return block?.appeal_response || null;
  };

  // 18. Get severity color
  const getSeverityColor = () => {
    const map: Record<string, string> = { low: '#f59e0b', standard: '#ef4444', high: '#dc2626', critical: '#991b1b' };
    return map[block?.severity || 'standard'] || '#ef4444';
  };

  // 19. Get block summary
  const getBlockSummary = () => {
    return `${getBlockTypeLabel()} • ${getSeverityLabel()} • ${isPermanent() ? 'Trvalá' : 'Dočasná'}`;
  };

  // 20. Logout from blocked page
  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Načítání...</div>;
  if (!block) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #fff0f0, #ffe8e8)' }}>
      <div className="w-full max-w-2xl">
        <div className="panel-card border-2" style={{ borderColor: getSeverityColor() }}>
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🚫</div>
            <h1 className="text-2xl font-extrabold" style={{ color: getSeverityColor() }}>Přístup zablokován</h1>
            <p className="text-muted-foreground mt-1">{getBlockSummary()}</p>
          </div>

          {/* Protocol */}
          <div className="rounded-xl p-4 mb-4" style={{ background: '#f8f0f0', border: '1px dashed #e0c0c0' }}>
            <h3 className="mt-0 text-sm font-extrabold uppercase tracking-wider mb-3" style={{ color: '#8b4545' }}>
              Protokol o blokaci č. {getProtocolNumber()}
            </h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Typ:</span><strong>{getBlockTypeLabel()}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Závažnost:</span><strong style={{ color: getSeverityColor() }}>{getSeverityLabel()}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Trvalá:</span><strong>{isPermanent() ? 'Ano' : 'Ne'}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Datum blokace:</span><strong>{getBlockedDate()}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Platnost do:</span><strong>{getExpiryDate()}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Zbývající čas:</span><strong>{getRemainingTime()}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{getWarningInfo()}</span><span>{getBlockCountInfo()}</span></div>
              {isEscalated() && <div className="text-xs font-bold" style={{ color: '#991b1b' }}>⚠ Eskalováno vedení</div>}
              {isExpired() && <div className="text-xs font-bold text-green-600">✓ Blokace vypršela — kontaktujte správce</div>}
            </div>
          </div>

          {/* Reason */}
          <div className="panel-card mb-4">
            <h4 className="mt-0 text-sm">Důvod blokace</h4>
            <p className="text-sm font-bold">{block.reason}</p>
            {block.details && <p className="text-sm text-muted-foreground mt-1">{block.details}</p>}
          </div>

          {/* Affected areas */}
          <div className="panel-card mb-4">
            <h4 className="mt-0 text-sm">Dotčené oblasti</h4>
            <div className="flex flex-wrap gap-1.5">
              {getAffectedAreas().map((area, i) => (
                <span key={i} className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: '#fde8e8', color: '#991b1b' }}>{area}</span>
              ))}
            </div>
          </div>

          {/* Appeal section */}
          <div className="panel-card mb-4">
            <h4 className="mt-0 text-sm">Odvolání</h4>
            <p className="text-xs text-muted-foreground mb-2">Stav: <strong>{getAppealStatusLabel()}</strong></p>
            
            {getAppealResponse() && (
              <div className="rounded-lg p-3 mb-3 text-sm" style={{ background: '#f0f4ff' }}>
                <strong className="block text-xs mb-1">Odpověď správce:</strong>
                {getAppealResponse()}
              </div>
            )}

            {block.appeal_text && block.appeal_status === 'pending' && (
              <div className="rounded-lg p-3 mb-3 text-sm" style={{ background: '#fff8e0' }}>
                <strong className="block text-xs mb-1">Vaše odvolání:</strong>
                {block.appeal_text}
              </div>
            )}

            {canAppeal() && (
              <div className="grid gap-2">
                <textarea
                  placeholder="Napište důvod odvolání... Vysvětlete, proč by měla být blokace přehodnocena."
                  value={appealText}
                  onChange={e => setAppealText(e.target.value)}
                  className="border-2 border-red-200 rounded-xl py-2.5 px-3 text-sm outline-none min-h-[100px] resize-y"
                />
                <button
                  onClick={submitAppeal}
                  disabled={submitting || !appealText.trim()}
                  className="btn-alik-primary text-sm"
                >
                  {submitting ? 'Odesílání...' : canResubmitAppeal() ? 'Podat nové odvolání' : 'Podat odvolání'}
                </button>
              </div>
            )}

            {block.appeal_status === 'pending' && (
              <p className="text-sm text-muted-foreground mt-2">Vaše odvolání je v přezkoumání. Vyčkejte prosím.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleLogout} className="btn-alik-outline text-sm">Odhlásit se</button>
            <button onClick={loadBlock} className="btn-alik-outline text-sm">Obnovit stav</button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground mt-4">
            V případě dotazů kontaktujte vedení univerzity na Alík.cz
          </p>
        </div>
      </div>
    </div>
  );
}
