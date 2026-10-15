# bored.works — DApp para dominios `.bored`

DApp **Next.js + Privy + thirdweb** para interactuar con el `BoredRegistry`
de bored.works. Ofrece registro, renovación, búsqueda y **resolución inversa**
(Bored ID) de nombres `.bored`, con **login social para normies** (email /
Google / X) y una **wallet invisible** gestionada por Privy.

> Los smart contracts **no** se modifican. Esta DApp únicamente lee y escribe
> contra la dirección del contrato configurada en `.env.local`.

---

## ⚡ Lo más importante: misma identidad y misma wallet

La app usa el **mismo App ID de Privy** que el otro proyecto (`endless-fall`).
Gracias a esto, un usuario que entra aquí con su email/Google recibe la
**misma wallet embedded** y las **mismas credenciales** que en el otro sitio.
No hay que duplicar nada: Privy deriva la wallet del identificador dentro de
la misma aplicación.

---

## 🚀 Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

> `thirdweb` importa internamente los paquetes `@x402/*`; están listados en
> `package.json` (igual que en endless-fall) para que el build no falle.

### 2. Configurar el entorno

```bash
cp .env.local.example .env.local
```

Valores clave (edita según tu caso):

```
# Privy — App ID (el MISMO que endless-fall => misma wallet/credenciales)
NEXT_PUBLIC_PRIVY_APP_ID=cmu9tg1xh00rs0dl53h011pgt

# Thirdweb v5 — Client ID
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=b87bf115d95b5bb8b5c8920c401d185c

# Dirección del contrato BoredRegistry (desplegado en Polygon Amoy).
# Hoy es el contrato normal; cuando hagamos el upgrade a UUPS, aquí irá
# la dirección del PROXY (la pública).
NEXT_PUBLIC_REGISTRY_ADDRESS=0xb49059c50869b8ce11cD2002b79ffEa31A16A9df

# Red: "amoy" (default) | "polygon" | "apechain-testnet" | "apechain"
NEXT_PUBLIC_CHAIN=amoy

# Símbolo nativo para la UI y explorador (opcional).
NEXT_PUBLIC_NATIVE_SYMBOL=POL
NEXT_PUBLIC_EXPLORER_URL=https://amoy.polygonscan.com
```

### 3. Ejecutar en local

```bash
npm run dev
```

Abre la URL que muestra Next (normalmente `http://localhost:3000`).

### 4. Build de producción

```bash
npm run build
npm run start
```

---

## 🧩 Funcionalidades

| Sección        | Qué hace                                                 | Función del contrato    |
|----------------|----------------------------------------------------------|-------------------------|
| **Registrar**  | Consigue `alice.bored` con tu identidad (login social)   | `price()` + `register()`|
| **Renovar**    | Extiende la validez de un nombre existente               | `price()` + `renew()`   |
| **Buscar**     | ¿Existe? ¿Cuándo expira? ¿A qué dirección apunta?        | `nameExpiry()`, `resolve()` |
| **Bored ID**   | Dirección → nombre (`alice.bored` en vez de `0x…`)       | `nameOf()`              |

**Detalles del contrato que la DApp asume:**

- Precio calculado con `price(name, duration)` (descuento por longitud).
- Duración mínima de **1 mes** (`minRegistrationDuration = 30 días`).
- La búsqueda usa `nameExpiry > 0` para saber si un nombre está tomado.
- `resolve()` hace revert si no hay dirección configurada → lo capturamos.

---

## 🔐 Cómo funciona el wallet

- **Login**: Privy (`email`, `google`, `twitter`, `wallet`). Social primero.
- **Wallet embedded**: se crea automáticamente al entrar (`createOnLogin:
  "all-users"`). Es "invisible" para el usuario: no hace falta instalar nada.
- **Firma**: el bridge `privyWalletToThirdweb` (en `src/lib/thirdweb/
  privyWallet.ts`) conecta el wallet de Privy con thirdweb v5 vía EIP-1193.
  Toda la firma ocurre dentro de la custodia segura de Privy; nunca tocamos
  la private key. El patrón es idéntico al de `endless-fall`.

---

## 🗂️ Estructura

```
bored-works-dapp/
├── .env.local.example        # plantilla de entorno (copia a .env.local)
├── next.config.ts            # + turbopack.root (fix para rutas en user home)
├── tsconfig.json
├── public/favicon.svg
└── src/
    ├── app/
    │   ├── layout.tsx        # raíz (Providers)
    │   ├── providers.tsx      # PrivyProvider + ThirdwebProvider
    │   ├── page.tsx          # página principal
    │   └── globals.css       # estilos Tailwind v4
    ├── lib/
    │   ├── chains.ts         # redes (Amoy default) + getActiveChain
    │   ├── bored.ts          # helpers (duraciones, formato, validación)
    │   └── thirdweb/
    │       ├── client.ts     # cliente thirdweb v5
    │       ├── contracts.ts  # instancia del contrato + ABI real
    │       ├── calls.ts      # lecturas/escrituras (register, renew, ...)
    │       └── privyWallet.ts# bridge Privy -> thirdweb (EIP-1193)
    ├── hooks/
    │   └── useEmbeddedWallet.ts  # wallet embedded de Privy + dirección
    ├── abi/
    │   └── BoredRegistry.json  # ABI real extraída del compilado Foundry
    └── components/
        ├── AuthGate.tsx      # login social + barra de sesión
        ├── RegisterForm.tsx
        ├── RenewForm.tsx
        ├── Lookup.tsx
        └── ReverseId.tsx
```

---

## 🔒 Sobre el contrato / proxy

La **ABI es real**: extraída del artefacto de Foundry
(`out/BoredRegistry.sol/BoredRegistry.json`), no inventada. Si despliegas una
V2 o el proxy UUPS, actualiza `NEXT_PUBLIC_REGISTRY_ADDRESS` con la dirección
del **proxy** (la pública) y recalcula la ABI si cambió.

**Estado actual**: el contrato apunta al `BoredRegistry` normal desplegado en
**Polygon Amoy** (`0xb49059c50869b8ce11cD2002b79ffEa31A16A9df`). El upgrade a
proxy UUPS se hará más adelante.

---

## 🛠️ Tecnologías

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- [Privy v3](https://privy.io/) (login social + wallet embedded)
- [thirdweb v5](https://portal.thirdweb.com/) (web3)
- [Tailwind CSS v4](https://tailwindcss.com/) (estilos)
