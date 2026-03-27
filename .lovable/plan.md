

## Plán: Přidat ImageUploader a správu obrázků na stránku profilu

### Co se změní

**Soubor: `src/pages/Profil.tsx`**

1. Importovat `ImageUploader` a přidat novou sekci pod stávající profil
2. Přidat seznam vlastních nahraných obrázků uživatele (načtených z `uploaded_images` tabulky) se statusem (pending/approved/rejected)
3. U schválených obrázků zobrazit vygenerovaný vložitelný kód `(vlož XXXXXXXX)`
4. Možnost smazat vlastní obrázky (pending i rejected)
5. ImageUploader použít i pro avatar (`isAvatar={true}`) — volitelně vedle stávajícího přímého uploadu

**Soubor: `supabase/migrations/` — nová migrace**

- Vytvořit storage bucket `uploads` (veřejný), pokud neexistuje
- Přidat RLS politiky pro `uploaded_images`: uživatel vidí vlastní, staff vidí vše
- Přidat DELETE politiku pro vlastní obrázky

### Struktura na stránce profilu

```text
┌─────────────────────────┐
│ 👤 Můj profil           │
│  [avatar, jméno, bio..] │
│  [uložit]               │
├─────────────────────────┤
│ 📤 Nahrát obrázek       │
│  [ImageUploader]        │
├─────────────────────────┤
│ 🖼️ Moje obrázky         │
│  [grid: náhled, status, │
│   kód, smazat]          │
└─────────────────────────┘
```

### Technické detaily

- Obrázky se načtou pomocí `supabase.from('uploaded_images').select('*').eq('user_id', user.id).order('created_at', { ascending: false })`
- Status badge: pending = žlutá, approved = zelená, rejected = červená s důvodem
- Embed kód se zobrazí pouze u approved obrázků
- Refresh seznamu po úspěšném uploadu přes `onUploaded` callback
- Bucket `uploads` musí být vytvořen migrací (momentálně neexistuje)

