import { NextFunction, Request, Response } from 'express';
import { successResponse } from '@/shared/utils/response.js';
import { requireUserPrincipalId } from '@/modules/auto-apply/utils/require-user.util.js';
import { env } from '@/shared/config/env.conf.js';
import {
  isUserInRollout,
  parseAllowlist,
} from '@/modules/auto-apply/utils/assisted-apply-rollout.util.js';

/** AA-092 — per-user Phase 1 flag evaluation (kill switch ∩ cohort). */
export const getAssistedApplyRolloutFlagsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = requireUserPrincipalId(req);
    const allowlist = parseAllowlist(env.ASSISTED_APPLY_ROLLOUT_ALLOWLIST);
    const inWorkspace = isUserInRollout(userId, {
      percent: env.ASSISTED_APPLY_WORKSPACE_ROLLOUT_PERCENT,
      allowlist,
    });
    const inHandoff =
      env.ASSISTED_APPLY_DIRECT_HANDOFF !== false &&
      isUserInRollout(userId, {
        percent: env.ASSISTED_APPLY_HANDOFF_ROLLOUT_PERCENT,
        allowlist,
      });

    return res.status(200).json(
      successResponse('Assisted Apply rollout flags', {
        workspace: inWorkspace,
        directHandoff: inHandoff,
        rollout: {
          workspacePercent: env.ASSISTED_APPLY_WORKSPACE_ROLLOUT_PERCENT,
          handoffPercent: env.ASSISTED_APPLY_HANDOFF_ROLLOUT_PERCENT,
          allowlistCount: allowlist.length,
        },
      }),
    );
  } catch (error) {
    return next(error);
  }
};
