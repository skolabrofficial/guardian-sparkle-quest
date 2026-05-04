import AppLayout from '@/components/layout/AppLayout';

export default function Gdpr() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto py-8 px-4 prose prose-sm dark:prose-invert">
        <h1>Podmínky ochrany osobních údajů</h1>
        <p className="text-muted-foreground">Naposledy aktualizováno: 4. května 2026</p>

        <h2>1. Kdo jsme</h2>
        <p>
          Provozovatelem této vzdělávací platformy (dále jen „<strong>Univerzita</strong>") je tým správy projektu.
          Tyto podmínky popisují, jaké osobní údaje zpracováváme, proč je zpracováváme a jaká jsou vaše práva podle
          obecného nařízení o ochraně osobních údajů (GDPR, EU 2016/679).
        </p>

        <h2>2. Jaké údaje zpracováváme</h2>
        <ul>
          <li><strong>Účet</strong>: e-mail, přezdížku, profilový obrázek, datum vytvoření účtu, čas posledního přihlášení.</li>
          <li><strong>Obsah, který vytvoříte</strong>: příspěvky, poznámky, dotazy, odpovědi a nahrané soubory.</li>
          <li><strong>Provozní údaje</strong>: IP adresa a typ prohlížeče (User-Agent) pro účely bezpečnosti
            a vyšetřování zneužití. K těmto údajům má přístup pouze Rektor.</li>
          <li><strong>Auditní záznamy</strong>: záznamy o důležitých akcích (úpravy, mazání, blokace) – viditelné
            pro Správce a Rektora.</li>
          <li><strong>Cookies</strong>: technické (přihlášení, předvolby) a volitelné analytické.</li>
        </ul>

        <h2>3. Účely a právní základy</h2>
        <ul>
          <li><strong>Plnění služby</strong> (čl. 6 odst. 1 písm. b GDPR) – účet, obsah, výuka.</li>
          <li><strong>Oprávněný zájem</strong> (čl. 6 odst. 1 písm. f GDPR) – bezpečnost, prevence zneužití,
            moderace, technická podpora.</li>
          <li><strong>Souhlas</strong> (čl. 6 odst. 1 písm. a GDPR) – analytické cookies, registrace.</li>
        </ul>

        <h2>4. Doba uchování</h2>
        <ul>
          <li>Údaje účtu: po dobu jeho existence, případně 30 dní po smazání pro bezpečnostní zálohy.</li>
          <li>IP adresy a auditní záznamy: maximálně 12 měsíců, není-li jejich uchování nutné pro řešení sporu.</li>
          <li>Obsah, který sami zveřejníte: do jeho smazání vámi nebo Správcem.</li>
        </ul>

        <h2>5. Komu údaje předáváme</h2>
        <p>
          Údaje nepředáváme třetím stranám pro marketing. Pro provoz využíváme zpracovatele technické
          infrastruktury (cloudový hosting), který je vázán smlouvou o zpracování osobních údajů.
        </p>

        <h2>6. Vaše práva</h2>
        <ul>
          <li>Právo na přístup (kopii svých údajů).</li>
          <li>Právo na opravu nebo doplnění.</li>
          <li>Právo na výmaz („být zapomenut").</li>
          <li>Právo na omezení zpracování.</li>
          <li>Právo na přenositelnost.</li>
          <li>Právo vznést námitku.</li>
          <li>Právo odvolat udělený souhlas (např. cookie banner).</li>
          <li>Právo podat stížnost u Úřadu pro ochranu osobních údajů (uoou.gov.cz).</li>
        </ul>

        <h2>7. Cookies</h2>
        <p>
          Technické cookies používáme vždy – jsou nezbytné pro přihlášení a fungování webu.
          Analytické cookies používáme pouze s vaším souhlasem, který udělujete v cookie liště
          při první návštěvě a můžete jej kdykoli změnit.
        </p>

        <h2>8. Kontakt</h2>
        <p>
          Žádosti dle čl. 15–22 GDPR nebo dotazy směřujte na Rektora prostřednictvím
          interního kontaktního formuláře nebo e-mailu uvedeného na stránce „Pověření".
        </p>
      </div>
    </AppLayout>
  );
}
