import { Alert } from '@/lib/material';

type FeedbackNoticeProps = {
  notice: string | null;
  onClose: () => void;
};

export function FeedbackNotice({ notice, onClose }: FeedbackNoticeProps) {
  if (!notice) return null;

  return (
    <Alert onClose={onClose} role="status" severity="success">
      {notice}
    </Alert>
  );
}
