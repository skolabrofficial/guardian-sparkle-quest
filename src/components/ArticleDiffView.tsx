interface Props {
  field: string;
  before?: string | null;
  oldChunk?: string | null;
  newChunk?: string | null;
  after?: string | null;
  fallbackOld?: string | null;
  fallbackNew?: string | null;
}

const FIELD_CZ: Record<string, string> = {
  title: 'Název', perex: 'Perex', content: 'Obsah', cover_image: 'Obálka',
  topic_id: 'Téma', author_override: 'Vepsaný autor', author_id: 'Autor',
};

export default function ArticleDiffView({ field, before, oldChunk, newChunk, after, fallbackOld, fallbackNew }: Props) {
  const label = FIELD_CZ[field] || field;
  const hasSnippet = (oldChunk ?? '').length > 0 || (newChunk ?? '').length > 0 || (before ?? '').length > 0 || (after ?? '').length > 0;
  return (
    <div className="rounded-xl border-2 border-border bg-card p-3 text-sm">
      <div className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
      {hasSnippet ? (
        <div className="space-y-1.5 font-serif leading-relaxed">
          <div>
            <span className="text-muted-foreground">…{before}</span>
            <del className="bg-red-100 text-red-900 px-1 rounded">{oldChunk || '∅'}</del>
            <span className="text-muted-foreground">{after}…</span>
          </div>
          <div>
            <span className="text-muted-foreground">…{before}</span>
            <ins className="no-underline bg-green-100 text-green-900 px-1 rounded">{newChunk || '∅'}</ins>
            <span className="text-muted-foreground">{after}…</span>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="text-xs"><del className="bg-red-100 text-red-900 px-1 rounded">{fallbackOld || '—'}</del></div>
          <div className="text-xs"><ins className="no-underline bg-green-100 text-green-900 px-1 rounded">{fallbackNew || '—'}</ins></div>
        </div>
      )}
    </div>
  );
}
