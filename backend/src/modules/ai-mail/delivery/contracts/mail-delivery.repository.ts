export type MailDeliveryStatus =
  'pending' | 'sending' | 'sent' | 'failed' | 'unknown' | 'cancelled';

export type MailDeliveryProviderName = 'google';

export type MailDeliveryUserResolution = 'confirmed_sent' | 'confirmed_not_sent';

export interface MailDeliveryRecord {
  id: string;
  userId: string;
  draftId: string;
  draftVersion: number;
  contentHash: string;
  connectedAccountId: number;
  provider: MailDeliveryProviderName;
  status: MailDeliveryStatus;
  idempotencyKey: string;
  providerMessageId?: string;
  providerThreadId?: string;
  recipientEmail: string;
  recipientHash?: string;
  fromEmail: string;
  resumeId: string;
  subjectSnapshot?: string;
  companyNameSnapshot?: string;
  roleTitleSnapshot?: string;
  normalizedErrorCode?: string;
  userResolution?: MailDeliveryUserResolution;
  userResolvedAt?: Date;
  attemptedAt: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMailDeliveryInput {
  userId: string;
  draftId: string;
  draftVersion: number;
  contentHash: string;
  connectedAccountId: number;
  provider: MailDeliveryProviderName;
  status: MailDeliveryStatus;
  idempotencyKey: string;
  recipientEmail: string;
  recipientHash?: string;
  fromEmail: string;
  resumeId: string;
  subjectSnapshot?: string;
  companyNameSnapshot?: string;
  roleTitleSnapshot?: string;
}

export interface UpdateMailDeliveryInput {
  status?: MailDeliveryStatus;
  providerMessageId?: string;
  providerThreadId?: string;
  normalizedErrorCode?: string;
  sentAt?: Date | null;
  userResolution?: MailDeliveryUserResolution;
  userResolvedAt?: Date | null;
}

export interface ListMailDeliveriesFilter {
  userId: string;
  page: number;
  limit: number;
  status?: MailDeliveryStatus;
  draftId?: string;
  company?: string;
  role?: string;
  connectedAccountId?: number;
  from?: Date;
  to?: Date;
}

export interface MailDeliveryPage {
  items: MailDeliveryRecord[];
  page: number;
  limit: number;
  total: number;
}

export interface MailDeliveryRepository {
  findByIdempotencyKey(userId: string, idempotencyKey: string): Promise<MailDeliveryRecord | null>;

  findSuccessfulByDraftHash(input: {
    draftId: string;
    contentHash: string;
    draftVersion: number;
  }): Promise<MailDeliveryRecord | null>;

  findByIdForUser(id: string, userId: string): Promise<MailDeliveryRecord | null>;

  listForUser(filter: ListMailDeliveriesFilter): Promise<MailDeliveryPage>;

  listForDraft(draftId: string, userId: string): Promise<MailDeliveryRecord[]>;

  findRecentByRecipientHash(input: {
    userId: string;
    recipientHash: string;
    since: Date;
  }): Promise<MailDeliveryRecord[]>;

  countAttemptsInWindow(input: { userId: string; since: Date }): Promise<number>;

  create(input: CreateMailDeliveryInput): Promise<MailDeliveryRecord>;

  update(id: string, input: UpdateMailDeliveryInput): Promise<MailDeliveryRecord>;
}
