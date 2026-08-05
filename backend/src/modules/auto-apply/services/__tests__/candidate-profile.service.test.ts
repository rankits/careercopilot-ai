import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CandidateApplicationProfileService } from '@/modules/auto-apply/services/candidate-profile.service.js';
import { ICandidateApplicationProfileRepository } from '@/modules/auto-apply/contracts/candidate-profile.contract.js';
import { CandidateApplicationProfileDto } from '@/modules/auto-apply/types/candidate-profile.types.js';

describe('CandidateApplicationProfileService', () => {
  let mockRepo: ICandidateApplicationProfileRepository;
  let service: CandidateApplicationProfileService;

  const mockProfile: CandidateApplicationProfileDto = {
    id: 'profile-1',
    userId: 'user-1',
    preferences: {
      desiredRoles: ['Backend Engineer'],
      preferredLocations: ['Remote'],
      remotePreference: 'REMOTE',
      remotePreferences: ['REMOTE'],
    },
    links: {},
    verification: {},
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    mockRepo = {
      findByUserId: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue(mockProfile),
    };
    service = new CandidateApplicationProfileService(mockRepo);
  });

  it('returns null when no profile exists for the user', async () => {
    const result = await service.getProfile('user-1');
    expect(result).toBeNull();
    expect(mockRepo.findByUserId).toHaveBeenCalledWith('user-1');
  });

  it('returns the existing profile scoped to the caller', async () => {
    vi.mocked(mockRepo.findByUserId).mockResolvedValue(mockProfile);
    const result = await service.getProfile('user-1');
    expect(result).toEqual(mockProfile);
  });

  it('delegates upsert to the repository with the caller id and input', async () => {
    const input = { preferences: { remotePreference: 'REMOTE' as const } };
    await service.upsertProfile('user-1', input as never);
    expect(mockRepo.upsert).toHaveBeenCalledWith('user-1', input);
  });
});
