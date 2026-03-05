import { MercadoPagoConfig, Preference, Payment, PreApprovalPlan, PreApproval } from 'mercadopago';

const isProduction = process.env.MP_ENVIRONMENT === 'production';

const accessToken = isProduction
  ? process.env.MP_ACCESS_TOKEN
  : process.env.MP_ACCESS_TOKEN_TEST || process.env.MP_ACCESS_TOKEN;

if (!accessToken) {
  console.warn('[MercadoPago] No access token configured. Set MP_ACCESS_TOKEN or MP_ACCESS_TOKEN_TEST in .env');
}

const mpConfig = new MercadoPagoConfig({
  accessToken: accessToken || '',
});

export const mpPreference = new Preference(mpConfig);
export const mpPayment = new Payment(mpConfig);
export const mpPreApprovalPlan = new PreApprovalPlan(mpConfig);
export const mpPreApproval = new PreApproval(mpConfig);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const MP_URLS = {
  success: `${APP_URL}/billing/success`,
  failure: `${APP_URL}/billing/failure`,
  pending: `${APP_URL}/billing/pending`,
  notification: `${APP_URL}/api/webhooks/mercadopago`,
  subscriptionBack: `${APP_URL}/billing/success`,
};

export { mpConfig, isProduction, APP_URL };
