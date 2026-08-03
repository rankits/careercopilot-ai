import axios from 'axios';

import type {
  CopilotChatRequest,
  CopilotChatResponse,
} from '@/features/copilot/types/copilot.types';
import { httpClient } from '@/services/httpClient';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const unwrapReply = (response: unknown): string => {
  if (!isRecord(response) || !isRecord(response.data)) {
    throw new Error('Unexpected Career Copilot response shape');
  }

  const payload = response.data;
  if (isRecord(payload.data) && typeof payload.data.reply === 'string') {
    return payload.data.reply;
  }

  if (typeof payload.reply === 'string') {
    return payload.reply;
  }

  throw new Error('Career Copilot reply was missing from the response');
};

export const normalizeCopilotError = (error: unknown): Error => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return new Error('Your session has expired. Please sign in again.');
    }
    if (!error.response) {
      return new Error('Unable to reach Career Copilot. Check your connection and try again.');
    }
    const payload: unknown = error.response.data;
    if (isRecord(payload) && typeof payload.message === 'string') {
      return new Error(payload.message);
    }
    if (error.response.status >= 500) {
      return new Error('Career Copilot is temporarily unavailable. Please try again.');
    }
  }

  return error instanceof Error ? error : new Error('Unable to reach Career Copilot.');
};

export const copilotService = {
  async chat(payload: CopilotChatRequest): Promise<CopilotChatResponse> {
    try {
      const response = await httpClient.post('/copilot/chat', payload);
      return { reply: unwrapReply(response) };
    } catch (error) {
      throw normalizeCopilotError(error);
    }
  },
};
