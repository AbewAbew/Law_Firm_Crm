'use client';

import React, { useState } from 'react';
import { Tooltip, Chip, Box, Popover, Typography, Paper } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

interface CitationBubbleProps {
  citationNumber: number;
  content: string;
  documentName: string;
  score?: number;
}

export default function CitationBubble({ 
  citationNumber, 
  content, 
  documentName, 
  score 
}: CitationBubbleProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Chip
        label={citationNumber}
        size="small"
        onClick={handleClick}
        sx={{
          height: 20,
          fontSize: '0.7rem',
          backgroundColor: '#1976d2',
          color: 'white',
          cursor: 'pointer',
          mx: 0.5,
          '&:hover': {
            backgroundColor: '#1565c0'
          }
        }}
      />
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <Paper sx={{ p: 2, maxWidth: 300 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            Source: {documentName}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            "{content.substring(0, 150)}..."
          </Typography>
          {score && (
            <Typography variant="caption" color="text.secondary">
              Relevance: {(score * 100).toFixed(1)}%
            </Typography>
          )}
        </Paper>
      </Popover>
    </>
  );
}