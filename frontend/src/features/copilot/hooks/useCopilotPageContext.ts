import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import { useAppSelector } from '@/hooks/redux';

import { applicationsService } from '@/features/applications/services/applications.service';
import type { CopilotChatContext } from '@/features/copilot/types/copilot.types';
import { jobsService } from '@/features/jobs/services/jobs.service';
import { resumeService } from '@/features/resume/services/resume.service';

const isJobDetailPath = (pathname: string) => /^\/jobs\/[^/]+$/.test(pathname);

export function useCopilotPageContext() {
  const { pathname } = useLocation();
  const params = useParams<{ jobId?: string }>();
  const user = useAppSelector((state) => state.auth.user);

  const jobId = isJobDetailPath(pathname) ? params.jobId : undefined;
  const isApplicationsPage = pathname.startsWith('/applications');

  const profileQuery = useQuery({
    queryFn: () => resumeService.getMyProfile(),
    queryKey: ['copilot', 'profile'],
    staleTime: 60_000,
  });

  const jobQuery = useQuery({
    enabled: Boolean(jobId),
    queryFn: ({ signal }) => jobsService.getJob(jobId!, { signal }),
    queryKey: ['copilot', 'job', jobId],
    staleTime: 60_000,
  });

  const applicationsQuery = useQuery({
    enabled: isApplicationsPage,
    queryFn: () => applicationsService.list({ limit: 20, page: 1 }),
    queryKey: ['copilot', 'applications', 'snapshot'],
    staleTime: 30_000,
  });

  const context = useMemo((): CopilotChatContext => {
    const next: CopilotChatContext = {
      profile: user
        ? {
            bio: user.bio,
            email: user.email,
            firstName: user.firstName,
            id: user.id,
            lastName: user.lastName,
            name: user.name,
            phone: user.phone,
          }
        : undefined,
    };

    if (profileQuery.data) {
      next.resume = {
        certifications: profileQuery.data.certifications,
        education: profileQuery.data.education,
        experience: profileQuery.data.experience,
        isComplete: profileQuery.data.isComplete,
        personalDetails: profileQuery.data.personalDetails,
        skills: profileQuery.data.skills,
        sourceResumeId: profileQuery.data.sourceResumeId,
      };
    }

    if (jobId) {
      next.jobId = jobId;
    }

    if (jobQuery.data) {
      next.job = {
        benefits: jobQuery.data.benefits,
        company: jobQuery.data.company.name,
        description: jobQuery.data.descriptionText || jobQuery.data.descriptionHtml,
        employmentType: jobQuery.data.employmentType ?? undefined,
        id: jobQuery.data.id,
        location: jobQuery.data.location.formatted,
        skills: jobQuery.data.skills,
        title: jobQuery.data.title,
      };
    }

    if (applicationsQuery.data?.items?.length) {
      next.applications = applicationsQuery.data.items.map((item) => ({
        company: item.companyName,
        status: item.currentStatus,
        title: item.jobTitle,
      }));
    }

    return next;
  }, [applicationsQuery.data, jobId, jobQuery.data, profileQuery.data, user]);

  return {
    context,
    page: pathname,
  };
}
