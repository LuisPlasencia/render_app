# Guía del programador

Documento de referencia para cualquier persona (o asistente de IA) que vaya a trabajar en el proyecto. Explica qué hace la aplicación, cómo está organizada, cómo fluyen los datos y qué convenciones hay que respetar.

---

## 1. Qué es la aplicación

Trabajo de la asignatura **Tecnologías y Arquitecturas de Redes de Comunicación Emergentes (TARCE)**, EITE, ULPGC.

Es una aplicación web docente para estudiar la **teoría de la Internet muerta** (*Dead Internet Theory*, DIT): la idea de que una parte creciente del tráfico y del contenido de Internet no la generan personas, sino bots, rastreadores y agentes de IA generativa. Se trabaja con la **versión débil y técnicamente defendible** de la teoría (cambio en la composición del tráfico), no con la versión conspirativa. La interfaz lo deja claro con avisos de metodología.

La aplicación tiene dos partes complementarias:

| Parte | Página | Qué hace |
|---|---|---|
| **Simulador** | `/simulate` | Emula una red IP sencilla con sus redes de acceso (FTTH, 5G, WiFi, LPWAN, centro de datos), pone en ella agentes de distintos tipos (humanos, bots, agentes GenIA, sensores IoT) y muestra gráficamente los paquetes, el reparto del tráfico y la proporción de contenido sintético. Incluye un **editor de red** para diseñar la topología. |
| **Internet real** | `/data` | Consulta datos públicos reales (Cloudflare Radar y Ericsson Mobility Report): reparto humano/bot, móvil/escritorio, tipos de contenido, multimedia y rastreadores de IA. Permite **calibrar el simulador** con esas cifras. |

Producción: https://lab1tarce.onrender.com (Render, servicio `srv-dbtmd58ae00c73f7gun0`).
Repositorio: https://github.com/LuisPlasencia/render_app

---

## 2. Tecnologías

| Capa | Tecnología | Notas |
|---|---|---|
| Servidor | Node.js + Express 4 | Generado con `express-generator` y ampliado. CommonJS (`require`). |
| Vistas | EJS | Plantillas renderizadas en servidor, con *partials* (`head`, `nav`, `footer`, `network`). |
| Cliente | JavaScript con módulos ES nativos | **Sin paso de compilación** (sin React, Vite ni webpack). Se cargan con `<script type="module">`. |
| Grafo de red | Cytoscape.js | Se sirve desde `node_modules` en `/vendor/cytoscape/` (import ESM). |
| Gráficos | Chart.js 4 | Se sirve desde `node_modules` en `/vendor/chart.js/` (script UMD, global `Chart`). |
| Animación de paquetes | Canvas 2D | Capa superpuesta al grafo de Cytoscape. |
| Simulación | Web Worker (módulo) | El motor corre en un hilo aparte para no bloquear la interfaz. |
| Datos reales | API de Cloudflare Radar | A través de un *proxy* en el servidor que guarda el token. |
| Despliegue | Render | Ejecuta `npm install` y `npm start` en cada despliegue. |

Las librerías de cliente se sirven desde `node_modules` (y no desde un CDN) para que sus versiones queden fijadas en `package.json`.

---

## 3. Puesta en marcha

### Requisitos
- Node.js 18 o superior (el servidor usa `fetch` y `AbortSignal.timeout` nativos).
- Git.

### En local
```bash
cd render_app
npm install
npm start            # http://localhost:5000
```
El puerto por defecto es 5000 (`bin/www`) y se puede cambiar con la variable `PORT`.

### Variables de entorno

| Variable | Obligatoria | Uso |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Solo para `/data` | Token de Cloudflare con la plantilla **"Read Cloudflare Radar data"**. Sin él, `/api/radar/overview` responde 503 y la página lo explica. |
| `PORT` | No | Puerto HTTP. Render lo define solo. |
| `RADAR_API_BASE_URL` | No | Sustituye la URL base de Radar. Solo para pruebas contra una API falsa. |

- **En Render**: Dashboard → servicio → *Environment* → *Add Environment Variable*.
- **En local**: archivo `render_app/.env` con líneas `CLAVE=valor`. Lo carga `services/environmentFile.js` al arrancar (sin dependencias externas). Las variables ya definidas en el entorno tienen prioridad. El `.gitignore` excluye `.env`: **nunca subas el token a git**.

### Despliegue
Un `git push` a `main` dispara el despliegue en Render si el *auto-deploy* está activado.

---

## 4. Arquitectura general

```
┌──────────────────────────── Navegador ────────────────────────────┐
│  pages/simulatePage.js ─┬─ topology/ (modelo, vista Cytoscape)    │
│                         ├─ editor/   (editor de red)              │
│                         ├─ visualization/ (paquetes, gráficos)    │
│                         ├─ ui/       (controles)                  │
│                         └─ simulation/simulationClient.js         │
│                                   │ postMessage                   │
│                         simulation/simulation.worker.js           │
│                           └─ SimulationEngine (agentes, red, DES) │
│                                                                   │
│  pages/dataPage.js ── realData/ + calibration/                    │
└───────────────┬───────────────────────────────────────────────────┘
                │ HTTP (HTML + JSON)
┌───────────────┴──────────── Servidor Express ─────────────────────┐
│ routes/index.js  → vistas EJS (/, /simulate, /data, /about)       │
│ routes/api.js    → /api/topologies, /api/reference/mobile-traffic │
│ routes/radar.js  → /api/radar/overview  ── services/radarOverview │
│                                              └─ radarClient ──────┼──► Cloudflare Radar
└───────────────────────────────────────────────────────────────────┘
```

### Patrón de diseño
- **Servidor: estructura tipo MVC de Express.**
  - `routes/` hace de controlador: valida la entrada y elige la respuesta.
  - `services/` contiene la lógica y el acceso a datos (ficheros JSON y API externas).
  - `views/` contiene las vistas EJS.
- **Cliente: capas separadas por responsabilidad**, en un estilo cercano a MVP (Modelo-Vista-Presentador):
  - **Modelo**, sin DOM: `topology/topologyModel.js`, `topology/topologyDocument.js`, `simulation/*`, `agents/*`, `calibration/calibrationProfile.js`.
  - **Vista**, solo pinta: `topology/topologyView.js`, `visualization/*`, `realData/overviewDashboard.js`, `editor/propertiesPanel.js`, `editor/validationPanel.js`.
  - **Presentador/controlador**, traduce eventos en cambios del modelo: `editor/topologyEditorController.js`, `editor/topologyEditor.js`, `ui/simulationControls.js`.
  - **Composición**: `pages/*Page.js` crea las piezas y las conecta. Es el único sitio que conoce todos los módulos de una página.
- **Simulación: eventos discretos (DES).** Una cola de prioridad ordena los eventos por tiempo simulado. Es determinista con la misma semilla.

### Principios que se han seguido
1. **Responsabilidades separadas**: cada archivo hace una cosa. No se concentra una funcionalidad entera en una clase.
2. **El motor de simulación no toca el DOM.** Así puede ejecutarse en el Worker y probarse con Node sin navegador.
3. **Honestidad científica**: el simulador demuestra un mecanismo, no la prevalencia real. Todo dato real va con su fuente, su unidad (peticiones o bytes) y sus limitaciones.
4. **Reproducibilidad**: semilla + topología + población + perfil de tráfico se pueden exportar en JSON.

---

## 5. Estructura de carpetas y archivos

```
render_app/
├── app.js                        Configuración de Express: middlewares, estáticos, routers, carga de .env
├── bin/www                       Arranque del servidor HTTP (puerto)
├── package.json / package-lock.json
├── docs/
│   └── guiaDeProgramador.md      Este documento
├── data/
│   ├── topologies/               Topologías de ejemplo (JSON) que sirve /api/topologies
│   │   ├── default.json          Red de ejemplo: 3 routers, FTTH, 5G, LPWAN, centro de datos, 4 servidores
│   │   └── campus-wifi.json      Campus con WiFi y granja de bots
│   └── reference/
│       └── mobile-traffic.json   Indicadores de Ericsson Mobility Report (con fuente y fecha)
├── routes/
│   ├── index.js                  Páginas: /, /simulate, /data, /about
│   ├── api.js                    /api/topologies, /api/topologies/:name, /api/reference/mobile-traffic
│   └── radar.js                  /api/radar/overview (proxy de Cloudflare Radar)
├── services/
│   ├── environmentFile.js        Carga de .env sin dependencias
│   ├── topologyRepository.js     Lee data/topologies (lista y carga, con validación de nombre)
│   ├── referenceRepository.js    Lee data/reference
│   ├── radarClient.js            Llamadas HTTP a Radar con token, timeout y reintento en minúsculas
│   ├── radarOverview.js          Consultas que necesita /data y normalización de respuestas
│   └── responseCache.js          Caché en memoria con caducidad (30 min para Radar)
├── views/
│   ├── index.ejs                 Portada
│   ├── simulate.ejs              Simulador + editor de red
│   ├── data.ejs                  Internet real
│   ├── about.ejs, error.ejs
│   └── partials/                 head, nav, footer, network (SVG decorativo de la portada)
└── public/
    ├── stylesheets/style.css     Todos los estilos (variables CSS en :root)
    ├── images/
    └── javascripts/
        ├── pages/                Punto de entrada de cada página (composición)
        │   ├── simulatePage.js
        │   └── dataPage.js
        ├── shared/               Constantes y utilidades comunes a cliente y Worker
        │   ├── trafficClasses.js     Clases de emisor (id, etiqueta, color, humano o no, población por defecto)
        │   ├── contentCategories.js  Categorías de contenido (web, red social, vídeo, telemetría)
        │   ├── trafficProfile.js     Perfil de vídeo por grupo (humano/bot) y normalización
        │   ├── simulationLimits.js   Límites comunes (máx. agentes por clase)
        │   └── seededRandom.js       Generador pseudoaleatorio con semilla (Mulberry32)
        ├── topology/             Modelo, validación y vista de la red
        │   ├── topologyModel.js      Modelo de solo lectura para el motor (nodos, enlaces, vecinos)
        │   ├── topologyDocument.js   Copia editable con eventos de cambio (la usa el editor)
        │   ├── topologySchema.js     Comprobación estructural al importar
        │   ├── topologyValidator.js  Validación semántica (IP, subredes, conectividad, capacidad, servicios)
        │   ├── routing.js            Dijkstra por latencia (tabla de rutas con caché por origen)
        │   ├── ipAddressing.js       Utilidades IPv4/CIDR y asignación de direcciones
        │   ├── addressPlanner.js     Propone IP/subred libres para nodos nuevos
        │   ├── networkCatalog.js     Tecnologías de acceso, servicios, tipos de nodo y valores por defecto
        │   ├── topologyRepository.js Fetch de topologías desde la API
        │   ├── experimentFile.js     Exportar/importar experimentos (JSON)
        │   └── topologyView.js       Vista Cytoscape (sincronización, modo edición, grosor por carga)
        ├── simulation/           Motor de simulación (se ejecuta en el Worker)
        │   ├── simulationEngine.js   Orquesta agentes, red, eventos y métricas
        │   ├── eventQueue.js         Montículo binario por tiempo (desempate estable)
        │   ├── messageCatalog.js     Tipos de mensaje y tamaños en bytes
        │   ├── serverResponder.js    Qué responde cada servidor a cada mensaje
        │   ├── contentPlatform.js    Feed de la red social y estadísticas de contenido sintético
        │   ├── metricsCollector.js   Ventanas de métricas de 1 s
        │   ├── simulation.worker.js  Bucle del Worker y protocolo de mensajes
        │   └── simulationClient.js   Envoltorio del Worker para la página
        ├── agents/               Comportamiento de cada tipo de agente
        │   ├── agent.js              Clase base (contrato)
        │   ├── humanAgent.js         Sesiones e inactividad, navegación, publicaciones y vídeo
        │   ├── botAgent.js           Rastreador clásico, peticiones regulares
        │   ├── genAiAgent.js         Publica y responde contenido sintético
        │   ├── sensorAgent.js        Telemetría periódica
        │   ├── contentActions.js     Acción compartida: publicar o responder
        │   └── agentFactory.js       Crea la población y asigna IP por red de acceso
        ├── visualization/        Pintado de resultados
        │   ├── packetRenderer.js     Paquetes animados en canvas sobre el grafo
        │   ├── trafficShareChart.js  Gráfico apilado por emisor o por contenido
        │   ├── statsPanel.js         Tarjetas de métricas (promedio de los últimos 10 s)
        │   └── trafficLegend.js      Leyenda de colores
        ├── editor/               Editor de topología
        │   ├── topologyEditor.js         Coordina las piezas del editor
        │   ├── topologyEditorController.js  Herramientas, selección, clics → cambios en el documento
        │   ├── editorTools.js            Identificadores de herramientas
        │   ├── editorToolbar.js          Botones, ejemplos, importar/exportar, aplicar
        │   ├── propertiesPanel.js        Formulario del elemento seleccionado
        │   ├── validationPanel.js        Lista de errores y avisos
        │   └── formFields.js             Generadores de campos de formulario
        ├── ui/                   Controles genéricos de página
        │   ├── simulationControls.js  Reproducir, velocidad, semilla, población, perfil de tráfico
        │   ├── modeTabs.js            Pestañas Simulación / Editor de red
        │   └── statusMessage.js       Mensajes de estado (error o información)
        ├── realData/             Página Internet real
        │   ├── realDataRepository.js  Fetch de /api/radar/overview y /api/reference/*
        │   ├── overviewDashboard.js   Pinta cada sección de Radar (cada una falla por separado)
        │   ├── shareBarChart.js       Barras horizontales de porcentajes
        │   ├── mobileReferencePanel.js Tarjetas de Ericsson con enlace a la fuente
        │   └── radarLabels.js         Países, periodos y traducción de categorías
        └── calibration/          De datos reales a parámetros del simulador
            ├── calibrationProfile.js  Cálculo de población y perfil de vídeo
            ├── calibrationPreview.js  Resumen legible del perfil calculado
            └── calibrationStore.js    Paso del perfil entre páginas (localStorage)
```

---

## 6. Funcionalidades

### 6.1 Simulador (`/simulate`, pestaña "Simulación")

- **Red**: nodos `router`, `access` (red de acceso con subred y tecnología) y `server` (servicio `web`, `social`, `video` o `iot`). Los enlaces tienen latencia (ms), ancho de banda (Mbps) y tasa de pérdida (0–1).
- **Agentes** (cada uno vive en una red de acceso que aloja su clase y recibe una IP de su subred):

| Clase (`id`) | Comportamiento | Peticiones/s esperadas |
|---|---|---|
| `human-mobile`, `human-desktop` | Alterna sesiones (media 25 s) e inactividad (media 35 s). En sesión actúa cada ~3 s: 15 % publica (la mitad responde a algo reciente) y el resto pide contenido (vídeo con la probabilidad del perfil; si no, web o red social). | ≈ 0,139 |
| `bot` | Cada 1–2 s pide contenido (70 % web, 30 % red social, o vídeo según el perfil). Nunca publica. | ≈ 0,667 |
| `genai` | Cada ~2,5 s: 30 % lee el feed y 70 % publica (el 70 % de las veces responde a algo reciente, sea humano o no). | 0,4 |
| `sensor` | Telemetría de 200 B cada 5 s ± 0,2 s a la Plataforma IoT. | 0,2 |

- **Red y tiempos**: enrutamiento estático por Dijkstra (peso = latencia). El retardo por salto es latencia + tamaño/ancho de banda. La pérdida se sortea por enlace al enviar. **No se modelan colas ni TCP**: es un modelo abstracto de nivel 3.
- **Servidores**: responden a `content-request` con 60 KB (web), 90 KB (red social) o 1,5 MB (vídeo, un fragmento de ~4 s a 3 Mbps). Las respuestas se atribuyen a la clase del agente que las pidió. Los `post` a la red social se guardan en `ContentPlatform`.
- **Métricas** (ventanas de 1 s simulado): bytes y mensajes por clase, por categoría de contenido, bytes por categoría × clase, bytes por enlace y pérdidas.
- **Contenido sintético**: % de publicaciones no humanas, respuestas bot→bot y la cadena más larga sin intervención humana.
- **Visualización**: paquetes coloreados por clase, grosor de enlace logarítmico según el *throughput*, gráfico apilado (por emisor o por contenido, en bytes o en mensajes) y tarjetas de métricas.
- **Controles**: iniciar/pausar, reiniciar, velocidad (x0,5 a x5 segundos simulados por segundo real), semilla, población por clase (0–40) y % de vídeo en las peticiones humanas y de bots.

> La duración de la animación de cada salto es una escala visual (350–1000 ms) para que los paquetes se vean. El motor usa siempre las latencias reales.

### 6.2 Editor de red (`/simulate`, pestaña "Editor de red")

- Herramientas: seleccionar, enlace (origen → destino), router, acceso, servidor y eliminar (también con la tecla Supr; Esc cancela).
- Los nodos nuevos reciben IP o subred libres (`addressPlanner.js`). Los enlaces nuevos heredan los parámetros típicos de la tecnología de acceso, o los del núcleo.
- Panel de propiedades por tipo de elemento. Al cambiar la tecnología de un acceso se restablecen los agentes alojados y el nombre por defecto.
- **Validación en vivo** (`topologyValidator.js`). Los errores bloquean la simulación; los avisos no.
  - Errores: IP no válida o repetida, CIDR no válido (prefijo 8–30), subredes solapadas, IP dentro de una subred de acceso, enlaces con valores imposibles, nodos aislados y subred sin capacidad para sus agentes.
  - Avisos: acceso sin agentes, clase sin red que la aloje, clase sin servidores a los que pedir y falta de Plataforma de vídeo.
- Ejemplos predefinidos (`data/topologies`), y exportar/importar experimento en JSON.
- Al aplicar, la red editada sustituye a la simulada y la simulación se reinicia.

### 6.3 Internet real (`/data`)

- País (mundial por defecto, más 13 países) y periodo (1, 7 o 28 días).
- Secciones de Radar: humanos/bots, dispositivo por clase, tipos de contenido (total/humanos/bots), quién pide vídeo/audio/imágenes y propósito de los rastreadores de IA. **Cada sección puede fallar por separado** y muestra su motivo.
- Indicadores de Ericsson (en bytes) con enlace a la fuente.
- Calibración: calcula la población y el perfil de vídeo, muestra una vista previa y al pulsar el botón abre el simulador ya calibrado.

### 6.4 Calibración (`calibration/calibrationProfile.js`)

- **Población**: se fija una base de 50 humanos (repartidos entre móvil y escritorio según Radar) y se calcula cuántos agentes automatizados hacen falta para que la fracción esperada de **peticiones** automatizadas coincida con la medida:
  `automatizados = s · H · r_humano / ((1 − s) · r_automatizado)`.
  `r_automatizado` es la media ponderada de bot y GenIA con su proporción por defecto (10:8), porque Radar no los separa. Si alguna clase supera 40, se escala todo. Los sensores no se calibran (no hay datos públicos).
- **Vídeo humano**: con la fracción de peticiones de vídeo de Radar, o con la fracción de peticiones necesaria para que el vídeo sea el X % de los **bytes** humanos (Ericsson, ≈75 %) según los tamaños de `messageCatalog.js`.
- Las tasas salen de `getExpectedRequestsPerSecond()` de cada agente: **si cambias el comportamiento de un agente, actualiza ese método**.

---

## 7. Formatos de datos

### 7.1 Topología (`data/topologies/*.json`)
```json
{
  "name": "Nombre visible",
  "description": "Texto libre",
  "nodes": [
    { "id": "R1", "type": "router", "label": "R1", "ip": "10.0.0.1", "position": { "x": 300, "y": 220 } },
    { "id": "ran5g", "type": "access", "label": "Acceso 5G", "accessTechnology": "5g",
      "subnet": "10.2.0.0/24", "hostedAgentClasses": ["human-mobile"], "position": { "x": 100, "y": 330 } },
    { "id": "web", "type": "server", "label": "Servidor web", "service": "web", "ip": "10.10.0.20", "position": { "x": 720, "y": 60 } }
  ],
  "links": [
    { "id": "ran5g-R1", "source": "ran5g", "target": "R1", "latencyMs": 15, "bandwidthMbps": 300, "lossRate": 0.005 }
  ]
}
```
- `accessTechnology`: `ftth`, `5g`, `wifi`, `lpwan`, `datacenter` (ver `networkCatalog.js`).
- `service`: `web`, `social`, `video`, `iot`.
- Convención de direcciones: routers `10.0.0.x`, accesos `10.N.0.0/24`, servidores `10.10.0.x`. La `.1` de cada subred de acceso es la pasarela.
- Para añadir un ejemplo basta con dejar un `.json` nuevo en `data/topologies/` (nombre en minúsculas, dígitos y guiones).

### 7.2 Experimento exportado
```json
{
  "formatVersion": 1,
  "exportedAt": "ISO-8601",
  "topology": { "...": "topología como en 7.1" },
  "simulation": {
    "seed": 42,
    "populationByClass": { "human-mobile": 12, "human-desktop": 8, "bot": 10, "genai": 8, "sensor": 15 },
    "trafficProfile": { "videoRequestShareByGroup": { "human": 0.1, "bot": 0.01 } }
  }
}
```
La importación acepta también una topología suelta (sin `topology` ni `simulation`).

### 7.3 Ventana de métricas (Worker → página)
```js
{
  startTime, endTime,                     // segundos simulados
  bytesByClass, messagesByClass,          // { 'human-mobile': n, ... }
  bytesByCategory, messagesByCategory,    // { web, social, video, telemetry }
  bytesByCategoryAndClass,                // { video: { bot: n, ... }, ... }
  bytesByLinkId,                          // { 'R1-R2': n, ... }
  droppedMessages
}
```

### 7.4 Respuesta de `/api/radar/overview?location=ES&dateRange=7d`
```js
{
  location: 'ES' | null, dateRange: '7d', lastUpdated, retrievedAt,
  sections: {
    humanVsBot:           { status: 'ok', shares: { human, bot } },
    devicesByClass:       { status: 'ok', shares: { human: { mobile, desktop, other }, bot: {...} } },
    contentTypes:         { status: 'ok', shares: { all: { html, images, video, ... }, human: {...}, bot: {...} } },
    multimediaHumanVsBot: { status: 'ok', shares: { video: { human, bot }, audio: {...}, images: {...} } },
    aiCrawlPurpose:       { status: 'error', message: '...' }   // ejemplo de sección fallida
  }
}
```
Valores en %. Las claves de Radar se normalizan a `snake_case` en minúsculas. Errores: 400 (parámetros no válidos), 503 `missing-token`, 502 `invalid-token` o `radar-unavailable`.

### 7.5 Perfil de calibración (localStorage `tarce.calibrationProfile`)
```js
{ createdAt, sourceDescription, inputs: {...},
  simulation: { populationByClass, trafficProfile } }
```
Solo se aplica si el simulador se abre con `/simulate?calibracion=1`. El parámetro se borra de la URL al aplicarlo.

---

## 8. Flujos internos

### 8.1 Protocolo página ↔ Worker
| Dirección | `type` | Datos |
|---|---|---|
| Página → Worker | `configure` | `topologyDefinition`, `populationByClass`, `seed`, `trafficProfile` (recrea el motor) |
| Página → Worker | `start` / `pause` | — |
| Página → Worker | `set-speed` | `simulatedSecondsPerRealSecond` |
| Worker → Página | `ready` | `agentCountByNodeId` |
| Worker → Página | `tick` (cada 50 ms reales) | `currentTime`, `transmissions` (máx. 120, solo para animar), `completedWindows`, `contentStatistics` |

### 8.2 Ciclo del motor (`SimulationEngine`)
1. `agent-activation` → `agent.act(context)` → `context.sendToService(...)` → `transmit(message)`.
2. `transmit` calcula la ruta, el retardo y la pérdida, registra las métricas y la transmisión visual y, si no se pierde, programa `message-delivery`.
3. `message-delivery` en un servidor → `serverResponder` → posible respuesta programada como `message-send` 5 ms después.
4. Se programa la siguiente activación con `getNextActivationDelaySeconds`.

### 8.3 Cambios en el editor
`TopologyDocument` emite `reloaded | structure | properties | position`. La página vuelve a pintar el grafo (salvo con `position`) y el editor revalida. **El listener de la vista se registra antes que el del editor**, para que el grafo esté actualizado cuando el editor marca errores.

---

## 9. Cómo extender

### Añadir un tipo de agente
1. Crear `agents/nuevoAgent.js` extendiendo `Agent`: `static getExpectedRequestsPerSecond()`, `getNextActivationDelaySeconds()` y `act()`.
2. Añadir la clase en `shared/trafficClasses.js` (id, etiqueta, color, `isHuman`, `defaultPopulation`).
3. Registrarla en `AGENT_TYPE_BY_TRAFFIC_CLASS` (`agents/agentFactory.js`).
4. Añadir los servicios que necesita en `SERVICE_REQUIRED_BY_CLASS` (`topology/topologyValidator.js`).
5. Opcional: añadirla a `defaultHostedClasses` de alguna tecnología (`networkCatalog.js`).

### Añadir un servicio o servidor
1. `SERVER_SERVICES` en `networkCatalog.js`.
2. Tamaño de respuesta en `messageCatalog.js` y, si cambia el comportamiento, `serverResponder.js`.
3. Categoría en `shared/contentCategories.js` (`CONTENT_CATEGORIES` y `CONTENT_CATEGORY_BY_SERVICE`).

### Añadir una sección de Radar
1. Consulta en `RADAR_QUERIES` y sección en `SECTION_QUERIES` (`services/radarOverview.js`), más su caso en `buildSection`.
2. Tarjeta en `views/data.ejs` y su caso en `realData/overviewDashboard.js` (gráfico y `buildChartData`).
3. Etiquetas nuevas en `realData/radarLabels.js`.

### Añadir una métrica
1. Contadores en `metricsCollector.js` (`createWindow` y `recordTransmission`).
2. Pintado en `visualization/statsPanel.js` o en `trafficShareChart.js` (`CHART_GROUPINGS`).

---

## 10. Convenciones de código

- **No eliminar comentarios existentes.** Los comentarios nuevos van en inglés, son mínimos y solo explican lo que no es evidente.
- **Nombres descriptivos** (`latencyMs`, `trafficClassId`, `automatedRequestShare`). Nada de `d`, `tmp` o `x2`.
- **Separar responsabilidades**: un archivo por pieza. No meter una funcionalidad nueva entera en una sola clase.
- **Respetar el estilo de cada zona**:
  - Servidor (`app.js`, `routes/`, `services/`): CommonJS, `var` y `function` como en `express-generator`, con `async/await` donde haga falta.
  - Cliente (`public/javascripts/`): módulos ES, `class`, `const`/`let`, funciones flecha.
- Constantes con nombre en `UPPER_SNAKE_CASE` al principio del archivo, en lugar de números sueltos.
- Textos de interfaz en español; identificadores y comentarios en inglés.
- Nada de `alert`, `confirm` ni `prompt`: los mensajes van en la página (`StatusMessage`, `ValidationPanel`).
- Accesibilidad: etiquetas en los controles, `aria-live` en mensajes dinámicos, foco visible y respeto a `prefers-reduced-motion`.
- Para un asistente de IA: si falta un archivo para entender el contexto, **pedirlo antes de suponer** su contenido.

---

## 11. Cómo probar

No hay framework de tests. Lo que se ha usado hasta ahora:

- **Motor sin navegador**: como el motor no usa el DOM, se puede importar desde Node:
  ```js
  const { SimulationEngine } = await import('./public/javascripts/simulation/simulationEngine.js');
  const engine = new SimulationEngine({ topologyDefinition, populationByClass, seed: 42 });
  engine.advanceTo(60);
  console.log(engine.drainCompletedWindows(), engine.getContentStatistics());
  ```
  Con la misma semilla, el resultado debe ser idéntico.
- **API de Radar falsa**: arrancar un servidor local que imite `/http/summary/:dimension` y `/ai/bots/summary/:dimension`, y lanzar la app con `RADAR_API_BASE_URL=http://localhost:PUERTO` y un token cualquiera.
- **Navegador sin interfaz** (Playwright/Chrome) para recorrer los flujos: simular, editar, validar, exportar/importar y calibrar.
- Comprobaciones manuales mínimas antes de subir: `/`, `/simulate` (iniciar, editor, aplicar), `/data` (con y sin token) y la consola sin errores. El 404 de `favicon.ico` es conocido.

---

## 12. Limitaciones conocidas

- La red es un modelo abstracto: sin colas, sin TCP, sin BGP/OSPF real, con rutas estáticas.
- Radar mide **peticiones HTTP en la red de Cloudflare**, no bytes ni todo Internet. "Móvil" es el dispositivo declarado. Las grandes plataformas de vídeo usan sus propias CDN, así que el vídeo aparece infrarrepresentado en Radar.
- Ericsson mide bytes en redes móviles, pero no separa humanos de bots.
- No hay fuente pública del tráfico IoT: los sensores son un supuesto del modelo.
- Las respuestas reales de Radar se han probado contra una API simulada. Si alguna sección muestra "Sin datos", revisar el nombre de la dimensión o la combinación de filtros en `radarOverview.js`.
- Cargar un ejemplo o importar en el editor sustituye la red sin pedir confirmación.
- La caché de Radar es en memoria: se pierde al reiniciar el servidor (Render reinicia los servicios gratuitos tras un rato de inactividad).

---

## 13. Hoja de ruta

| Iteración | Estado | Contenido |
|---|---|---|
| 1 | Hecha | Limpieza de la base de Express, navegación, router de API |
| 2 | Hecha | MVP del simulador (motor DES, agentes, animación, métricas) |
| 3 | Hecha | Editor de topología con validación e importación/exportación |
| 4 | Hecha | Internet real (Radar + Ericsson), tráfico de vídeo y calibración |
| 5 | Pendiente | Métricas DIT avanzadas: hilos coloreados por autor, diversidad léxica (*model collapse*), algoritmo de recomendación por *engagement* activable |
| 6 | Opcional | Pocos agentes "ricos" con LLM a través del backend (con caché y límites); calibración de enlaces con Ookla Open Data; serie temporal de Radar |

---

## 14. Fuentes de datos

- Cloudflare Radar — https://radar.cloudflare.com (API bajo licencia CC BY-NC 4.0; documentación en https://developers.cloudflare.com/radar/).
- Ericsson Mobility Report — https://www.ericsson.com/en/reports-and-papers/mobility-report (indicadores concretos y URL en `data/reference/mobile-traffic.json`).
