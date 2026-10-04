# AIproposesCodeVerifies

**La IA propone. El código verifica. Tú decides.**

Comprobación local de los datos que has decidido proteger. Sin servidores, sin red: los textos no salen de tu navegador.

## Probar en el navegador
Abre `index.html` en tu navegador: es autocontenido y funciona sin instalación ni red.

## Extensión (Chrome / Edge 116+)
Descarga `AIproposesCodeVerifies-manual.zip` desde [Releases](../../releases) y sigue el `LEEME.txt`:
1. Descomprime.
2. `chrome://extensions` → activa «Modo de desarrollador».
3. «Cargar descomprimida» → elige la carpeta.

## Clic derecho
Selecciona texto en cualquier página → botón derecho:
- **Usar como texto original** → lo carga en el paso 2 del panel.
- **Usar como respuesta de la IA y comprobar** → lo carga en el paso 3 y comprueba al instante.

Solo se envía el texto que seleccionas. Sin permisos de host, sin content scripts y sin red. Requiere Chrome/Edge 116+.

## Mis perfiles
En el paso 1 del panel, «Mis perfiles»: crear, duplicar (también los de ejemplo), editar, eliminar, **exportar e importar en JSON**.
- Se guardan solo en el navegador (`storage.local`); los textos que compruebas no se envían a ningún sitio; el borrador de trabajo solo se mantiene en el almacenamiento de sesión del navegador (`storage.session`).
- Cada perfil exportado lleva una *huella de reglas* de 8 caracteres: mismas reglas, misma huella. Si el archivo se edita a mano, al importar se avisa.
- Importar es defensivo: solo se copian campos conocidos, con tipos y longitudes comprobados (máx. 50 perfiles, 256 KB por archivo), y se muestra una vista previa antes de aplicar nada.
- Para repartir un perfil a una organización: exportar → enviar el `.json` → importar en cada navegador.

Formato del archivo (`version: 1`):
```json
{"formato":"IAproponeCodeVerifica-perfiles","version":1,"motor":"v12","perfiles":[
 {"id":"u-ab12cd34","name":"…","desc":"…","on":["money","date","forbidden"],
  "s":{"maxWords":"20","forbidden":"urgente, ya","required":"","vague":"","terms":"","names":""},
  "free":{"omit":false,"format":true},"review":"","huella":"1a2b3c4d"}]}
```

## Estructura
- `index.html` — laboratorio web (autocontenido)
- `engine/engine.js` — motor (fuente única)
- `extension/` — extensión; `engine.js` se genera con `npm run sync`, nunca a mano
- `extension/perfiles.js` (lógica de perfiles, sin DOM) y `panel-perfiles.js` (interfaz)
- `scripts/`, `tests/` — sincronización, empaquetado y pruebas
- `tests/fixtures/laboratorio-v27.html` — copia congelada de referencia para las pruebas; no editar

## Desarrollo
```
npm test        # motor, background.js, perfiles, paquete y SHA-256
npm run test:panel   # panel en Chromium real (requiere playwright)
npm run pack    # genera dist/*.zip (store y manual)
```

## Aviso
Motor en fase de validación. El programa detecta ciertas clases de cambios; no comprueba el significado del texto.

## Licencia
Copyright (C) 2026 Jose Ranero García. Creative Commons Atribución-NoComercial-CompartirIgual 4.0 Internacional (CC BY-NC-SA 4.0). Ver `LICENSE`.
