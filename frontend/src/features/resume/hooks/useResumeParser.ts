import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { resumeService } from '@/features/resume/services/resume.service';
import type {
  ResumeParseProgress,
  ResumeParserMetadata,
  ResumeProfileFormValues,
} from '@/features/resume/types/resume.types';
import { mapResumeToProfile } from '@/features/resume/utils/mapResumeToProfile';

interface ParseInput {
  file: File;
  onParsing: () => void;
  onUploadProgress?: (progress: number) => void;
}

export function useResumeParser(onParsed: (values: ResumeProfileFormValues) => void) {
  const [parseProgress, setParseProgress] = useState<ResumeParseProgress | null>(null);
  const [metadata, setMetadata] = useState<ResumeParserMetadata | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: ({ file, onParsing, onUploadProgress }: ParseInput) =>
      resumeService.parse(file, {
        onParsing,
        onMetadata: setMetadata,
        onProgress: setParseProgress,
        onUploaded: setResumeId,
        onUploadProgress,
      }),
    mutationKey: ['resume', 'parse'],
    onSuccess: (response) => onParsed(mapResumeToProfile(response)),
  });

  return {
    error: mutation.error,
    isPending: mutation.isPending,
    metadata,
    parse: (file: File, onParsing: () => void, onUploadProgress?: (progress: number) => void) => {
      setParseProgress(null);
      setMetadata(null);
      return mutation.mutateAsync({ file, onParsing, onUploadProgress });
    },
    parseProgress,
    reset: () => {
      mutation.reset();
      setParseProgress(null);
      setMetadata(null);
      setResumeId(null);
    },
    resumeId,
  };
}
