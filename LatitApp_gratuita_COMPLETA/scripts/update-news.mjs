import fs from 'node:fs/promises';
import * as cheerio from 'cheerio';

const URL = 'https://direzioneinvestigativaantimafia.interno.gov.it/category/comunicatistampa/';
const OUT = 'LatitApp_gratuita_COMPLETA/news.json';

const KEYWORDS = /maf|camorr|ndranghet|\bclan\b|latitant|blitz|arrest|sequestr|estors|riciclag|criminalit[àa] organizzata|associazione per delinquere/i;
const REGIONI = [
  ['Campania',['Napoli','Casoria','Casal di Principe','Caserta','Salerno','Avellino','Benevento','Castel Volturno']],
  ['Puglia',['Bari','Lecce','Brindisi','Foggia','Taranto','Andria','Barletta']],
  ['Lazio',['Roma','Latina','Frosinone','Viterbo','Rieti']],
  ['Calabria',['Vibo Valentia','Reggio Calabria','Catanzaro','Cosenza','Crotone']],
  ['Sicilia',['Palermo','Catania','Messina','Trapani','Agrigento','Ragusa','Siracusa','Caltanissetta','Enna']],
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

function clean(s=''){ return s.replace(/\s+/g,' ').trim(); }
function isoDate(s=''){
  const m=s.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if(m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  const mesi={gennaio:1,febbraio:2,marzo:3,aprile:4,maggio:5,giugno:6,luglio:7,agosto:8,settembre:9,ottobre:10,novembre:11,dicembre:12};
  const x=s.toLowerCase().match(/(\d{1,2})\s+([a-zà]+)\s+(\d{4})/);
  if(x && mesi[x[2]]) return `${x[3]}-${String(mesi[x[2]]).padStart(2,'0')}-${x[1].padStart(2,'0')}`;
  return null;
}
function category(title){
  const t=title.toLowerCase();
  if(/latitant/.test(t)) return 'Latitanti';
  if(/identikit/.test(t)) return 'Identikit';
  if(/blitz|arrest|misure cautelari/.test(t)) return 'Blitz';
  return 'Operazione';
}
function location(title, text){
  const t=`${title} ${text}`;
  for(const [region, cities] of REGIONI){
    const city=cities.find(c=>new RegExp(`\\b${c.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}\\b`,'i').test(t));
    if(city) return `${city}, ${region}`;
  }
  return 'Italia';
}

const res=await fetch(URL,{headers:{'user-agent':'LatitApp-news-updater/1.0'}});
if(!res.ok) throw new Error(`DIA HTTP ${res.status}`);
const html=await res.text();
const $=cheerio.load(html);
const found=[];
$('a[href]').each((_,a)=>{
  const href=$(a).attr('href');
  const title=clean($(a).text());
  if(!href || !title || !/direzioneinvestigativaantimafia\.interno\.gov\.it\/\d{4}\//.test(href)) return;
  if(!KEYWORDS.test(title)) return;
  const parent=clean($(a).parent().parent().text());
  const data=isoDate(parent) || isoDate($(a).closest('article,li,div').text());
  if(!data) return;
  const url = new globalThis.URL(href, 'https://direzioneinvestigativaantimafia.interno.gov.it/').href;
  const luogo=location(title,parent);
  const sintesi=`Comunicazione istituzionale della Direzione Investigativa Antimafia. ${luogo}.`;
  found.push({data,categoria:category(title),titolo:title,sintesi,dettagli:[`Fonte istituzionale: Direzione Investigativa Antimafia.`,`La scheda completa è disponibile sul sito ufficiale della DIA.`],fonte:'Direzione Investigativa Antimafia',url});
});

const unique=[...new Map(found.map(x=>[x.url,x])).values()]
  .sort((a,b)=>b.data.localeCompare(a.data))
  .slice(0,80);

let old=[];
try { old=JSON.parse(await fs.readFile(OUT,'utf8')); } catch {}
const merged=[...unique,...old].filter(x=>x?.url);
const map=new Map();
for(const x of merged) if(!map.has(x.url)) map.set(x.url,x);
const result=[...map.values()].sort((a,b)=>b.data.localeCompare(a.data)).slice(0,200);
await fs.writeFile(OUT,JSON.stringify(result,null,2)+'\n','utf8');
console.log(`DIA: ${unique.length} nuove schede; archivio: ${result.length}`);
