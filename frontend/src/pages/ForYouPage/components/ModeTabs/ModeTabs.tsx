import type { KeyboardEvent, MutableRefObject } from 'react';

import { Box } from '@/lib/material';

import { getPanelId, getTabId, recommendationModes, type RecommendationMode } from '../../utils';

type ModeTabsProps = {
  activeMode: RecommendationMode;
  modeTabRefs: MutableRefObject<Array<HTMLButtonElement | null>>;
  onSelectMode: (mode: RecommendationMode) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
};

export function ModeTabs({ activeMode, modeTabRefs, onSelectMode, onKeyDown }: ModeTabsProps) {
  return (
    <Box
      aria-label="Recommendation modes"
      role="tablist"
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        gap: 1,
        maxWidth: '100%',
        overflowX: 'auto',
        pb: 1,
        scrollbarWidth: 'thin',
      }}
    >
      {recommendationModes.map((mode, index) => {
        const isActive = mode.id === activeMode;

        return (
          <Box
            aria-controls={getPanelId(mode.id)}
            aria-selected={isActive}
            component="button"
            id={getTabId(mode.id)}
            key={mode.id}
            onKeyDown={(event) => onKeyDown(event, index)}
            onClick={() => onSelectMode(mode.id)}
            ref={(element: HTMLButtonElement | null) => {
              modeTabRefs.current[index] = element;
            }}
            role="tab"
            sx={{
              alignItems: 'center',
              bgcolor: isActive ? 'primary.main' : 'background.paper',
              border: '1px solid',
              borderColor: isActive ? 'primary.main' : 'divider',
              borderRadius: 2,
              color: isActive ? 'primary.contrastText' : 'text.primary',
              cursor: 'pointer',
              display: 'inline-flex',
              flex: '0 0 auto',
              font: 'inherit',
              fontSize: '0.875rem',
              fontWeight: 700,
              gap: 1,
              minHeight: 40,
              px: 2,
              py: 1,
              whiteSpace: 'nowrap',
              '&:focus-visible': {
                outline: '3px solid',
                outlineColor: 'primary.light',
                outlineOffset: 2,
              },
              '&:hover': {
                borderColor: 'primary.main',
              },
            }}
            tabIndex={isActive ? 0 : -1}
            type="button"
          >
            <span>{mode.label}</span>
            {!mode.available ? (
              <Box
                component="span"
                sx={{
                  bgcolor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'action.hover',
                  borderRadius: 999,
                  color: isActive ? 'primary.contrastText' : 'text.secondary',
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  lineHeight: 1,
                  px: 1,
                  py: 0.5,
                }}
              >
                Soon
              </Box>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}
