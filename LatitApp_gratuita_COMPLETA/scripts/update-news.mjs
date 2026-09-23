import fs from 'node:fs/promises';
import * as cheerio from 'cheerio';

const OUT = 'LatitApp_gratuita_COMPLETA/news.json';

const SOURCES = [
  {
    name: 'la Repubblica',
    url: 'https://www.repubblica.it/static/servizi/rss/cronaca.xml'
  },
  {
    name: 'Google News - Corriere della Sera',
    url: 'https://news.google.com/rss/search?q=site%3Acorriere.it%20(mafia%20OR%20clan%20OR%20camorra%20OR%20ndrangheta%20OR%20blitz%20OR%20latitante%20OR%20antimafia)&hl=it&gl=IT&ceid=IT%3Ait'
  },
  {
    name: 'Google News - Il Messaggero',
    url: 'https://news.google.com/rss/search?q=site%3Ailmessaggero.it%20(mafia%20OR%20clan%20OR%20camorra%20OR%20ndrangheta%20OR%20blitz%20OR%20latitante%20OR%20antimafia)&hl=it&gl=IT&ceid=IT%3Ait'
  },
  {
    name: 'Google News - La Stampa',
    url: 'https://news.google.com/rss/search?q=site%3Alastampa.it%20(mafia%20OR%20clan%20OR%20camorra%20OR%20ndrangheta%20OR%20blitz%20OR%20latitante%20OR%20antimafia)&hl=it&gl=IT&ceid=IT%3Ait'
  },
  {
    name: 'Google News - Il Sole 24 Ore',
    url: 'https://news.google.com/rss/search?q=site%3Ailsole24ore.com%20(mafia%20OR%20clan%20OR%20camorra%20OR%20ndrangheta%20OR%20blitz%20OR%20antimafia)&hl=it&gl=IT&ceid=IT%3Ait'
  }
];

const DIA_URL =
  'https://direzioneinvestigativaantimafia.interno.gov.it/category/comunicatistampa/';

const KEYWORDS =
  /maf|camorr|ndranghet|cosa\s+nostra|\bclan\b|latitant|blitz|arrest|sequestr|estors|riciclag|criminalit[àa]\s+organizzata|associazione\s+mafiosa|associazione\s+per\s+delinquere|metodo\s+mafioso|DDA|antimafia|operazione\s+antimafia|cosca|pizzo|traffico\s+di\s+droga/i;

const REGIONI = [
  ['Campania',['Napoli','Casoria','Caivano','Casal di Principe','Caserta','Salerno','Avellino','Benevento']],
  ['Puglia',['Bari','Lecce','Brindisi','Foggia','Taranto','Andria','Barletta','Manduria']],
  ['Lazio',['Roma','Latina','Frosinone','Viterbo','Rieti']],
  ['Calabria',['Vibo Valentia','Reggio Calabria','Catanzaro','Cosenza','Crotone','Corigliano-Rossano']],
  ['Sicilia',['Palermo','Catania','Messina','Trapani','Agrigento','Ragusa','Siracusa','Caltanissetta','Enna','Gela']],
  ['Liguria',['Genova','La Spezia','Savona','Imperia']],
  ['Lombardia',['Milano','Brescia','Bergamo','Pavia','Varese','Como','Monza']],
  ['Emilia-Romagna',['Bologna','Parma','Modena','Reggio Emilia','Ravenna','Rimini','Ferrara','Piacenza']],
  ['Basilicata',['Potenza','Matera']],
  ['Piemonte',['Torino','Cuneo','Novara','Alessandria']],
  ['Toscana',['Firenze','Pisa','Livorno','Lucca','Prato','Arezzo','Siena','Grosseto']],
  ['Sardegna',['Cagliari','Sassari','Nuoro','Oristano']],
  ['Veneto',['Venezia','Verona','Padova','Vicenza','Treviso','Rovigo','Belluno']],
  ['Friuli-Venezia Giulia',['Trieste','Udine','Pordenone','Gorizia']]
];

function clean(s = '') {
  return s.replace(/\s+/g, ' ').trim();
}

function dateFromString(s = '') {
  const d = new Date(s);

  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  const m = s.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);

  if (m) {
    return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  }

  return null;
}

function relevant(title = '', description = '') {
  return KEYWORDS.test(`${title} ${description}`);
}

function category(title = '') {
  const t = title.toLowerCase();

  if (/latitant/.test(t)) return 'Latitanti';
  if (/identikit/.test(t)) return 'Identikit';

  return 'Operazioni';
}

function location(title = '', text = '') {
  const t = `${title} ${text}`;

  for (const [region, cities] of REGIONI) {
    for (const city of cities) {
      const escaped = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      if (new RegExp(`\\b${escaped}\\b`, 'i').test(t)) {
        return `${city}, ${region}`;
      }
    }
  }

  return 'Italia';
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'LatitApp-news-updater/1.0',
      'accept':
        'text/html,application/xhtml+xml,application/xml,text/xml'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.text();
}

/* =========================
   DIA
========================= */

async function fetchDIA() {
  const found = [];

  try {
    const html = await fetchText(DIA_URL);
    const $ = cheerio.load(html);

    $('a[href]').each((_, a) => {
      const href = $(a).attr('href');
      const title = clean($(a).text());

      if (!href || !title || !relevant(title)) return;

      if (!href.includes('direzioneinvestigativaantimafia.interno.gov.it')) {
        return;
      }

      const container = clean(
        $(a).closest('article,li,div').text()
      );

      const data =
        dateFromString(container) ||
        dateFromString(title);

      if (!data) return;

      const url = new globalThis.URL(
        href,
        DIA_URL
      ).href;

      const luogo = location(title, container);

      found.push({
        data,
        categoria: category(title),
        titolo: title,
        sintesi:
          luogo === 'Italia'
            ? 'Comunicazione istituzionale della Direzione Investigativa Antimafia.'
            : `${luogo}. Comunicazione istituzionale della Direzione Investigativa Antimafia.`,
        dettagli: [
          'Fonte istituzionale: Direzione Investigativa Antimafia.',
          'La scheda completa è disponibile sul sito ufficiale della DIA.'
        ],
        fonte: 'Direzione Investigativa Antimafia',
        url
      });
    });

  } catch (error) {
    console.error('Errore DIA:', error.message);
  }

  return found;
}

/* =========================
   RSS / FEED
========================= */

async function fetchRSS(source) {
  const found = [];

  try {
    const xml = await fetchText(source.url);
    const $ = cheerio.load(xml, { xmlMode: true });

    $('item').each((_, item) => {
      const title = clean($(item).find('title').first().text());
      const description = clean(
        $(item).find('description').first().text()
      );

      const link =
        clean($(item).find('link').first().text()) ||
        $(item).find('link').attr('href') ||
        '';

      const pubDate = clean(
        $(item).find('pubDate').first().text()
      );

      if (!title || !link || !relevant(title, description)) {
        return;
      }

      const data = dateFromString(pubDate);

      if (!data) return;

      const luogo = location(title, description);

      found.push({
        data,
        categoria: category(title),
        titolo: title,
        sintesi:
          luogo === 'Italia'
            ? `Aggiornamento su mafia, criminalità organizzata, arresti o operazioni.`
            : `${luogo}. Aggiornamento su mafia, criminalità organizzata, arresti o operazioni.`,
        dettagli: [
          `Fonte: ${source.name}.`,
          'Leggi l'articolo completo alla fonte originale.'
        ],
        fonte: source.name,
        url: link
      });
    });

  } catch (error) {
    console.error(`Errore ${source.name}:`, error.message);
  }

  return found;
}

/* =========================
   RACCOLTA
========================= */

const dia = await fetchDIA();

const feeds = [];

for (const source of SOURCES) {
  const risultati = await fetchRSS(source);

  console.log(
    `${source.name}: ${risultati.length} articoli trovati`
  );

  feeds.push(risultati);
}

const nuove = [
  ...dia,
  ...feeds.flat()
];

/* =========================
   ARCHIVIO
========================= */

let old = [];

try {
  old = JSON.parse(
    await fs.readFile(OUT, 'utf8')
  );
} catch {
  old = [];
}

const all = [
  ...nuove,
  ...old
].filter(
  item =>
    item &&
    item.url &&
    item.titolo &&
    item.data
);

/* Deduplica per URL */
const map = new Map();

for (const item of all) {
  if (!map.has(item.url)) {
    map.set(item.url, item);
  }
}

const result = [...map.values()]
  .sort((a, b) =>
    String(b.data).localeCompare(String(a.data))
  )
  .slice(0, 500);

await fs.writeFile(
  OUT,
  JSON.stringify(result, null, 2) + '\n',
  'utf8'
);

console.log(
  `DIA: ${dia.length} | Altre fonti: ${nuove.length - dia.length} | Archivio totale: ${result.length}`
);
