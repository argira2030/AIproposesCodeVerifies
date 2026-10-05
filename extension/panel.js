/* Panel de IAproponeCodeVerifica. Fase mínima: perfil → instrucciones+texto → respuesta → comprobación con engine.js.
   Sin red, sin acceso a las páginas, sin insertar nada en ChatGPT/Claude/Gemini. Recibe texto por clic derecho (lo envía background.js). */
(()=>{'use strict';
const PE=globalThis.PE,$=id=>document.getElementById(id);
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e};

/* ---- Configuración a partir del perfil (mismo formato que v27) ---- */
const cfgOf=id=>{const p=PanelPerfiles.buscar(id);return{on:p.on,s:Object.fromEntries(Object.entries(p.s||{}).map(([k,v])=>[k,String(v)])),free:p.free||{omit:false,format:true},review:p.review||''}};
const protList=c=>{const n=PE.ALLP.filter(k=>c.on.includes(k)).map(k=>PE.PROT[k]);if(c.on.includes('names'))n.push(PE.LABEL.names);return n};
const styleList=c=>Object.keys(PE.STYLE).filter(k=>c.on.includes(k)).map(k=>PE.STYLE[k]);

/* ---- Borrador: solo en memoria de sesión del navegador (se borra al cerrarlo) ---- */
const store=(typeof chrome!=='undefined'&&chrome.storage&&chrome.storage.session)||null;
let saveT;
const guardar=()=>{if(!store)return;clearTimeout(saveT);saveT=setTimeout(()=>{try{Promise.resolve(store.set({draft:{perfil:$('perfil').value,tarea:$('tarea').value,original:$('original').value,respuesta:$('respuesta').value}})).catch(()=>{})}catch{}},250)};

/* ---- Estado de pantalla ---- */
let avisoT;
function aviso(m){const a=$('aviso');a.textContent=m;a.hidden=false;clearTimeout(avisoT);avisoT=setTimeout(()=>a.hidden=true,4000)}
function refrescar(){
 const c=cfgOf($('perfil').value),T=$('tarea').value;
 $('politica').textContent=`Con «${T}»: ${PE.POL[T].desc}`;
 const p=protList(c),s=styleList(c);
 $('queSeComprueba').textContent=`Datos protegidos: ${p.join(', ')||'ninguno'}. Normas de estilo (generan avisos): ${s.join(', ')||'ninguna'}.`;
 $('mensaje').value=PE.buildMessage(c,T,$('original').value);
}
function cambio(){refrescar();$('resultado').hidden=true;guardar()}

/* ---- Copiar ---- */
async function copiar(){
 if(!$('original').value.trim()){aviso('Pega primero el texto original.');$('original').focus();return}
 const t=$('mensaje').value;let ok=false;
 try{await navigator.clipboard.writeText(t);ok=true}catch{
  const x=document.createElement('textarea');x.value=t;x.style.cssText='position:fixed;left:-9999px';document.body.append(x);x.select();
  try{ok=document.execCommand('copy')}catch{}x.remove()}
 aviso(ok?'Copiado. Pégalo en tu IA y vuelve con su respuesta.':'No se pudo copiar. Abre «Ver lo que se copia» y cópialo a mano.');
}

/* ---- Resultado (mismos textos y criterios que v27) ---- */
const PILL={ok:['ok','Superada'],info:['info',''],warn:['warn','Aviso'],style:['warn','Aviso de estilo'],crit:['bad','No superada']};
function veredicto(r){
 const cls=!r.overall?'bad':r.avisos?'warn':'ok';
 const titulo=!r.overall?'Cambios detectados':r.avisos?'Revisar avisos':r.compared?'Sin cambios detectados':'Nada que comparar';
 const frase=!r.overall?'Se detectaron cambios en los datos protegidos.'
  :r.avisos?(r.compared?'Sin cambios críticos en los datos protegidos, pero hay avisos que revisar.':'No había datos protegidos que comparar, pero hay avisos que revisar.')
  :(r.compared?'Los datos protegidos se conservan.':'No había datos protegidos que comparar.');
 const b=el('div','veredicto '+cls);b.append(el('p','titulo',titulo),el('p',null,frase));return b;
}
function resumen(r){
 const ul=el('ul','lista');
 const q=[...r.changes.map(x=>['c',x]),...r.warns.map(x=>['w',x])];
 q.slice(0,5).forEach(([k,t])=>ul.append(el('li',k,(k==='c'?'No coincide: ':'Revisar: ')+t.replace(': eliminado ',': falta '))));
 if(q.length>5)ul.append(el('li','w','… y '+(q.length-5)+' más (ver detalle).'));
 if(!q.length&&r.compared)ul.append(el('li','k','Se conservan todos los datos protegidos.'));
 return ul;
}
function regla(x){
 const [c,l]=PILL[x.level],d=el('details','regla');if(!x.passed)d.open=true;
 const s=el('summary');s.append(el('span','pill '+c,x.tag||l||'Sin cambios'),document.createTextNode(x.name));
 d.append(s,el('div','det',x.detail));return d;
}
function mostrar(r){
 const box=$('resultado');box.textContent='';
 box.append(veredicto(r),resumen(r));
 const bad=r.rules.filter(x=>!x.passed),good=r.rules.filter(x=>x.passed);
 if(bad.length){box.append(el('h3',null,`Reglas no superadas (${bad.length})`));bad.forEach(x=>box.append(regla(x)))}
 if(r.fmts.length){box.append(el('h3',null,'Mismo contenido, formato distinto'));const ul=el('ul','lista');r.fmts.forEach(x=>ul.append(el('li','i',x)));box.append(ul)}
 const g=el('details');g.append(el('summary',null,`Reglas superadas (${good.length})`));good.forEach(x=>g.append(regla(x)));box.append(g);
 const t=el('details');t.append(el('summary',null,'Detalles técnicos'),el('p','tecnico',`Motor ${r.engine} · huella de reglas ${r.hash} · tarea «${r.transform}»`));box.append(t);
 box.hidden=false;box.scrollIntoView({block:'nearest'});
}
function comprobar(){
 if(!$('original').value.trim()){aviso('Falta el texto original (paso 2).');$('original').focus();return}
 if(!$('respuesta').value.trim()){aviso('Pega la respuesta de la IA.');$('respuesta').focus();return}
 mostrar(PE.verify($('original').value,$('respuesta').value,cfgOf($('perfil').value),$('tarea').value));
}

/* ---- Texto recibido desde el clic derecho (background.js lo deja en storage.session) ---- */
let ultimoTs=0;
function recibir(inc){
 if(!inc||!inc.text||!(inc.ts>ultimoTs))return;ultimoTs=inc.ts;
 const n=inc.text.length.toLocaleString('es-ES');
 if(inc.target==='original'){
  const habia=$('respuesta').value.trim();
  $('original').value=inc.text;$('respuesta').value='';cambio();estadoArchivo('');
  aviso(`Texto original recibido (${n} caracteres)${habia?'; se ha vaciado la respuesta anterior':''}. Pulsa «Copiar instrucciones y texto».`);
 }else{
  $('respuesta').value=inc.text;cambio();
  if($('original').value.trim()){comprobar();aviso(`Respuesta recibida (${n} caracteres) y comprobada.`)}
  else{aviso(`Respuesta recibida (${n} caracteres), pero falta el texto original (paso 2).`);$('original').focus()}
 }
 try{Promise.resolve(store.remove('incoming')).catch(()=>{})}catch{}
}

/* ---- Archivo como texto original (.txt / .md / .docx / .html / .htm): se extrae en local y el resultado entra por el mismo camino que el texto pegado ---- */
const nf=n=>n.toLocaleString('es-ES');
function estadoArchivo(m){const a=$('archivoEstado');a.textContent=m;a.hidden=!m}
async function cargarArchivo(){
 const inp=$('archivo'),f=inp.files&&inp.files[0];if(!f)return;
 estadoArchivo(`Leyendo «${f.name}»…`);
 try{
  if(f.size>PEX.LIM.archivo)throw new PEX.ErrorExtraccion('demasiado-grande',`El archivo pesa ${(f.size/1048576).toFixed(1).replace('.',',')} MB y el máximo es ${nf(PEX.LIM.archivo/1048576)} MB.`);
  const r=await PEX.extraer(f.name,await f.arrayBuffer());
  const habia=$('respuesta').value.trim();
  $('original').value=r.texto;$('respuesta').value='';cambio();$('original').scrollTop=0;
  estadoArchivo(`Archivo seleccionado: ${f.name}. Texto extraído: ✓ ${nf(r.caracteres)} caracteres.${r.aviso?' '+r.aviso:''} Revísalo arriba (puedes editarlo)${habia?'; se ha vaciado la respuesta anterior':''}.`);
 }catch(e){
  estadoArchivo(`No se pudo usar «${f.name}»: ${e instanceof PEX.ErrorExtraccion?e.message:'no se pudo leer el archivo.'} Puedes seguir pegando el texto a mano.`);
 }finally{inp.value=''}
}

/* ---- Empezar de nuevo (doble pulsación, como en el laboratorio) ---- */
let borrarT,borrarListo=false;
function borrar(){
 const b=$('borrar');
 if(!borrarListo){borrarListo=true;b.textContent='Pulsa otra vez para borrar';clearTimeout(borrarT);borrarT=setTimeout(()=>{borrarListo=false;b.textContent='Empezar de nuevo'},4000);return}
 borrarListo=false;clearTimeout(borrarT);b.textContent='Empezar de nuevo';
 $('original').value='';$('respuesta').value='';cambio();estadoArchivo('');$('original').focus();
}

/* ---- Integridad del motor: SHA-256 de engine.js frente a engine.sha256 ---- */
async function integridad(){
 const m=$('motor');
 try{
  const [js,esp]=await Promise.all([fetch('engine.js').then(r=>r.arrayBuffer()),fetch('engine.sha256').then(r=>r.text())]);
  const h=[...new Uint8Array(await crypto.subtle.digest('SHA-256',js))].map(b=>b.toString(16).padStart(2,'0')).join('');
  const ok=h===esp.trim().split(/\s+/)[0];
  m.textContent=`Motor ${PE.ENGINE} · SHA-256 ${h.slice(0,12)}… ${ok?'(íntegro)':'(NO coincide con engine.sha256)'}`;m.title=h;m.classList.toggle('bad',!ok);
 }catch{m.textContent=`Motor ${PE.ENGINE} · no se pudo comprobar la huella`}
}

/* ---- Arranque ---- */
(async()=>{
 await PanelPerfiles.init({onCambio:cambio});
 Object.keys(PE.POL).forEach(t=>{const o=el('option',null,t);o.value=t;$('tarea').append(o)});
 $('perfil').value='base';
 try{if(store){const {draft}=await store.get('draft');if(draft){
  if(PanelPerfiles.buscar(draft.perfil))$('perfil').value=draft.perfil;if(PE.POL[draft.tarea])$('tarea').value=draft.tarea;
  $('original').value=draft.original||'';$('respuesta').value=draft.respuesta||''}}}catch{}
 try{if(store){
  chrome.storage.onChanged.addListener((c,area)=>{if(area==='session'&&c.incoming&&c.incoming.newValue)recibir(c.incoming.newValue)});
 }}catch{}
 ['perfil','tarea'].forEach(i=>$(i).addEventListener('change',cambio));
 ['original','respuesta'].forEach(i=>$(i).addEventListener('input',cambio));
 $('original').addEventListener('input',()=>estadoArchivo(''));$('archivo').addEventListener('change',cargarArchivo);
 $('copiar').addEventListener('click',copiar);$('comprobar').addEventListener('click',comprobar);$('borrar').addEventListener('click',borrar);
 PanelPerfiles.botones();refrescar();integridad();
 try{if(store){const {incoming}=await store.get('incoming');recibir(incoming)}}catch{}
})();
})();
