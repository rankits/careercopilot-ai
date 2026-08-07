import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import type { SidebarVariant } from '@/components/organisms/Sidebar/interfaces';
import { useToast } from '@/components/organisms/Toast/ToastContext';
import { ResumeVersionsDialog } from '@/features/resume/components/ResumeVersionsDialog';

import { useLogout } from '@/features/auth/hooks/useLogout';
import { useAppSelector } from '@/hooks/redux';

import { AppHeader, CareerCopilot, Sidebar } from '@/components';
import { ROUTES } from '@/constants/routes';
import { CopilotSessionProvider, useCopilotSession } from '@/features/copilot';
import { resumeService } from '@/features/resume/services/resume.service';
import type { UploadedResumeVersion } from '@/features/resume/types/resume.types';
import { useMediaQuery } from '@/lib/material';
import { toTitleCase } from '@/lib/toTitleCase';

export function AppLayout() {
  return (
    <CopilotSessionProvider>
      <AppLayoutShell />
    </CopilotSessionProvider>
  );
}

function AppLayoutShell() {
  const isMobile = useMediaQuery('(max-width: 760px)');
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { toggleOpen } = useCopilotSession();
  const [sidebarVariant, setSidebarVariant] = useState<SidebarVariant>('open');
  const [uploadedResumes, setUploadedResumes] = useState<UploadedResumeVersion[]>([]);
  const [resumesLoaded, setResumesLoaded] = useState(false);
  const [isLoadingResumes, setIsLoadingResumes] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const activeItemId =
    pathname === ROUTES.PROFILE_EDIT || pathname.startsWith(`${ROUTES.PROFILE}/`)
      ? 'settings'
      : pathname === ROUTES.SAVED_JOBS
        ? 'saved-jobs'
        : pathname === ROUTES.AI_MATCH
          ? 'ai-match'
          : pathname === ROUTES.APPLICATIONS
            ? 'applications'
            : pathname === ROUTES.JOB_FEED || pathname.startsWith('/jobs/')
              ? 'jobs-feed'
              : pathname === ROUTES.SAVED_RESUMES || pathname.startsWith(`${ROUTES.SAVED_RESUMES}/`)
                ? 'saved-resumes'
                : pathname.startsWith(ROUTES.RESUME_BUILDER)
                  ? 'resume-builder'
                  : 'dashboard';

  const { isLoggingOut, logout } = useLogout();
  const user = useAppSelector((state) => state.auth.user);
  const userName = user?.name ? toTitleCase(user.name) : (user?.email ?? 'User');
  const userRoleLabel = user?.role === 'admin' || user?.role === 'ADMIN' ? 'Admin' : undefined;
  const latestResume = uploadedResumes[0] ?? null;

  const refreshUploadedResumes = useCallback(async () => {
    setIsLoadingResumes(true);
    try {
      const resumes = await resumeService.listResumes();
      setUploadedResumes(resumes);
      setResumesLoaded(true);
      return resumes;
    } catch {
      setUploadedResumes([]);
      setResumesLoaded(true);
      return [];
    } finally {
      setIsLoadingResumes(false);
    }
  }, []);

  const ensureUploadedResumesLoaded = useCallback(async () => {
    if (resumesLoaded) {
      return uploadedResumes;
    }

    return refreshUploadedResumes();
  }, [refreshUploadedResumes, resumesLoaded, uploadedResumes]);

  useEffect(() => {
    void ensureUploadedResumesLoaded();
  }, [ensureUploadedResumesLoaded]);

  const handleDownload = async (resume: UploadedResumeVersion) => {
    setDownloadingId(resume.id);
    try {
      await resumeService.downloadResume(resume.id, resume.originalName);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to download this resume.',
        severity: 'error',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadLatestResume = () => {
    void (async () => {
      const resumes = await ensureUploadedResumesLoaded();
      const latest = resumes[0];

      if (!latest) {
        showToast({
          message: 'No resume uploaded yet. Add one from Edit Profile.',
          severity: 'info',
        });
        return;
      }

      await handleDownload(latest);
    })();
  };

  const handleOpenResumeVersions = () => {
    setIsVersionsOpen(true);
    void ensureUploadedResumesLoaded();
  };

  return (
    <>
      <div className="app-shell">
        <Sidebar
          activeItemId={activeItemId}
          isDownloadingLatestResume={Boolean(latestResume && downloadingId === latestResume.id)}
          latestResumeName={resumesLoaded ? (latestResume?.originalName ?? null) : null}
          latestResumeUploadedAt={latestResume?.uploadedAt ?? null}
          mobileMode={isMobile ? 'bottomNav' : undefined}
          onDownloadLatestResume={handleDownloadLatestResume}
          onLogoutClick={() => {
            if (!isLoggingOut) {
              void logout();
            }
          }}
          onOpenAiAssistant={toggleOpen}
          onOpenResumeVersions={handleOpenResumeVersions}
          onSettingsClick={() => void navigate(ROUTES.PROFILE_EDIT)}
          onVariantChange={setSidebarVariant}
          resumeListLoaded={resumesLoaded}
          userName={userName}
          variant={sidebarVariant}
        />
        <div className="content-shell">
          <AppHeader
            onLogoutClick={() => {
              if (!isLoggingOut) {
                void logout();
              }
            }}
            onSettingsClick={() => void navigate(ROUTES.PROFILE_EDIT)}
            userAvatarUrl={user?.profileImage ?? undefined}
            userName={userName}
            userRoleLabel={userRoleLabel}
          />
          <main className="main-content">
            <Outlet />
          </main>
        </div>
        <CareerCopilot />
      </div>

      <ResumeVersionsDialog
        downloadingId={downloadingId}
        isLoading={isLoadingResumes}
        onClose={() => setIsVersionsOpen(false)}
        onDownload={(resume) => void handleDownload(resume)}
        open={isVersionsOpen}
        resumes={uploadedResumes}
      />
    </>
  );
}
