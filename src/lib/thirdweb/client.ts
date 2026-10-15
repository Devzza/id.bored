import { createThirdwebClient } from "thirdweb";

/**
 * Cliente thirdweb v5.
 *
 * NEXT_PUBLIC_THIRDWEB_CLIENT_ID se define en .env.local. Por defecto apunta
 * al mismo Client ID que usa endless-fall (b87b...) manteniendo los flujos
 * consistentes; cámbialo al de tu proyecto bored.works dedicado si lo tienes.
 */
export const client = createThirdwebClient({
  clientId:
    process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID ||
    "b87bf115d95b5bb8b5c8920c401d185c",
});
