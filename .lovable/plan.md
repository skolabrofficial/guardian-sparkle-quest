

## Plán: Vložit obsah migrací jako příspěvek do fóra kurzu

### Co se udělá

Vložím do tabulky `forum_posts` nový příspěvek s `course_id = '0f1d13b8-0095-4a6a-93ed-e22c38e1dd6f'` obsahující všech 6 migračních souborů formátovaných v Markdownu.

### Technické detaily

- Použiji **insert tool** pro vložení jednoho řádku do `forum_posts`
- `author_id` bude ID aktuálně přihlášeného uživatele — potřebuji ho zjistit, nebo použít ID vývojáře z existujících dat
- Obsah bude formátovaný jako Markdown s SQL bloky pro každou migraci
- Příspěvek nebude odpovědí (parent_id = null)

### Obsah příspěvku

6 sekcí, každá se jménem migračního souboru jako nadpis a SQL kódem v ````sql` bloku:

1. `20260325175956` — Základní schéma (profily, role, fakulty, kurzy, enrollments, rozvrh, doučování, výpisky, studijní plány, oznámení, audit, nastavení, notifikace, hlášení + RLS + triggery)
2. `20260325180009` — Oprava audit log INSERT policy
3. `20260326203214` — Dean ID, answer visibility, forum_posts, user_blocks
4. `20260326213526` — Avatars bucket, block_messages
5. `20260327185111` — Realtime pro notifikace
6. `20260327200500` — Uploaded images + uploads bucket

