# bored.works — Visión de producto

> **Una sola máquina, varias caras.** Documento de arquitectura y producto que
> une todas las decisiones de la hoja de ruta: identidad `.bored`, login,
> gateway web, app móvil y — al fondo — una red social descentralizada.
>
> Fecha: 2026-10-02

---

## 1. La idea central en una frase

**`.bored` es tu identidad.** Un nombre corto (`alice.bored`) que es tu *handle*,
tu cuenta verificable, tu perfil y tu puerta de entrada a la web — detrás del cual
hay una wallet, contenido publicado y, algún día, una red social completa.

No es "un dominio más". Es la pieza de **identidad** de un ecosistema: lo que te
representa, te verifica y te acompaña a donde vayas.

---

## 2. La regla de oro de arquitectura

> **La identidad (`.bored`) vive on-chain, en nuestro contrato. El login (Privy)
> es solo la puerta de acceso.** Son capas separadas y desacopladas.

```
┌─────────────────────────────────────────────────────────────┐
│  CAPA 1 — IDENTIDAD (on-chain)                               │
│  BoredRegistry: alice.bored → wallet + contenthash + records │
│  * Es Nuestra. Vive en el contrato, no en Privy ni en Yuga.  │
└─────────────────────────────────────────────────────────────┘
         │                     │
         ▼                     ▼
┌──────────────────┐   ┌──────────────────────────────┐
│  CAPA 2 — SERVIR  │   │  CAPA 3 — ACCESO (dispositivo)│
│  Gateway *.bored  │   │  • App móvil (resolución     │
│  .world → IPFS/...│   │    nativa de .bored)         │
│  (backend)        │   │  • Chrome via gateway        │
└──────────────────┘   │  • (futuro) extensiones        │
                       └──────────────────────────────┘
```

**Por qué importa:** si un día cambiamos de Privy, la identidad sigue.
Si Yuga/Glyph quiere interoperar, la identidad ya es un estándar EVM abierto.

---

## 3. El login (lo que ya tenemos)

- **Privy** (`email`, `google`, `twitter`, `wallet`) — login social para normies.
- **Wallet embedded invisible** (`createOnLogin: "all-users"`).
- **Misma wallet/credenciales** entre proyectos (mismo App ID que `endless-fall`).

| Método | Estado |
|--------|--------|
| Google | ✅ hoy |
| Email (magic link) | ✅ hoy |
| Twitter | ✅ hoy |
| **`alice.bored` como login** | 🔨 por construir |
| SMS (recovery) | ⏳ cuando Privy lo suelte (o fallback propio) |

**Login futuro con `id.bored` (recovery):**
```
id.bored → resolve() → wallet → Privy.getUser({address}) → magic link / SMS
```
El nombre ES un alias de la wallet, y la wallet ES el ancla de la cuenta en Privy.

---

## 4. Hosting web (modelo ENS)

ENS **no aloja** nada: solo **apunta** (nombre → contenthash on-chain) y el
contenido vive en IPFS/Arweave. Nuestro contrato ya tiene `setContenthash`/
`contenthash`, así que ya tenemos la semántica:

```
alice.bored --contenthash--> ipfs://Qm...  ✅ (ya en el contrato)
```

**Lo que falta** para "hostear" en el navegador: un **gateway** + **DNS**.
Ninguno es caro ni mágico.

---

## 5. Acceso de los normies (las 2-3 vías)

Los navegadores **no resuelven `.bored` nativamente** hoy. Un normie accede por:

| Prioridad | Vía | Cómo lo usa el normie | Coste |
|-----------|-----|------------------------|-------|
| 🥇 | **Dentro de nuestra app** (`bored.works`) | teclea su `id.bored`, la UI lo resuelve | ✅ casi listo |
| 🥈 | **Gateway `*.bored.world`** | teclea `alice.bored.world`, la ve, listo | ~10 €/mes |
| 🥉 | **App móvil (Play Store)** con resolución nativa | teclea `alice.bored` a secas en la app | proyecto |

> El "teclear `alice.bored` a secas en Chrome" es visión a futuro (extensiones o
> soporte del navegador), no el MVP.

---

## 6. La app móvil (wallet + navegador friendly)

**Diferenciador:** las wallets actuales (MetaMask…) están enfocadas a **finanzas**
y asustan a normies. Queremos una de **identidad + navegador** primero.

**Regla clave de coste/riesgo:** **no reinventar la gestión de claves.** Reutilizar
Privy para la wallet → la app es un "cliente de identidad + navegador" ligero, no
una wallet-from-scratch. Esto baja el coste y el riesgo (key management) ~90%.

| Pieza | Coste |
|-------|-------|
| Cuenta desarrollador Google Play | 25 $ (único) |
| Servidores/API backend | ~5–20 €/mes |
| Gateway `*.bored.world` (VPS) | ~10 €/mes |
| Dominio `.world` | ~12 €/año |
| **El coste real** | desarrollo + seguridad + mantenimiento (no hosting) |

---

## 7. La red social (X/Twitter + Reddit descentralizado)

**No es un proyecto paralelo: es la misma máquina.** La identidad `.bored` +
contenthash + wallets **ya son la red social sin feed**.

| Pieza de la red social | Cómo la resuelve nuestra stack |
|------------------------|--------------------------------|
| El *handle* (`@alice`) | `alice.bored` vía `nameOf()` |
| Verificación anti-suplantación | firma con la wallet (nadie finge ser `alice.bored`) |
| Perfil / posts | `contenthash` + records apuntando a IPFS |
| Quién es quién | el registry (índice) |
| Login para normies | Privy (email/Google) |
| Servir en web | gateway `*.bored.world` |
| Cliente | la app móvil |

### Modelo Twitter vs Reddit
- **Twitter** (feed global / seguir): capa de agregación sobre los contenthahs.
- **Reddit** (comunidades / subreddits): **ya lo soporta nuestro contrato** con
  `setSubdomainOwner` (`vibes.alice.bored` = un subreddit).

> 💡 Nuestro contrato **ya tiene subdominios** (`setSubdomainOwner` línea 240):
> el modelo "comunidad" de Reddit ya está en el código base.

### Diferenciador real frente a X/Reddit
**Identidad + reputación verificable on-chain** (firma, antigüedad del nombre,
seguidores verificados). No es "confiar en la moderación de Twitter": es
criptográficamente verificable.

### El reto honesto
La parte dura **no es la identidad**, es:
- **Descubrimiento** (cómo encuentra el normie `alice.bored`)
- **Moderación** (contenido ilegal/spam en red descentralizada)
- **UX del feed** (más rápido y simple que X/Reddit)
- **Tracción / red del efecto** (~90% del trabajo, no el código)

---

## 8. Roadmap por fases y coste

| Fase | Qué | Resultado | Coste aprox. |
|------|-----|-----------|--------------|
| **1 (ahora)** | App resuelve `id.bored` dentro de la UI | identidad usable (MVP) | ✅ ya casi |
| **2** | Gateway `*.bored.world` | `alice.bored.world` funcional en Chrome | ~10 €/mes |
| **3** | App Play Store (navegador + resolución nativa) | `alice.bored` a secas en la app | proyecto |
| **4** | Capa de feed / red social | Twitter+Reddit sobre `.bored` | proyecto grande |

**Orden de prioridad:** 1 y 2 primero (rápido y barato → validar), 3 cuando haya
tracción, 4 como la visión de largo plazo.

---

## 9. Decisiones abiertas / notas

- [ ] **Login por `id.bored`**: vía Privy Server API (recomendado) vs. tabla propia de recovery (fallback para SMS temprano).
- [ ] **Índice email → id.bored**: off-chain (DB) para el MVP/sobre la V2 del contrato (UUPS) si se quiere on-chain.
- [ ] **Interop con Yuga/Glyph**: no dependemos de su roadmap; nuestra identidad es un estándar EVM abierto.
- [ ] **Moderación y descubrimiento** del feed cuando lleguemos a la fase 4.
- [ ] Puerta de entrada del dominio `.bored` en Chrome (extensiones) — futuro.

---

## 10. Glosario rápido

- **`.bored`**: nuestra identidad (handle) — alojada on-chain en `BoredRegistry`.
- **`contenthash`**: apunta del nombre al contenido (IPFS/Arweave) — ya en el contrato.
- **Reverse resolution (`nameOf`)**: wallet → nombre (mostrar `alice.bored` en vez de `0x…`).
- **Gateway (`*.bored.world`)**: servidor que resuelve el contenthash y sirve la web.
- **Privy**: login + wallet embedded (NO es la identidad; es la puerta).
- **Subdominios (`setSubdomainOwner`)**: base del modelo "comunidad" estilo Reddit.
