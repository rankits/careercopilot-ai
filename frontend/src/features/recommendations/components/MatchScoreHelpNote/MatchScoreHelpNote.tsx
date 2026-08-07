import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useId } from 'react';

import {
  AI_MATCH_COPY,
  AI_MATCH_MATCH_SCORE_HELP,
  type MatchScoreHelpMode,
} from '@/constants/pages/aiMatch';
import { aiMatchPageSx } from '@/pages/AiMatchPage/styles';

type MatchScoreHelpNoteProps = {
  mode: MatchScoreHelpMode;
};

export function MatchScoreHelpNote({ mode }: MatchScoreHelpNoteProps) {
  const titleId = useId();
  const message = AI_MATCH_MATCH_SCORE_HELP[mode];

  return (
    <Box aria-labelledby={titleId} role="note" sx={aiMatchPageSx.matchScoreHelp}>
      <Box aria-hidden="true" sx={aiMatchPageSx.matchScoreHelpIcon}>
        <InfoOutlinedIcon fontSize="small" />
      </Box>
      <Box sx={aiMatchPageSx.matchScoreHelpCopy}>
        <Typography component="p" id={titleId} sx={aiMatchPageSx.matchScoreHelpTitle}>
          {AI_MATCH_COPY.matchScoreHelpTitle}
        </Typography>
        <Typography component="p" sx={aiMatchPageSx.matchScoreHelpMessage}>
          {message}
        </Typography>
      </Box>
    </Box>
  );
}
