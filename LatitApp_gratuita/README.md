# LatitApp — versione gratuita con aggiornamento automatico

Questa cartella contiene una versione pronta per **GitHub Pages + GitHub Actions**, senza Firebase Blaze. GitHub Pages è disponibile gratuitamente nei repository pubblici con GitHub Free e le Actions standard sono gratuite nei repository pubblici.

## Cosa fa
- mantiene l'app iPhone e il suo archivio incorporato;
- carica anche `news.json` quando l'app è online;
- aggiorna `news.json` ogni 30 minuti tramite GitHub Actions;
- filtra le comunicazioni della DIA su latitanti, operazioni, blitz, arresti, sequestri e criminalità organizzata;
- nell'app le news automatiche vengono ricaricate ogni 15 minuti mentre la pagina è aperta;
- se `news.json` non è raggiungibile, l'app continua a funzionare con l'archivio incorporato.

## Importante su ANSA
ANSA dichiara che i propri RSS sono destinati a programmi di lettura/aggregazione e specifica che non è consentita la pubblicazione dei titoli ANSA su siti web senza autorizzazione. Per questo **questa versione non copia automaticamente i titoli ANSA**. ANSA può essere aggiunta solo con un'autorizzazione/licenza compatibile.

## Pubblicazione gratuita
1. Crea un repository **pubblico** su GitHub.
2. Carica tutti i file di questa cartella nella radice del repository.
3. In Settings → Pages scegli la pubblicazione dalla branch `main`.
4. In Actions esegui una volta `Aggiorna news LatitApp` con `Run workflow`.
5. Da quel momento la raccolta DIA viene aggiornata automaticamente ogni 30 minuti.

Nota: GitHub avverte che gli scheduled workflow nei repository pubblici possono essere disattivati dopo 60 giorni senza attività del repository; se succede, basta riattivarli.
