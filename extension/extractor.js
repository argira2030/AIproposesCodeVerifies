/* Extractor de texto de archivos (TXT, MD, DOCX, HTML/HTM). Local, sin red, sin dependencias, sin DOM.
   Entrada: bytes del archivo (ArrayBuffer/Uint8Array). Salida: texto plano. El motor no sabe de dónde viene el texto.
   El archivo se trata como entrada no fiable: nunca se ejecuta ni se interpreta como HTML, y se limita lo que se descomprime.
   MD = texto tal cual (no se renderiza). HTML = se extrae el texto con un lector de etiquetas propio (sin DOM, sin DOMParser): nada se renderiza ni se ejecuta.
   DOCX = contenedor ZIP con XML: solo se lee word/document.xml; el resto de partes (imágenes, macros, comentarios…) no se tocan. */
(function(root){'use strict';

/* Límites. Los valores se fijan con las mediciones de la Fase B (ver informe); las pruebas los leen de aquí. */
const LIM={
 archivo:  25*1024*1024,  /* bytes del archivo completo (el DOCX con imágenes puede pesar mucho; no se descomprime todo) */
 xml:      40*1024*1024,  /* bytes de word/document.xml ya descomprimido (protección frente a ZIP bombs) */
 entradas: 500,           /* entradas del ZIP que se aceptan (un DOCX normal tiene ~15-40) */
 caracteres: 500000       /* texto extraído que se acepta (el motor y el borrador de sesión se ven en el informe) */
};

class ErrorExtraccion extends Error{constructor(codigo,mensaje){super(mensaje);this.name='ErrorExtraccion';this.codigo=codigo}}
const fallo=(c,m)=>{throw new ErrorExtraccion(c,m)};

const aBytes=b=>b instanceof Uint8Array?b:new Uint8Array(b);
const normalizar=t=>t.replace(/\r\n?/g,'\n').replace(/\u0000/g,'');

function comprobarTexto(t,tipo){
 const limpio=normalizar(t);
 if(!limpio.trim())fallo('sin-texto',tipo==='docx'?'El documento no contiene texto que se pueda extraer.':tipo==='html'?'El HTML no contiene texto visible (solo código, estilos o etiquetas vacías).':'El archivo está vacío o solo tiene espacios.');
 if(limpio.length>LIM.caracteres)fallo('demasiado-texto',`El texto tiene ${limpio.length.toLocaleString('es-ES')} caracteres y el máximo es ${LIM.caracteres.toLocaleString('es-ES')}.`);
 return limpio;
}

/* ================= TXT / MD / lectura de texto común ================= */
function decodificar(entrada){
 const b=aBytes(entrada);
 if(b.length>LIM.archivo)fallo('demasiado-grande','El archivo es demasiado grande.');
 let enc='utf-8',ini=0;
 if(b.length>=3&&b[0]===0xEF&&b[1]===0xBB&&b[2]===0xBF){ini=3}
 else if(b.length>=2&&b[0]===0xFF&&b[1]===0xFE){enc='utf-16le';ini=2}
 else if(b.length>=2&&b[0]===0xFE&&b[1]===0xFF){enc='utf-16be';ini=2}
 else if(b.indexOf(0)!==-1)fallo('no-es-texto','Este archivo no parece de texto (contiene datos binarios).');
 const datos=b.subarray(ini);let texto,aviso=null;
 try{texto=new TextDecoder(enc,{fatal:true}).decode(datos)}
 catch{
  if(enc!=='utf-8')fallo('codificacion','No se pudo leer el archivo con la codificación detectada.');
  texto=new TextDecoder('windows-1252').decode(datos);enc='windows-1252';
  aviso='El archivo no estaba en UTF-8; se ha leído como Windows-1252. Revisa los acentos.';
 }
 return{texto,enc,aviso};
}
/* TXT y MD: el contenido es el texto. El Markdown no se interpreta ni se renderiza (los enlaces, # y * quedan como están). */
function extraerTxt(entrada,tipo='txt'){
 const{texto,enc,aviso}=decodificar(entrada);
 const t=comprobarTexto(texto,tipo);
 return{texto:t,tipo,codificacion:enc,aviso,caracteres:t.length};
}

/* ================= HTML / HTM ================= */
/* Lector de etiquetas propio, lineal, sin DOM: no usa DOMParser ni inserta nada en la página, así que no se carga ningún recurso, no se ejecuta ningún script y no hay renderizado.
   Se descarta el contenido de script, style, title, template, noscript, svg, iframe, object, canvas y math; comentarios, DOCTYPE y atributos (incluidos href y alt) no se leen.
   Reglas: bloques (p, div, h1-h6, section…) → salto de línea; br → salto; li → «- » con sangría por nivel de lista (máx. 8 niveles); tabla → una fila por línea, celdas separadas por tabulador;
   los espacios se colapsan como en un navegador (salvo en pre). Entidades: numéricas y las nombradas más comunes; las desconocidas quedan literales.
   HTML mal formado se tolera como lo haría un navegador; una etiqueta, comentario o comilla sin cerrar descarta el resto del archivo. La codificación es UTF-8 (o Windows-1252 con aviso); no se lee <meta charset>. */
const HTML_OMITIR=new Set(['script','style','title','template','noscript','svg','iframe','object','canvas','math']);
const HTML_BLOQUE=new Set('address article aside blockquote body caption center dd details div dl dt fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr html legend main nav ol p pre section summary table tbody tfoot thead ul'.split(' '));
const HTML_ENT=(()=>{
 const e={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:'\u00A0',copy:'©',reg:'®',trade:'™',euro:'€',pound:'£',yen:'¥',cent:'¢',sect:'§',para:'¶',deg:'°',plusmn:'±',times:'×',divide:'÷',hellip:'…',mdash:'—',ndash:'–',lsquo:'‘',rsquo:'’',ldquo:'“',rdquo:'”',sbquo:'‚',bdquo:'„',laquo:'«',raquo:'»',lsaquo:'‹',rsaquo:'›',middot:'·',bull:'•',iexcl:'¡',iquest:'¿',ordf:'ª',ordm:'º',shy:'',frac12:'½',frac14:'¼',frac34:'¾',sup1:'¹',sup2:'²',sup3:'³',micro:'µ',szlig:'ß',aelig:'æ',AElig:'Æ',oelig:'œ',OElig:'Œ',oslash:'ø',Oslash:'Ø',ccedil:'ç',Ccedil:'Ç',aring:'å',Aring:'Å',larr:'←',rarr:'→',uarr:'↑',darr:'↓',ensp:'\u2002',emsp:'\u2003',thinsp:'\u2009',zwnj:'\u200C',zwj:'\u200D'};
 const marcas={acute:['\u0301','aeiouy'],grave:['\u0300','aeiou'],circ:['\u0302','aeiou'],uml:['\u0308','aeiouy'],tilde:['\u0303','ano']};
 for(const[n,[m,ls]]of Object.entries(marcas))for(const l of ls){e[l+n]=(l+m).normalize('NFC');e[l.toUpperCase()+n]=(l.toUpperCase()+m).normalize('NFC')}
 return e;
})();
const cp1252=c=>new TextDecoder('windows-1252').decode(new Uint8Array([c]));
function entidadesHtml(s){
 return s.indexOf('&')<0?s:s.replace(/&(#[xX][0-9a-fA-F]+|#[0-9]+|[A-Za-z][A-Za-z0-9]*);/g,(m,g)=>{
  if(g[0]!=='#')return Object.prototype.hasOwnProperty.call(HTML_ENT,g)?HTML_ENT[g]:m;
  const c=(g[1]==='x'||g[1]==='X')?parseInt(g.slice(2),16):parseInt(g.slice(1),10);
  if(c>=0x80&&c<=0x9F)return cp1252(c);   /* como los navegadores: &#128; = € */
  return(c===9||c===10||c===13||(c>=32&&c<=0xD7FF)||(c>=0xE000&&c<=0xFFFD)||(c>=0x10000&&c<=0x10FFFF))?String.fromCodePoint(c):'';
 });
}
const trimFin=s=>{let e=s.length;while(e>0&&(s.charCodeAt(e-1)===32||s.charCodeAt(e-1)===9))e--;return e===s.length?s:s.slice(0,e)};
const esLetra=c=>(c>=65&&c<=90)||(c>=97&&c<=122);
/* Fin de una etiqueta (posición del «>»), respetando comillas de valores de atributo. -1 si no se cierra. Recorrido lineal. */
function finEtiqueta(h,j){
 const n=h.length;
 for(;j<n;j++){
  const c=h.charCodeAt(j);
  if(c===62)return j;
  if(c===34||c===39){
   let k=j-1;while(k>=0&&(h.charCodeAt(k)===32||h.charCodeAt(k)===9||h.charCodeAt(k)===10||h.charCodeAt(k)===13))k--;
   if(k>=0&&h.charCodeAt(k)===61){const q=h.indexOf(h[j],j+1);if(q<0)return -1;j=q}
  }
 }
 return -1;
}
function htmlATexto(h){
 const out=[];let ult='',pre=0,lista=0,celdas=0;
 let total=0;
 const emit=s=>{if(s){total+=s.length;if(total>60000000)fallo('demasiado-texto','El HTML genera demasiado texto (máximo '+LIM.caracteres.toLocaleString('es-ES')+' caracteres).');out.push(s);ult=s[s.length-1]}};
 const salto=()=>{if(ult!==''&&ult!=='\n')emit('\n')};
 const texto=t=>{
  t=entidadesHtml(t).replace(/\r\n?/g,'\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
  if(!pre){t=t.replace(/[ \t\n\f]+/g,' ');if(t[0]===' '&&(ult===''||ult==='\n'||ult==='\t'||ult===' '))t=t.slice(1)}
  emit(t);
 };
 const n=h.length;let i=0;
 while(i<n){
  const lt=h.indexOf('<',i);
  if(lt<0){texto(h.slice(i));break}
  if(lt>i)texto(h.slice(i,lt));
  const c=h.charCodeAt(lt+1);
  if(c===33&&h.startsWith('<!--',lt)){const f=h.indexOf('-->',lt+4);if(f<0)break;i=f+3;continue}
  if(c===33||c===63){const f=h.indexOf('>',lt+2);if(f<0)break;i=f+1;continue}   /* <!DOCTYPE …>, <?…>, <![CDATA[…> */
  const cierre=c===47,ini=lt+(cierre?2:1);
  if(!esLetra(h.charCodeAt(ini))){texto('<');i=lt+1;continue}
  let k=ini;while(k<n){const x=h.charCodeAt(k);if(esLetra(x)||(x>=48&&x<=57)||x===45||x===58||x===95)k++;else break}
  const nombre=h.slice(ini,k).toLowerCase(),f=finEtiqueta(h,k);
  if(f<0)break;
  i=f+1;
  if(!cierre&&HTML_OMITIR.has(nombre)){
   const re=new RegExp('</'+nombre+'(?=[\\s/>])','gi');re.lastIndex=i;const m=re.exec(h);
   if(!m){i=n;break}
   const g=h.indexOf('>',m.index);i=g<0?n:g+1;continue;
  }
  if(nombre==='br'){if(!cierre)emit('\n');continue}
  if(nombre==='pre'){pre=cierre?Math.max(0,pre-1):pre+1}
  if(nombre==='ul'||nombre==='ol')lista=cierre?Math.max(0,lista-1):lista+1;
  if(nombre==='li'){salto();if(!cierre)emit('  '.repeat(Math.min(8,Math.max(0,lista-1)))+'- ');continue}
  if(nombre==='tr'){salto();celdas=0;continue}
  if(nombre==='td'||nombre==='th'){if(!cierre){if(celdas>0)emit('\t');celdas++}continue}
  if(HTML_BLOQUE.has(nombre)||nombre==='ul'||nombre==='ol')salto();
 }
 /* limpieza por líneas: sin espacios al final, sin celdas vacías al final, máximo una línea en blanco seguida */
 const lineas=[];let blancas=0;
 for(const l0 of out.join('').split('\n')){
  let l=l0.indexOf('\t')<0?trimFin(l0):l0.split('\t').map(trimFin).join('\t');
  l=l.replace(/\t+$/,'');
  if(l===''){blancas++;if(blancas>1)continue}else blancas=0;
  lineas.push(l);
 }
 return lineas.join('\n').replace(/^\n+|\n+$/g,'');
}
function extraerHtml(entrada){
 const{texto,enc,aviso}=decodificar(entrada);
 const t=comprobarTexto(htmlATexto(texto),'html');
 return{texto:t,tipo:'html',codificacion:enc,aviso,caracteres:t.length};
}

/* ================= DOCX ================= */
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}

function leerZip(b){
 if(b.length<22)fallo('no-docx','El archivo no es un DOCX válido (demasiado corto).');
 if(!(b[0]===0x50&&b[1]===0x4B&&(b[2]===3||b[2]===5)))fallo('no-docx','El archivo no es un DOCX válido (no es un ZIP).');
 const dv=new DataView(b.buffer,b.byteOffset,b.byteLength);
 /* Fin del directorio central: se busca desde el final, en la ventana máxima que permite el formato (22 + 65535) */
 let eocd=-1;for(let i=b.length-22;i>=Math.max(0,b.length-22-65535);i--){if(dv.getUint32(i,true)===0x06054B50){eocd=i;break}}
 if(eocd<0)fallo('corrupto','El archivo está dañado (no se encuentra el índice del ZIP).');
 const disco=dv.getUint16(eocd+4,true),discoCd=dv.getUint16(eocd+6,true),nLocal=dv.getUint16(eocd+8,true),n=dv.getUint16(eocd+10,true),cdTam=dv.getUint32(eocd+12,true),cdOff=dv.getUint32(eocd+16,true);
 if(disco!==0||discoCd!==0||nLocal!==n)fallo('no-docx','ZIP no admitido (en varias partes).');
 if(n===0xFFFF||cdTam===0xFFFFFFFF||cdOff===0xFFFFFFFF)fallo('no-docx','ZIP64 no admitido.');
 if(n>LIM.entradas)fallo('zip-anomalo',`El ZIP tiene demasiadas entradas (${n}).`);
 if(cdOff+cdTam>eocd)fallo('corrupto','El archivo está dañado (índice del ZIP fuera de rango).');
 const entradas=new Map();let p=cdOff;
 for(let i=0;i<n;i++){
  if(p+46>cdOff+cdTam||dv.getUint32(p,true)!==0x02014B50)fallo('corrupto','El archivo está dañado (índice del ZIP incoherente).');
  const flags=dv.getUint16(p+8,true),metodo=dv.getUint16(p+10,true),crc=dv.getUint32(p+16,true),csize=dv.getUint32(p+20,true),usize=dv.getUint32(p+24,true),ln=dv.getUint16(p+28,true),le=dv.getUint16(p+30,true),lc=dv.getUint16(p+32,true),off=dv.getUint32(p+42,true);
  if(p+46+ln+le+lc>cdOff+cdTam)fallo('corrupto','El archivo está dañado (entrada fuera de rango).');
  const nombre=new TextDecoder('utf-8').decode(b.subarray(p+46,p+46+ln));
  if(entradas.has(nombre))fallo('zip-anomalo','El ZIP tiene entradas duplicadas.');
  entradas.set(nombre,{nombre,flags,metodo,crc,csize,usize,off});
  p+=46+ln+le+lc;
 }
 return{entradas,dv};
}

async function descomprimir(b,dv,e){
 if(e.flags&1)fallo('cifrado','El documento está cifrado o protegido con contraseña.');
 if(e.usize>LIM.xml)fallo('demasiado-grande',`El contenido del documento es demasiado grande (${(e.usize/1048576).toFixed(0)} MB descomprimido).`);
 if(e.off+30>b.length||dv.getUint32(e.off,true)!==0x04034B50)fallo('corrupto','El archivo está dañado (cabecera local inválida).');
 const ln=dv.getUint16(e.off+26,true),le=dv.getUint16(e.off+28,true);
 const nl=new TextDecoder('utf-8').decode(b.subarray(e.off+30,e.off+30+ln));
 if(nl!==e.nombre)fallo('zip-anomalo','El ZIP es incoherente (nombres distintos en las dos cabeceras).');
 const ini=e.off+30+ln+le,fin=ini+e.csize;
 if(fin>b.length||e.csize>LIM.archivo)fallo('corrupto','El archivo está dañado (datos fuera de rango).');
 const datos=b.subarray(ini,fin);let salida;
 if(e.metodo===0){
  if(e.csize!==e.usize)fallo('corrupto','El archivo está dañado (tamaños incoherentes).');
  salida=datos;
 }else if(e.metodo===8){
  if(typeof DecompressionStream==='undefined')fallo('no-soportado','Este navegador no puede descomprimir el documento.');
  const rd=new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const trozos=[];let total=0;
  try{
   for(;;){const{done,value}=await rd.read();if(done)break;total+=value.length;
    if(total>LIM.xml||total>e.usize){await rd.cancel().catch(()=>{});fallo('zip-anomalo','El contenido descomprimido supera lo declarado: archivo rechazado.')}
    trozos.push(value)}
  }catch(x){if(x instanceof ErrorExtraccion)throw x;fallo('corrupto','El archivo está dañado (no se pudo descomprimir).')}
  if(total!==e.usize)fallo('corrupto','El archivo está dañado (tamaño descomprimido incoherente).');
  salida=new Uint8Array(total);let o=0;for(const t of trozos){salida.set(t,o);o+=t.length}
 }else fallo('no-soportado','Método de compresión no admitido.');
 if(crc32(salida)!==e.crc)fallo('corrupto','El archivo está dañado (la suma de comprobación no coincide).');
 return salida;
}

const ENT={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
const desescapar=s=>s.indexOf('&')<0?s:s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g,(m,g)=>{
 if(g[0]!=='#')return ENT[g];
 const c=g[1]==='x'?parseInt(g.slice(2),16):parseInt(g.slice(1),10);
 return(c===9||c===10||c===13||(c>=32&&c<=0xD7FF)||(c>=0xE000&&c<=0xFFFD)||(c>=0x10000&&c<=0x10FFFF))?String.fromCodePoint(c):''});

/* Lector de etiquetas OOXML mínimo (no es un parser XML general): solo reconoce las etiquetas de texto de Word.
   Rechaza DOCTYPE/ENTITY (sin expansión de entidades) y no construye ningún DOM.
   Reglas: texto = contenido de w:t; w:tab → tabulador; w:br/w:cr → salto de línea; fin de w:p → salto de línea;
   párrafos con numeración explícita → «- » con sangría por nivel; tabla → una fila por línea, celdas separadas por tabulador;
   se ignora el texto borrado (w:delText), los códigos de campo (w:instrText) y mc:Fallback (copia alternativa del mismo contenido). */
const TOK=/<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<(\/?)([A-Za-z_][\w.\-]*:[\w.\-]+|[A-Za-z_][\w.\-]*)((?:\s+[\w.:\-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
const VAL=/\bw:val\s*=\s*(?:"([^"]*)"|'([^']*)')/;
function xmlATexto(xml){
 if(/<!DOCTYPE|<!ENTITY/i.test(xml))fallo('zip-anomalo','El documento contiene declaraciones XML no admitidas.');
 const out=[],pila=[];let enT=false,fallback=0,tabla=0,enPPr=false,ilvl=0;
 const val=a=>{const m=VAL.exec(a);return m?(m[1]!==undefined?m[1]:m[2]):null};
 TOK.lastIndex=0;let m;
 while((m=TOK.exec(xml))!==null){
  if(m[1]!==undefined){if(enT&&!fallback)out.push(m[1].replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,''));continue}
  if(m[6]!==undefined){if(enT&&!fallback)out.push(desescapar(m[6]).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,''));continue}
  if(m[3]===undefined)continue;
  const cierre=m[2]==='/',n=m[3],attrs=m[4]||'',auto=m[5]==='/';
  if(n==='mc:Fallback'){if(!auto){fallback+=cierre?-1:1;if(fallback<0)fallback=0}continue}
  if(fallback)continue;
  switch(n){
   case'w:t':enT=!cierre&&!auto;break;
   case'w:delText':case'w:instrText':enT=false;break;
   case'w:tab':if(!cierre&&!enPPr)out.push('\t');break;               /* los w:tab dentro de w:pPr son tabuladores de formato, no texto */
   case'w:br':case'w:cr':if(!cierre)out.push(tabla?' ':'\n');break;
   case'w:noBreakHyphen':if(!cierre)out.push('-');break;
   case'w:pPr':if(!auto)enPPr=!cierre;break;
   case'w:ilvl':if(enPPr&&!cierre)ilvl=Math.max(0,Math.min(8,parseInt(val(attrs),10)||0));break;
   case'w:numId':if(enPPr&&!cierre&&pila.length){const v=val(attrs);if(v&&v!=='0')pila[pila.length-1].lvl=ilvl}break;
   case'w:p':
    if(auto){out.push(tabla?' ':'\n');break}
    if(!cierre){pila.push({idx:out.length,lvl:null});out.push('');enPPr=false;ilvl=0}
    else{const p=pila.pop();if(p&&p.lvl!==null)out[p.idx]='  '.repeat(p.lvl)+'- ';out.push(tabla?' ':'\n')}
    break;
   case'w:tbl':if(!auto){tabla+=cierre?-1:1;if(tabla<0)tabla=0}break;
   case'w:tc':if(cierre){while(out.length&&out[out.length-1]===' ')out.pop();out.push('\t')}break;
   case'w:tr':if(cierre){while(out.length&&(out[out.length-1]==='\t'||out[out.length-1]===' '))out.pop();out.push(tabla>1?' ':'\n')}break;   /* fila de tabla anidada: no abre línea nueva dentro de la celda */
  }
 }
 return out.join('');
}

async function extraerDocx(entrada){
 const b=aBytes(entrada);
 if(b.length>LIM.archivo)fallo('demasiado-grande','El archivo es demasiado grande.');
 const{entradas,dv}=leerZip(b);
 if(!entradas.has('[Content_Types].xml'))fallo('no-docx','El archivo no es un DOCX válido (falta [Content_Types].xml).');
 const e=entradas.get('word/document.xml');
 if(!e)fallo('no-docx','El archivo no es un DOCX válido (falta word/document.xml).');
 const xml=new TextDecoder('utf-8').decode(await descomprimir(b,dv,e));
 const bruto=xmlATexto(xml);
 const t=comprobarTexto(bruto.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').replace(/^\s+|\s+$/g,''),'docx');
 return{texto:t,tipo:'docx',codificacion:null,aviso:null,caracteres:t.length};
}

/* Punto de entrada: elige por extensión del nombre. Devuelve {texto,tipo,codificacion,aviso,caracteres}. */
const EXT=['txt','md','docx','html','htm'];
async function extraer(nombre,entrada){
 const ext=String(nombre||'').toLowerCase().match(/\.([a-z0-9]+)$/);
 const e=ext?ext[1]:'';
 if(e==='txt')return extraerTxt(entrada,'txt');
 if(e==='md')return extraerTxt(entrada,'md');
 if(e==='docx')return extraerDocx(entrada);
 if(e==='html'||e==='htm')return extraerHtml(entrada);
 fallo('formato',e?`El formato «.${e}» no está admitido todavía. Usa .txt, .md, .docx, .html o .htm.`:'Formato no admitido. Usa .txt, .md, .docx, .html o .htm.');
}

root.PEX={LIM,EXT,ErrorExtraccion,extraer,extraerTxt,extraerHtml,extraerDocx,crc32};
})(typeof globalThis!=='undefined'?globalThis:this);
