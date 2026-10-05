/* Extractor de texto de archivos (TXT y DOCX). Local, sin red, sin dependencias, sin DOM.
   Entrada: bytes del archivo (ArrayBuffer/Uint8Array). Salida: texto plano. El motor no sabe de dónde viene el texto.
   El archivo se trata como entrada no fiable: nunca se ejecuta ni se interpreta como HTML, y se limita lo que se descomprime.
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
 if(!limpio.trim())fallo('sin-texto',tipo==='docx'?'El documento no contiene texto que se pueda extraer.':'El archivo está vacío o solo tiene espacios.');
 if(limpio.length>LIM.caracteres)fallo('demasiado-texto',`El texto tiene ${limpio.length.toLocaleString('es-ES')} caracteres y el máximo es ${LIM.caracteres.toLocaleString('es-ES')}.`);
 return limpio;
}

/* ================= TXT ================= */
function extraerTxt(entrada){
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
 const t=comprobarTexto(texto,'txt');
 return{texto:t,tipo:'txt',codificacion:enc,aviso,caracteres:t.length};
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
async function extraer(nombre,entrada){
 const ext=String(nombre||'').toLowerCase().match(/\.([a-z0-9]+)$/);
 const e=ext?ext[1]:'';
 if(e==='txt')return extraerTxt(entrada);
 if(e==='docx')return extraerDocx(entrada);
 fallo('formato',e?`El formato «.${e}» no está admitido todavía. Usa .txt o .docx.`:'Formato no admitido. Usa .txt o .docx.');
}

root.PEX={LIM,ErrorExtraccion,extraer,extraerTxt,extraerDocx,crc32};
})(typeof globalThis!=='undefined'?globalThis:this);
