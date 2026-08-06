import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import type { SidebarVariant } from '@/components/organisms/Sidebar/interfaces';
import { useToast } from '@/components/organisms/Toast/ToastContext';
import { ResumeVersionsDialog } from '@/features/resume/components/ResumeVersionsDialog';

import { useLogout } from '@/features/auth/hooks/useLogout';
import { useAppSelector } from '@/hooks/redux';

import { AppHeader, CareerCopilot, Sidebar } from '@/components';
import { ROUTES } from '@/constants/routes';
import { CopilotSessionProvider } from '@/features/copilot';
import { resumeService } from '@/features/resume/services/resume.service';
import type { UploadedResumeVersion } from '@/features/resume/types/resume.types';
import { useMediaQuery } from '@/lib/material';

export function AppLayout() {
  const isMobile = useMediaQuery('(max-width: 760px)');
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [sidebarVariant, setSidebarVariant] = useState<SidebarVariant>('open');
  const [uploadedResumes, setUploadedResumes] = useState<UploadedResumeVersion[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const activeItemId =
    pathname === ROUTES.PROFILE_EDIT || pathname.startsWith(`${ROUTES.PROFILE}/`)
      ? 'settings'
      : pathname === ROUTES.SAVED_JOBS
        ? 'saved-jobs'
        : pathname === ROUTES.AI_MATCH
          ? 'ai-match'
          : pathname === ROUTES.AUTO_APPLY
            ? 'auto-apply'
            : pathname === ROUTES.ASSISTED_APPLICATIONS ||
                pathname.startsWith('/assisted-apply/')
              ? 'assisted-applications'
            : pathname === ROUTES.BROWSER_EXTENSION
              ? 'browser-extension'
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
  const userName = user?.name ?? user?.email ?? 'User';
  const userRoleLabel = user?.role === 'admin' || user?.role === 'ADMIN' ? 'Admin' : undefined;
  const latestResume = uploadedResumes[0] ?? null;

  const refreshUploadedResumes = useCallback(async () => {
    try {
      const resumes = await resumeService.listResumes();
      setUploadedResumes(resumes);
    } catch {
      setUploadedResumes([]);
    }
  }, []);

  useEffect(() => {
    void refreshUploadedResumes();
  }, [refreshUploadedResumes, pathname]);

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

  return (
    <CopilotSessionProvider>
      <div className="app-shell">
        <Sidebar
          activeItemId={activeItemId}
          isDownloadingLatestResume={Boolean(latestResume && downloadingId === latestResume.id)}
          latestResumeName={latestResume?.originalName ?? null}
          mobileMode={isMobile ? 'bottomNav' : undefined}
          onDownloadLatestResume={() => {
            if (latestResume) void handleDownload(latestResume);
          }}
          onOpenResumeVersions={() => setIsVersionsOpen(true)}
          onVariantChange={setSidebarVariant}
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
        onClose={() => setIsVersionsOpen(false)}
        onDownload={(resume) => void handleDownload(resume)}
        open={isVersionsOpen}
        resumes={uploadedResumes}
      />
    </CopilotSessionProvider>
  );
}
