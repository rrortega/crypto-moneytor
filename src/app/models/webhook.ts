/**
 * Estructura de datos para el webhook que se procesa.
 * - data: la información de la transacción (network, coin, confirmations, etc.)
 * - wallet: dirección de la wallet
 * - callbackUrl: URL a la que se envía este webhook
 */
export interface WebhookData {
    wallet: string;
    data: {
      txID: string;
      [key: string]: any;
    };
    callbackUrl?: string;
  } 