import { useEffect } from 'react';

/** Body is `overflow: hidden` globally for the app shell; unlock while landing is mounted. */
export function useLandingScrollLock() {
  useEffect(() => {
    const { body, documentElement } = document;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyOverflowX: body.style.overflowX,
      bodyOverflowY: body.style.overflowY,
      htmlOverflow: documentElement.style.overflow,
      htmlOverflowX: documentElement.style.overflowX,
      htmlOverflowY: documentElement.style.overflowY,
    };

    body.style.overflow = '';
    body.style.overflowX = 'hidden';
    body.style.overflowY = 'auto';
    documentElement.style.overflow = '';
    documentElement.style.overflowX = 'hidden';
    documentElement.style.overflowY = 'auto';

    return () => {
      body.style.overflow = previous.bodyOverflow;
      body.style.overflowX = previous.bodyOverflowX;
      body.style.overflowY = previous.bodyOverflowY;
      documentElement.style.overflow = previous.htmlOverflow;
      documentElement.style.overflowX = previous.htmlOverflowX;
      documentElement.style.overflowY = previous.htmlOverflowY;
    };
  }, []);
}
