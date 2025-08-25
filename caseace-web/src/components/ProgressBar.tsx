'use client';

import { AppProgressBar as ProgressBar } from 'next-nprogress-bar';

export default function NavigationProgress() {
  return (
    <ProgressBar
      height="3px"
      color="#1976d2"
      options={{ showSpinner: false }}
      shallowRouting
    />
  );
}