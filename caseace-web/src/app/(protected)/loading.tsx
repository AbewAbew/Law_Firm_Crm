'use client';

import React from 'react';
import { Box, LinearProgress } from '@mui/material';

export default function ProtectedLoading() {
  return (
    <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2000 }}>
      <LinearProgress color="primary" />
    </Box>
  );
}
