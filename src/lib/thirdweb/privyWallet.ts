import type { ConnectedWallet } from "@privy-io/react-auth";
import type { Wallet, Account } from "thirdweb/wallets";
import { EIP1193 } from "thirdweb/wallets";
import { client } from "./client";

/**
 * Bridge entre el wallet embedded de Privy y thirdweb v5.
 *
 * Copiado del patrón de endless-fall. Nunca accedemos ni exportamos la
 * private key: el `ConnectedWallet` de Privy expone un provider EIP-1193 que
 * firma las transacciones dentro de la custodia segura de Privy. El adaptador
 * de thirdweb crea una *vista* sobre ese mismo provider.
 */

/**
 * Crea un Wallet de thirdweb a partir de un wallet embedded de Privy.
 */
export async function privyWalletToThirdweb(
  privyWallet: ConnectedWallet,
): Promise<Wallet> {
  const provider = await privyWallet.getEthereumProvider();

  return EIP1193.fromProvider({
    provider,
    walletId: "adapter",
  });
}

/**
 * Conecta el wallet adaptador y devuelve su cuenta para enviar transacciones
 * de thirdweb (register, renew, setAddr, ...). Toda la firma ocurre en Privy.
 */
export async function getPrivyAccount(
  privyWallet: ConnectedWallet,
): Promise<Account> {
  const wallet = await privyWalletToThirdweb(privyWallet);
  return wallet.connect({ client });
}
