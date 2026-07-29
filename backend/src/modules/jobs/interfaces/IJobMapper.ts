import { NormalizedJob } from "@/modules/jobs/models/NormalizedJob.js";

export interface IJobMapper<TRawPayload = unknown> {
  mapToNormalizedJob(raw: TRawPayload, providerName: string): NormalizedJob;
  mapMany(rawList: TRawPayload[], providerName: string): NormalizedJob[];
}

