import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import CheckIcon from '@mui/icons-material/Check';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { SUPPORTED_RESUME_TYPES } from '../../constants';

import { SupportCard } from './styles';

export function SupportedResumeCard() {
  return (
    <SupportCard>
      <Box className="support-header">
        <Box className="support-icon">
          <ArticleOutlinedIcon />
        </Box>
        <Typography className="support-title">What types of resume are supported?</Typography>
      </Box>

      <Box className="support-list">
        {SUPPORTED_RESUME_TYPES.map((item) => (
          <Box key={item} className="support-item">
            <CheckIcon className="check-icon" />
            <Typography className="support-text">{item}</Typography>
          </Box>
        ))}
      </Box>
    </SupportCard>
  );
}
