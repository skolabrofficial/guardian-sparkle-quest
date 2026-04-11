interface OnlineIndicatorProps {
  lastSeen: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function OnlineIndicator({ lastSeen, size = 'sm', className = '' }: OnlineIndicatorProps) {
  const isOnline = lastSeen ? (Date.now() - new Date(lastSeen).getTime()) < 5 * 60 * 1000 : false;
  const sizes = { sm: 'w-2.5 h-2.5', md: 'w-3 h-3', lg: 'w-3.5 h-3.5' };

  return (
    <span
      className={`inline-block rounded-full border border-white/60 ${sizes[size]} ${className}`}
      style={{
        background: isOnline ? '#22c55e' : '#9ca3af',
        boxShadow: isOnline ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
      }}
      title={isOnline ? 'Online' : lastSeen ? `Naposledy: ${new Date(lastSeen).toLocaleString('cs')}` : 'Neznámý'}
    />
  );
}
