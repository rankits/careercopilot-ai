export { default as connectedAccountsRoutes } from '@/modules/connected-accounts/routes/connected-accounts.route.js';
export {
  ConnectedAccountCredentialService,
  GMAIL_SEND_SCOPE,
} from '@/modules/connected-accounts/services/ConnectedAccountCredentialService.js';
export type {
  ResolvedSendableGoogleAccount,
  SendableGoogleAccountMeta,
} from '@/modules/connected-accounts/services/ConnectedAccountCredentialService.js';
