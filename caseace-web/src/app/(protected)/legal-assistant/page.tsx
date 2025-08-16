'use client';

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

export default function LegalAssistantPage() {
  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 100px)' }}>
      <Typography variant="h4" sx={{ 
        mb: 3, 
        color: '#000000',
        fontWeight: 600,
        fontSize: '2rem'
      }}>
        Legal Assistant
      </Typography>
      
      <Paper sx={{ 
        height: 'calc(100% - 80px)',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        overflow: 'hidden'
      }}>
        <iframe
          src="http://localhost/chat/share?shared_id=2dd0211c782811f0aae9c6fda062d81a&from=chat&auth=M2NDYyYzFhNzgyODExZjA4ZTVmYzZmZG"
          style={{ 
            width: '100%', 
            height: '100%', 
            border: 'none',
            borderRadius: '20px'
          }}
          title="Legal Assistant Chat"
        />
      </Paper>
    </Box>
  );
}