/* Motor IA propone / código verifica · v12. Fuente única. Local, determinista, sin DOM.
   Segmentos VERBATIM: copia byte a byte de laboratorio-v27.html (scripts/verify-extraction.js lo comprueba).
   Segmento ADAPTER: única parte no literal (API sin DOM); se prueba por equivalencia (tests/equivalence.test.js). */
(function(root){'use strict';
/* ==== VERBATIM v27 L176-184 ==== */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const unique=a=>[...new Set(a)];
const list=s=>String(s??'').split(',').map(x=>x.trim()).filter(Boolean);
const tokens=s=>String(s??'').match(/[\p{L}\p{N}][\p{L}\p{N}_-]*/gu)||[];
const ABBR=/(?<![\p{L}])(art|arts|apdo|sr|sra|sres|dr|dra|ud|uds|núm|pág|págs|ej|tel|avda)\.(?=\s)/giu;
const sentences=s=>String(s??'').replace(/\r/g,'').replace(ABBR,'$1\u2024').split(/(?<=[.!?])\s+|\n+/).map(x=>x.trim().replace(/\u2024/g,'.')).filter(Boolean);
const wordRe=w=>new RegExp('(?<![\\p{L}\\p{N}])'+norm(w).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![\\p{L}\\p{N}])','u');
const has=(text,w)=>wordRe(String(w).replace(/\s+/g,' ')).test(norm(text).replace(/\s+/g,' '));
/* ==== END VERBATIM ==== */
/* ==== VERBATIM v27 L186-201 ==== */
const PROT={money:'Importes',date:'Fechas',time:'Horas',url:'URLs',email:'Correos',phone:'Teléfonos',identifier:'Códigos / identificadores',number:'Otros números',deadline:'Plazos',legal:'Referencias legales'};
const STYLE={forbidden:'Términos prohibidos',required:'Términos obligatorios',length:'Longitud de frase',oneInstruction:'Una instrucción por frase',negation:'Negaciones',vague:'Términos vagos',terminology:'Terminología'};
const LABEL={...PROT,...STYLE};
const ALLP=Object.keys(PROT);
const ENGINE='v12',FEM=new Set(['date','time','url','legal']);
/* Alcance declarado del motor. Las pruebas comprueban que cada ejemplo se reconoce (o no) de verdad. */
const SCOPE={
 date:{name:'Fechas',ok:['15/10/2026','15-10-26','2026-10-15','15 de octubre de 2026','15 de octubre','October 15, 2026','15th of October 2026'],no:['2026/10/15','15 octubre 2026','15 Oct 2026','octubre de 2026','quince de octubre de 2026']},
 money:{name:'Importes',ok:['29,90 €','€29,90','29.90 EUR','29,90 euros','1.250,00 €','$20'],no:['veintinueve euros','1,5 millones de euros','29,90 dólares']},
 time:{name:'Horas',ok:['09:30','9:30 h','17 h','17h30','17.30 h','5:00 PM','17 horas'],no:['las nueve y media','las cinco de la tarde']}};
const scopeHtml=()=>`<details class="sub"><summary>Más información sobre qué puede verificar el programa</summary><div class="body"><p class="small">Motor ${ENGINE}</p>`+Object.values(SCOPE).map(x=>`<p class="small"><b>${x.name}</b>. Reconoce: ${x.ok.map(esc).join(' · ')}. No reconoce (no se evalúa): ${x.no.map(esc).join(' · ')}.</p>`).join('')+`<p class="small">Lo que no figura como reconocido no se evalúa. Al traducir, los plazos no se evalúan. El programa no comprueba el significado del texto.</p></div></details>`;
/* Prohibidos: una sola palabra; -o/-a/-os/-as entre sí, -e → +s, consonante → +es. Sin lematizador. */
const forbVars=w=>{const n=norm(w).trim();if(!n||/\s/.test(n))return[n];const m=n.match(/^(.{2,})(os|as|o|a)$/);
 if(m)return[m[1]+'o',m[1]+'a',m[1]+'os',m[1]+'as'];if(/e$/.test(n))return[n,n+'s'];if(/[^aeious]$/.test(n))return[n,n+'es'];return[n]};
/* Huella de reglas: FNV-1a de 32 bits (identifica, no es criptográfica) */
const fnv=t=>{let h=0x811c9dc5;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return h.toString(16).padStart(8,'0')};
/* ==== END VERBATIM ==== */
/* ==== VERBATIM v27 L203-216 ==== */
const PROFILES={
 ayuntamiento:{name:'Ayuntamiento',desc:'Comunicación a ciudadanía: claridad y conservación estricta de datos.',
  on:[...ALLP,'forbidden','required','length','oneInstruction','negation','vague','terminology'],
  s:{maxWords:20,forbidden:'urgente, inmediatamente, garantizado, obligatorio',required:'ayuntamiento, ciudadanía',vague:'esto, ello, asunto, tema, próximamente, adecuadamente',terms:'ciudadano=ciudadanía, usuario=persona'}},
 sanidad:{name:'Sanidad',desc:'Fechas, cantidades, horarios y términos clínicos intactos.',
  on:[...ALLP,'forbidden','length','oneInstruction','negation','vague','terminology'],
  s:{maxWords:20,forbidden:'garantizado, siempre, nunca, inmediatamente',required:'',vague:'esto, ello, cosa, asunto, próximamente, adecuadamente',terms:'paciente=persona, cita=consulta'}},
 empresa:{name:'Empresa',desc:'Mensajes operativos: datos y códigos intactos, terminología estable.',
  on:[...ALLP,'forbidden','length','oneInstruction','vague','terminology'],
  s:{maxWords:25,forbidden:'urgente, garantizado, siempre, nunca',required:'',vague:'esto, ello, cosa, asunto, próximamente',terms:'clave=contraseña, app=aplicación'}},
 base:{name:'Reglas básicas',desc:'Mínimo para probar IA propone → código verifica.',
  on:[...ALLP,'forbidden','required','length','oneInstruction','terminology'],
  s:{maxWords:20,forbidden:'',required:'',vague:'',terms:''}}
};
/* ==== END VERBATIM ==== */
/* ==== VERBATIM v27 L219-309 ==== */
const MONTHS='enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre';
const MONTHS_EN='january|february|march|april|may|june|july|august|september|october|november|december';
const NUMW={un:1,una:1,uno:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,veintiun:21,veintiuno:21,veintiuna:21,veintidos:22,veintitres:23,veinticuatro:24,veinticinco:25,veintiseis:26,veintisiete:27,veintiocho:28,veintinueve:29,treinta:30,cuarenta:40,cincuenta:50,sesenta:60,setenta:70,ochenta:80,noventa:90};
const WORDNUM='(?:un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|diecis[eé]is|diecisiete|dieciocho|diecinueve|veinte|veinti(?:[uú]n|uno|una|d[oó]s|tr[eé]s|cuatro|cinco|s[eé]is|siete|ocho|nueve)|(?:treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)(?:\\s+y\\s+(?:un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve))?)';
const ORD='primer[oa]|segund[oa]|tercer[oa]|cuart[oa]|quint[oa]|sext[oa]|s[eé]ptim[oa]|octav[oa]|noven[oa]|d[eé]cim[oa]|[uú]nic[oa]';
const patterns={
 url:/https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)]|(?<![\w\/.@-])www\.[^\s<>"']*[^\s<>"'.,;:!?)]/gi,
 email:/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
 date:new RegExp('(?<!\\d)\\d{4}-\\d{2}-\\d{2}(?!\\d)|(?<!\\d)\\d{1,2}[\\/.-]\\d{1,2}[\\/.-]\\d{2,4}(?!\\d)|(?<!\\d)\\d{1,2}(?:\\.?[º°])?\\s+de\\s+(?:'+MONTHS+')(?:\\s+del?\\s+\\d{4})?|(?<!\\p{L})(?:'+MONTHS_EN+')\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}|(?<!\\d)\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?:'+MONTHS_EN+')(?:,?\\s+\\d{4})?','giu'),
 time:/(?<!\d)\d{1,2}:\d{2}(?:\s?(?:h(?![\p{L}])|a\.m\.|p\.m\.|am(?![\p{L}])|pm(?![\p{L}])))?(?!\d)|(?<!\d)\d{1,2}\s?(?:a\.m\.|p\.m\.|am(?![\p{L}])|pm(?![\p{L}]))|(?<![\d:.])\d{1,2}\s?h\s?\d{2}(?!\d)|(?<![\d.,])\d{1,2}\.\d{2}\s?(?:h|horas?)(?![\p{L}\p{N}])|(?<![\d:.,])\d{1,2}\s?(?:h|horas?)(?![\p{L}\p{N}])/giu,
 money:/(?<![\w.,])(?:(?:€|\$|£|USD\s?|EUR\s?)\s?(?:\d{1,3}(?:[.,\s]\d{3})+|\d+)(?:[.,]\d{1,2})?(?!\d)|(?:\d{1,3}(?:[.,\s]\d{3})+|\d+)(?:[.,]\d{1,2})?\s?(?:€|EUR\b|euros?\b|USD\b|dollars?\b|\$|£))/giu,
 phone:/(?<![\w])(?:\+34[\s-]?)?[6789]\d{2}[\s-]?\d{3}[\s-]?\d{3}(?![\w])/g,
 identifier:/\b[A-Z]{2,}[-_/][A-Z0-9][A-Z0-9_/-]*\b|\b[A-Z]{1,4}\d{4,}\b|\b\d{8}[A-Z]\b|\b\d{2}\.\d{3}\.\d{3}-?[A-Z]\b|\b[XYZ]-?\d{7}-?[A-Z]\b/g,
 /* Plazos: número (cifra o palabra) + días/semanas/meses/años (+ hábiles/naturales…). Las horas siguen en «Horas». */
 deadline:new RegExp('(?<![\\p{L}\\p{N}.,/])(?:\\d{1,3}|'+WORDNUM+')\\s+(?:d[ií]as?|semanas?|mes(?:es)?|a[ñn]os?)(?![\\p{L}\\p{N}])(?:\\s+(?:h[aá]bil(?:es)?|naturales?|laborables?|lectivos?)(?![\\p{L}\\p{N}]))?','giu'),
 /* Referencias legales: se detecta que la cita cambie, no que la norma sea correcta */
 legal:new RegExp('(?<![\\p{L}\\p{N}])(?:(?:Ley(?:\\s+Org[aá]nica)?|Real\\s+Decreto(?:[\\s-]+(?:ley|legislativo))?|Decreto(?:[\\s-]+ley)?|Resoluci[oó]n)\\s+\\d{1,4}/\\d{2,4}|(?:Reglamento|Directiva|Decisi[oó]n)\\s*(?:\\((?:UE|CE|CEE|Euratom)\\)\\s*)?\\d{1,4}/\\d{1,4}(?:/(?:UE|CE|CEE))?|Orden\\s+[A-Z]{2,5}/\\d{1,4}/\\d{4}|(?:art[íi]culos?|arts?\\.?)\\s*\\d{1,3}(?:\\.\\d{1,2})*(?:\\s*(?:bis|ter|qu[aá]ter))?|(?:apartados?|apdo\\.|p[aá]rrafo|disposici[oó]n\\s+(?:adicional|transitoria|final|derogatoria))\\s+(?:\\d{1,3}(?:\\.\\d{1,2})*|'+ORD+'))(?![\\p{L}\\p{N}])','giu')
};
const _ec=new Map();let NODL=false;
function entities(text){
 text=String(text??'');const ck=(NODL?'1':'0')+text;if(_ec.has(ck))return _ec.get(ck);
 const all=[];
 for(const t of Object.keys(patterns))if(!(NODL&&t==='deadline'))for(const m of text.matchAll(patterns[t]))all.push({type:t,value:m[0].trim(),start:m.index,end:m.index+m[0].length});
 all.sort((a,b)=>a.start-b.start||(b.end-b.start)-(a.end-a.start));
 const sel=[],cov=new Uint8Array(text.length+1);let maxEnd=-1;
 for(const e of all)if(e.start>=maxEnd){sel.push(e);cov.fill(1,e.start,e.end);maxEnd=e.end}
 for(const m of text.matchAll(/(?<![\w.,])(?:\d{1,3}(?: \d{3})+(?![\d.,])|\d+(?:[.,]\d+)?)\s?%?(?![\w])/g)){
  if(cov.subarray(m.index,m.index+m[0].length).some(Boolean))continue;
  const bef=text.slice(0,m.index),aft=text.slice(m.index+m[0].length);
  /* numeración estructural: «1. », «2) », «(3)», «Paso 2», «paso 2 de 4», «en 3 pasos» */
  if((/(?:^|\n)[ \t>*•-]*$/.test(bef)&&/^[.)]\s/.test(aft))||(/(?:^|\n)[ \t]*\($/.test(bef)&&/^\)/.test(aft))||/(?:paso|etapa|fase|step)\s*$/i.test(bef)||/(?:paso|etapa|fase)\s+\d+\s+de\s*$/i.test(bef)||/^\s*(?:pasos|etapas|fases)(?![\p{L}])/iu.test(aft))continue;
  sel.push({type:'number',value:m[0].trim(),start:m.index,end:m.index+m[0].length});
 }
 sel.sort((a,b)=>a.start-b.start);
 /* «9 a 14 horas» ≈ «9:00 a 14:00»: el número suelto antes de una hora en un rango es una hora */
 sel.forEach((e,i)=>{if(e.type!=='number'||!/^\d{1,2}$/.test(e.value)||Number(e.value)>23)return;
  const nx=sel[i+1];if(nx&&nx.type==='time'&&/^\s*(?:a|y|-|–|—|hasta)\s*$/i.test(text.slice(e.end,nx.start)))e.type='time'});
 if(_ec.size>20)_ec.clear();_ec.set(ck,sel);return sel;
}
const MAP={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12,january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12};
const p2=n=>String(n).padStart(2,'0');
/* Forma canónica: dos formatos distintos del mismo dato dan el mismo valor */
function canon(t,v){
 const s=norm(v).trim();let m;
 if(t==='date'){
  if(m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/))return`${m[1]}-${m[2]}-${m[3]}`;
  if(m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/))return`${m[3].length<4?2000+Number(m[3]):m[3]}-${p2(m[2])}-${p2(m[1])}`;
  const mo=Object.keys(MAP).find(k=>new RegExp('(?<![a-z])'+k+'(?![a-z])').test(s)),d=s.match(/\d{1,2}/),y=s.match(/\d{4}/);
  return mo&&d?`${y?y[0]:'????'}-${p2(MAP[mo])}-${p2(d[0])}`:s;
 }
 if(t==='time'){m=s.match(/(\d{1,2})(?:\s?[:.h]\s?(\d{2}))?\s?(a\.?m\.?|p\.?m\.?)?/);if(!m)return s;
  let h=Number(m[1]);if(m[3]&&m[3][0]==='p'&&h<12)h+=12;if(m[3]&&m[3][0]==='a'&&h===12)h=0;return`${p2(h)}:${m[2]||'00'}`}
 if(t==='money'){const cur=/€|eur/.test(s)?'EUR':/\$|usd|dollar/.test(s)?'USD':/£/.test(s)?'GBP':'';
  const n=(s.match(/\d[\d.,\s]*\d|\d/)||['0'])[0].replace(/\s/g,''),i=Math.max(n.lastIndexOf('.'),n.lastIndexOf(','));
  let num=n;if(i>=0){const tail=n.slice(i+1);num=tail.length===3?n.replace(/[.,]/g,''):n.slice(0,i).replace(/[.,]/g,'')+'.'+tail}
  return cur+Number(num).toFixed(2)}
 if(t==='number')return s.replace(/\s+/g,'').replace(/^(\d{1,3}(?:[.,]\d{3})+)(%?)$/,(x,a,b)=>a.replace(/[.,]/g,'')+b).replace(/^(\d+),(\d{1,2})(%?)$/,'$1.$2$3');
 if(t==='phone')return s.replace(/\D/g,'').replace(/^34(?=\d{9}$)/,'');
 if(t==='deadline'){const m=s.match(/^(\d+|[a-z]+(?:\s+y\s+[a-z]+)?)\s+([dsma])[a-z]*(?:\s+([a-z]+))?$/);
  if(!m)return s.replace(/\s+/g,'');
  const n=/^\d/.test(m[1])?Number(m[1]):m[1].split(/\s+y\s+/).reduce((x,w)=>x+(NUMW[w]||0),0);
  return`${n}|${m[2]}|${(m[3]||'').slice(0,5)}`}
 if(t==='legal')return s.replace(/\barticulos?\b|\barts?\b\.?/g,'art').replace(/\bapdo\b\.?|\bapartados\b/g,'apartado').replace(/[-\s]+/g,'');
 if(t==='url'){const u=s.replace(/\/+$/,'');return /^www\./.test(u)?'https://'+u:u}
 if(t==='identifier'){const d=s.replace(/[\s.-]/g,'');if(/^(?:\d{8}|[xyz]\d{7})[a-z]$/.test(d))return d}
 return s.replace(/\s+/g,'');
}
const rawk=v=>norm(v).replace(/\s+/g,'');
const prevWord=(t,i)=>{const m=String(t).slice(Math.max(0,i-60),i).match(/([\p{L}\p{N}]+)[^\p{L}\p{N}]*$/u);return m?norm(m[1]):''};
/* «dos» ≈ «2»: cifras escritas con palabras (sin «un/una/uno», que suelen ser artículos) */
const WNRE=new RegExp('(?<![\\p{L}\\p{N}])'+WORDNUM+'(?![\\p{L}\\p{N}])','giu');
function wordVals(t){const s=new Set();for(const m of String(t).matchAll(WNRE)){const parts=norm(m[0]).split(/\s+y\s+/);if(parts.length===1&&/^(?:un|una|uno)$/.test(parts[0]))continue;s.add(String(parts.reduce((x,w)=>x+(NUMW[w]||0),0)))}return s}
function compare(o,p,type){
 const a=entities(o).filter(e=>e.type===type),b=entities(p).filter(e=>e.type===type);
 const ca=a.map(e=>canon(type,e.value)),cb=b.map(e=>canon(type,e.value));
 if(type==='date')ca.forEach((c,i)=>{if(c.startsWith('????')){const k=cb.find(x=>!x.startsWith('????')&&x.slice(4)===c.slice(4)&&!ca.includes(x));if(k)ca[i]=k}});
 const cnt=l=>{const m=new Map();for(const c of l)m.set(c,(m.get(c)||0)+1);return m},na=cnt(ca),nb=cnt(cb);
 const first=l=>{const m=new Map();l.forEach((c,i)=>{if(!m.has(c))m.set(c,i)});return m},fa=first(ca),fb=first(cb);
 const less=[...fa.keys()].filter(c=>nb.has(c)&&nb.get(c)<na.get(c)).map(c=>`${a[fa.get(c)].value} (aparece ${na.get(c)} veces; en la propuesta, ${nb.get(c)})`);
 let miss=[...unique(a.filter((e,i)=>!nb.has(ca[i])).map(e=>e.value)),...less];
 let add=unique(b.filter((e,i)=>!na.has(cb[i])).map(e=>e.value));
 if(type==='number'){const wo=wordVals(o),wp=wordVals(p);miss=miss.filter(v=>!wp.has(canon('number',v)));add=add.filter(v=>!wo.has(canon('number',v)))}
 const rawB=new Set(b.map(x=>rawk(x.value)));
 const fmt=unique(a.filter((e,i)=>nb.has(ca[i])&&!rawB.has(rawk(e.value))).map(e=>`${e.value} → ${b[fb.get(ca[a.indexOf(e)])].value}`));
 const swap=[],cand=[];ca.forEach((c,i)=>{if(na.get(c)===1&&nb.get(c)===1)cand.push(i)});
 if(cand.length>=2&&cand.length<=300){const oc=new Map(cand.map(i=>[i,prevWord(o,a[i].start)])),pc=new Map(cand.map(i=>[i,prevWord(p,b[fb.get(ca[i])].start)]));
  for(let x=0;x<cand.length;x++)for(let y=x+1;y<cand.length;y++){const i=cand[x],j=cand[y];
   if(oc.get(i)===oc.get(j))continue;
   if(pc.get(i)===oc.get(j)&&pc.get(j)===oc.get(i))swap.push(`${a[i].value} y ${a[j].value} han intercambiado su posición`)}}
 return{miss,add,fmt,swap};
}
/* ==== END VERBATIM ==== */
/* ==== VERBATIM v27 L312-312 ==== */
LABEL.names='Nombres / términos exactos';
/* ==== END VERBATIM ==== */
/* ==== VERBATIM v27 L383-390 ==== */
const POL={
 'Reescribir':{miss:'crit',desc:'eliminar, cambiar o añadir datos es crítico.'},
 'Simplificar':{miss:'crit',desc:'igual que reescribir: simplificar no debe perder información.'},
 'Resumir':{miss:'warn',desc:'eliminar un dato es un aviso (un resumen puede omitir detalles); cambiar o inventar datos sigue siendo crítico.'},
 'Traducir':{miss:'crit',lang:true,desc:'los datos deben conservarse; cambiar su formato (15/10/2026 → October 15, 2026) no es un fallo. Las reglas basadas en palabras españolas no se aplican.'},
 'Convertir en instrucciones':{miss:'crit',desc:'datos y plazos deben seguir apareciendo.'},
 'Cambiar el tono':{miss:'crit',desc:'los datos deben quedar intactos; solo cambia la forma.'}
};
/* ==== END VERBATIM ==== */
/* ==== VERBATIM v27 L396-396 ==== */
const fixTxt=s=>String(s??'').replace(/[\u00a0\u2007\u202f]/g,' ').normalize('NFC');
/* ==== END VERBATIM ==== */
/* ==== ADAPTER (no literal) ==== */
/* Regla opcional «Mantener el idioma» (casilla). No forma parte del núcleo verbatim: con la casilla desmarcada el resultado es idéntico a v27. */
STYLE.language='Mantener el idioma';LABEL.language=STYLE.language;
/* v13 · idioma: detección local por palabras frecuentes (determinista, sin red ni IA). Solo sirve para comprobar que la propuesta conserva el idioma del original. */
const LANGS={es:'español',en:'inglés',ca:'catalán',gl:'gallego',pt:'portugués',fr:'francés',it:'italiano',de:'alemán'};
const LW=Object.fromEntries(Object.entries({
 es:'el los las del al y que en por para con sin su sus es son está están fue no más pero como este esta estos estas lo les muy también donde cuando según desde hasta sobre han hay una unos unas se ser sido tiene tienen puede pueden debe deben',
 en:'the and of to is are was were be been for with on at by this that these those it its as from or an not you your will can has have had which who their there they we our',
 ca:'els amb sense són estan més però això aquest aquesta aquests aquestes molt també on quan segons des fins hi uns unes és dels pel pels ens ja fer serà',
 gl:'non máis unha unhas dun dunha cos coa coas tamén ata hai teñen moi polo pola é',
 pt:'não uma umas são também até têm há muito pelo pela você podem devem foram será',
 fr:'les des est sont été être pas mais ce cet cette ces très aussi où quand selon depuis jusqu sur ont il avec sans pour dans vous votre vos nous notre peut peuvent doit doivent et ou qui une du au aux',
 it:'il gli uno dello della dei degli è sono stato essere non più ma come questo questa questi queste molto anche dove quando secondo fino tra hanno può possono deve devono nel nella nei sul sulla ed',
 de:'der die das den dem des ein eine einen einem einer und oder dass für mit ohne sich sein seine ist sind war waren nicht mehr aber wie dieser diese dieses sehr auch wo wann nach seit bis zwischen auf hat haben wird werden kann können muss müssen im am zum zur von bei aus'
}).map(([k,v])=>[k,new Set(v.split(' '))]));
/* Devuelve {lang,hits} o null si no hay base suficiente (texto corto, sin palabras reconocibles o dos idiomas empatados). */
function detectLang(t){
 const tk=tokens(String(t??'').toLowerCase());if(tk.length<4)return null;
 const sc=Object.entries(LW).map(([k,s])=>[k,tk.filter(w=>s.has(w)).length]).sort((a,b)=>b[1]-a[1]);
 const [best,second]=[sc[0],sc[1]];
 if(best[1]<2||best[1]<2*second[1])return null;
 return{lang:best[0],hits:best[1]};
}
/* ---- API sin DOM: mismo comportamiento que genPrompt() y verify0() de v27, con la configuración como parámetro ---- */
const toOn=cfg=>Object.fromEntries([...ALLP,'names',...Object.keys(STYLE)].map(k=>[k,(cfg.on||[]).includes(k)]));
const FREE=cfg=>({omit:false,format:true,...(cfg.free||{})});
const SV=(cfg,k)=>String((cfg.s&&cfg.s[k])??'');
const pol=T=>POL[T]||POL.Reescribir;

function genPrompt(cfg,T){
 const on=toOn(cfg),F=FREE(cfg),cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
 const sec=(t,a)=>a.length?`${t}\n`+a.map(x=>`- ${x}`).join('\n')+'\n\n':'';
 const prot=ALLP.filter(k=>on[k]).map(k=>PROT[k]),nm=list(SV(cfg,'names'));
 const inm=[...prot];if(on.names&&nm.length)inm.push(`Términos exactos, con esta grafía: ${nm.join(', ')}`);
 const norms=[];
 if(prot.length&&!F.format)norms.push('Escribir los datos inmutables exactamente igual que en el original.');
 if(on.length)norms.push(`Máximo ${Number(SV(cfg,'maxWords'))||20} palabras por frase.`);
 if(on.oneInstruction)norms.push('Una sola instrucción por frase.');
 if(on.negation)norms.push('Evitar acumular negaciones.');
 if(on.language&&T!=='Traducir')norms.push('Responder en el mismo idioma que el texto original.');
 const fb=list(SV(cfg,'forbidden'));if(on.forbidden&&fb.length)norms.push(`No utilizar: ${fb.join(', ')}.`);
 const rq=list(SV(cfg,'required'));if(on.required&&rq.length)norms.push(`Utilizar siempre: ${rq.join(', ')}.`);
 const vg=list(SV(cfg,'vague'));if(on.vague&&vg.length)norms.push(`Evitar términos vagos como: ${vg.join(', ')}.`);
 if(on.terminology)list(SV(cfg,'terms')).map(x=>x.split('=').map(y=>y.trim())).filter(x=>x.length===2&&x[0]&&norm(x[0])!==norm(x[1])).forEach(([a,b])=>norms.push(`Usar «${b}» en lugar de «${a}».`));
 const lib=[F.omit?'Puede eliminar información secundaria.':T==='Resumir'?'Puede acortar el texto, conservando los datos inmutables.':'Puede reorganizar y reformular las frases.'];
 if(prot.length&&F.format)lib.push('Puede cambiar el formato de fechas, horas e importes si el valor no cambia.');
 const rev=String(cfg.review||'').split('\n').map(x=>x.trim()).filter(Boolean);
 return 'CONTRATO DE TRANSFORMACIÓN\n\n'+sec('OBJETIVO',[`${cap(T.toLowerCase())} el texto que se adjunta.`])+sec('DATOS INMUTABLES',inm)+sec('NORMAS',norms)+sec('LIBERTADES',lib)+
  sec('NO HACER',['Inventar información.','Cambiar o eliminar los datos inmutables.'].filter((x,i)=>i===0||inm.length))+sec('ESTILO (lo revisará una persona)',rev)+'Devuelve solo el texto resultante, sin comentarios.';
}
/* Texto completo para pegar en la IA: instrucciones + texto original */
function buildMessage(cfg,T,original){return genPrompt(cfg,T)+'\n\n---\nTEXTO:\n'+String(original||'').trim()}

const rr=(id,level,detail,tag,fix)=>({id,name:LABEL[id],level,passed:level==='ok'||level==='info',detail,tag,fix:fix||''});
function verify(oRaw,pRaw,cfg,T){const P=pol(T);NODL=!!P.lang;try{return verify0(oRaw,pRaw,cfg,T)}finally{NODL=false}}
function verify0(oRaw,pRaw,cfg,T){
 let cmp=0;
 const o=fixTxt(String(oRaw||'').trim()),p=fixTxt(String(pRaw||'').trim());
 if(!o||!p)return null;
 const on=toOn(cfg),F=FREE(cfg),P=pol(T),rules=[],changes=[],warns=[],fmts=[],polLvl=P.miss==='warn'?'warn':'crit',missLvl=(polLvl==='warn'||F.omit)?'warn':'crit';
 for(const t of ALLP){if(!on[t])continue;
  if(P.lang&&t==='deadline'){rules.push(rr(t,'info','No evaluado al traducir: los plazos se reconocen por palabras en español. Las cifras se comparan en «Otros números» si está activo.','No evaluado'));continue}
  const {miss,add,fmt,swap}=compare(o,p,t),L=LABEL[t];
  const nO=entities(o).filter(e=>e.type===t).length,fm=FEM.has(t);cmp+=nO;
  let lv='ok',d=nO?`${nO} ${fm?'comparadas':'comparados'} · sin cambios`:`${fm?'Ninguna':'Ninguno'} en el original.`;
  if(miss.length&&add.length){lv='crit';d=`Cambiado: ${miss.join(', ')} → ${add.join(', ')}`;changes.push(`${L}: ${miss.join(', ')} → ${add.join(', ')}`)}
  else if(add.length){lv=t==='number'?'warn':'crit';d=`Añadido (no estaba en el original): ${add.join(', ')}`;(lv==='crit'?changes:warns).push(`${L}: añadido ${add.join(', ')}`)}
  else if(miss.length){lv=t==='number'?'warn':missLvl;d=`Eliminado: ${miss.join(', ')}`;(lv==='crit'?changes:warns).push(`${L}: eliminado ${miss.join(', ')}`)}
  if(swap.length){if(lv==='ok')d='';d+=(d?' · ':'')+'Cambio de orden: '+swap.join('; ');lv='crit';swap.forEach(s=>changes.push(`${L}: cambio de orden: ${s}`))}
  if(fmt.length){d+=` · Mismo contenido, formato distinto: ${fmt.join(', ')}`;if(!F.format){if(lv!=='crit'){lv='crit';changes.push(`${L}: formato distinto (${fmt.join(', ')})`)}}else{fmts.push(...fmt.map(x=>`${L}: ${x}`));if(lv==='ok')lv='info'}}
  let fx='';if(miss.length&&add.length)fx=`Conserva exactamente ${miss.join(', ')} (has escrito ${add.join(', ')}).`;else if(add.length)fx=`Elimina ${add.join(', ')}: no estaba en el original.`;else if(miss.length)fx=`Incluye de nuevo ${miss.join(', ')}.`;
  if(!F.format&&fmt.length)fx=(fx?fx+' ':'')+`Mantén el formato original: ${fmt.map(x=>x.split(' → ')[0]).join(', ')}.`;
  if(swap.length)fx=(fx?fx+' ':'')+`Corrige el orden: ${swap.join('; ')}.`;
  rules.push(rr(t,lv,d,lv==='info'?'Formato distinto':'',lv==='warn'&&fx?'(Opcional) '+fx:fx));
 }
 const na=id=>rules.push(rr(id,'info','No aplicable: la propuesta está en otro idioma.','No aplicable'));
 const sty=(id,bad,dBad,dOk,fix)=>rules.push(rr(id,bad?'style':'ok',bad?dBad:dOk,'',bad?fix:''));
 const ss=sentences(p);
 if(on.forbidden){if(P.lang)na('forbidden');else{const f=list(SV(cfg,'forbidden')).filter(x=>forbVars(x).some(v=>has(p,v)));sty('forbidden',f.length,`Encontrados: ${f.join(', ')}`,'No se han encontrado.',`No uses estas palabras: ${f.join(', ')}.`)}}
 if(on.required){if(P.lang)na('required');else{const lost=list(SV(cfg,'required')).filter(x=>has(o,x)&&!has(p,x));
  lost.forEach(x=>(polLvl==='crit'?changes:warns).push(`Término obligatorio eliminado: ${x}`));
  rules.push(rr('required',lost.length?polLvl:'ok',lost.length?`Eliminados: ${lost.join(', ')}`:'Conservados.','',lost.length?`Vuelve a incluir: ${lost.join(', ')}.`:''))}}
 if(on.names){const nm=list(fixTxt(SV(cfg,'names'))),bad=[],badN=[];
  for(const n of nm){const re=new RegExp('(?<![\\p{L}\\p{N}])'+n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![\\p{L}\\p{N}])','u');
   if(!re.test(o))continue;if(!re.test(p)){bad.push(`${n} (no aparece con esa grafía exacta)`);badN.push(n)}}
  bad.forEach(x=>changes.push(`Nombre/término exacto: ${x}`));
  rules.push(rr('names',bad.length?'crit':'ok',bad.length?`No conservados: ${bad.join(', ')}`:nm.length?'Conservados exactamente.':'No has definido nombres exactos.','',badN.length?`Usa exactamente, con esa grafía: ${badN.join(', ')}.`:''))}
 if(on.length){const max=Number(SV(cfg,'maxWords'))||20,bad=ss.map((s,i)=>[i+1,tokens(s).length]).filter(x=>x[1]>max);
  sty('length',bad.length,bad.map(x=>`Frase ${x[0]}: ${x[1]} palabras (máx. ${max})`).join(' · '),`Todas las frases ≤ ${max} palabras.`,`Acorta o divide las frases ${bad.map(x=>x[0]).join(', ')} para que ninguna supere ${max} palabras.`)}
 if(on.oneInstruction){if(P.lang)na('oneInstruction');else{const re=/\b(?:haz|haga|realiza|realice|pulsa|pulse|selecciona|seleccione|envía|envíe|descarga|descargue|comprueba|compruebe|introduce|introduzca|llama|llame|escribe|escriba|abre|abra|cierra|cierre|contacta|contacte|presenta|presente|adjunta|adjunte|renueva|renueve|consulta|consulte|visite|visita|acceda|accede)\b/gi;
  const bad=ss.map((s,i)=>[i+1,(s.match(re)||[]).length]).filter(x=>x[1]>1);sty('oneInstruction',bad.length,bad.map(x=>`Frase ${x[0]}: ${x[1]} posibles instrucciones`).join(' · '),'No se detectaron varias instrucciones.',`Deja una sola instrucción en las frases ${bad.map(x=>x[0]).join(', ')}.`)}}
 if(on.negation){if(P.lang)na('negation');else{const bad=ss.map((s,i)=>[i+1,(s.match(/\b(?:no|nunca|jamás|sin)\b/gi)||[]).length]).filter(x=>x[1]>=2);sty('negation',bad.length,bad.map(x=>`Frase ${x[0]}: varias negaciones`).join(' · '),'Sin acumulación de negaciones.',`Reformula las frases ${bad.map(x=>x[0]).join(', ')} con menos negaciones.`)}}
 if(on.vague){if(P.lang)na('vague');else{const f=list(SV(cfg,'vague')).filter(x=>has(p,x));sty('vague',f.length,`Revisar: ${f.join(', ')}`,'No se han encontrado.',`Sustituye por algo concreto: ${f.join(', ')}.`)}}
 if(on.terminology){if(P.lang)na('terminology');else{const f=list(SV(cfg,'terms')).map(x=>x.split('=').map(y=>y.trim())).filter(x=>x.length===2&&x[0]&&norm(x[0])!==norm(x[1])&&has(p,x[0])).map(([a,b])=>`${a} → ${b}`);sty('terminology',f.length,`Usos a revisar: ${f.join(', ')}`,'No se han encontrado.',`Aplica esta terminología: ${f.join(', ')}.`)}}
 if(on.language){
  if(P.lang)rules.push(rr('language','info','No aplicable: al traducir, el idioma cambia a propósito.','No aplicable'));
  else{const dO=detectLang(o),dP=detectLang(p);
   if(!dO||!dP)rules.push(rr('language','info','No concluyente: texto demasiado corto o sin palabras reconocibles. Compruébalo tú.','No concluyente'));
   else if(dO.lang===dP.lang)rules.push(rr('language','ok',`Mismo idioma: ${LANGS[dO.lang]}.`,''));
   else{const a=LANGS[dO.lang],b=LANGS[dP.lang];changes.push(`Idioma: ${a} → ${b}`);rules.push(rr('language','crit',`El original está en ${a} y la propuesta en ${b}.`,'',`Pide a la IA que responda en ${a}, el idioma del original.`))}}}
 const passed=rules.filter(r=>r.passed).length;
 return{ts:new Date().toISOString(),engine:ENGINE,hash:fnv(JSON.stringify({on:(cfg.on||[]).slice().sort(),s:Object.fromEntries(['maxWords','forbidden','required','vague','terms','names'].map(k=>[k,SV(cfg,k)])),free:{omit:!!F.omit,format:!!F.format},review:String(cfg.review||'')})),compared:cmp,transform:T,
  passed,failed:rules.length-passed,changes:unique(changes),warns:unique(warns),fmts:unique(fmts),avisos:rules.filter(r=>r.level==='warn'||r.level==='style').length,
  overall:!rules.some(r=>r.level==='crit'),failedRules:rules.filter(r=>!r.passed).map(r=>r.name),ruleNames:rules.map(r=>r.name),rules,o,p};
}
root.PE={ENGINE,PROFILES,PROT,STYLE,LABEL,POL,ALLP,SCOPE,genPrompt,buildMessage,verify,entities,canon,compare};
})(typeof globalThis!=='undefined'?globalThis:this);
