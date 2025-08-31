'use client';

import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Chip, IconButton,
  Collapse, LinearProgress, Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';

interface RAGFlowQuotationProps {
  content: string;
  score: number;
  documentName: string;
  metadata?: {
    created_at?: string;
    chunk_index?: number;
    page?: number;
  };
  maxLength?: number;
}

const getRelevanceColor = (score: number) => {
  if (score >= 0.8) return '#4caf50'; // High relevance - green
  if (score >= 0.6) return '#ff9800'; // Medium relevance - orange  
  return '#f44336'; // Low relevance - red
};

const getRelevanceLabel = (score: number) => {
  if (score >= 0.8) return 'High';
  if (score >= 0.6) return 'Medium';
  return 'Low';
};

export default function RAGFlowQuotation({ 
  content, 
  score, 
  documentName, 
  metadata,
  maxLength = 200 
}: RAGFlowQuotationProps) {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = content.length > maxLength;
  const displayContent = expanded || !shouldTruncate 
    ? content 
    : content.substring(0, maxLength) + '...';

  return (
    <Card 
      sx={{ 
        mb: 2, 
        border: `2px solid ${getRelevanceColor(score)}`,
        borderRadius: 2,
        position: 'relative',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-1px)',
          transition: 'all 0.2s ease-in-out'
        }
      }}
    >
      {/* Relevance Score Indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <Tooltip title={`Relevance Score: ${(score * 100).toFixed(1)}%`}>
          <Chip
            label={`${getRelevanceLabel(score)} (${(score * 100).toFixed(1)}%)`}
            size="small"
            sx={{
              backgroundColor: getRelevanceColor(score),
              color: 'white',
              fontWeight: 'bold'
            }}
          />
        </Tooltip>
      </Box>

      <CardContent sx={{ pt: 5 }}>
        {/* Visual Quote Marks and Content */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <FormatQuoteIcon 
            sx={{ 
              color: getRelevanceColor(score), 
              fontSize: 24,
              mt: 0.5,
              transform: 'rotate(180deg)'
            }} 
          />
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="body1" 
              sx={{ 
                fontStyle: 'italic',
                lineHeight: 1.6,
                color: 'text.primary',
                fontSize: '1rem'
              }}
            >
              "{displayContent}"
            </Typography>
            
            {shouldTruncate && (
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                sx={{ mt: 1, color: getRelevanceColor(score) }}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                <Typography variant="caption" sx={{ ml: 0.5 }}>
                  {expanded ? 'Show less' : 'Show more'}
                </Typography>
              </IconButton>
            )}
          </Box>
          <FormatQuoteIcon 
            sx={{ 
              color: getRelevanceColor(score), 
              fontSize: 24,
              mt: 0.5
            }} 
          />
        </Box>

        {/* Source Attribution */}
        <Box 
          sx={{ 
            mt: 2, 
            pt: 2, 
            borderTop: `1px solid ${getRelevanceColor(score)}30`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1
          }}
        >
          <Box>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                fontWeight: 600,
                color: getRelevanceColor(score)
              }}
            >
              Source: {documentName}
            </Typography>
            {metadata && (
              <Typography variant="caption" color="text.secondary">
                {metadata.page && `Page ${metadata.page} • `}
                {metadata.chunk_index !== undefined && `Chunk ${metadata.chunk_index} • `}
                {metadata.created_at && new Date(metadata.created_at).toLocaleDateString()}
              </Typography>
            )}
          </Box>
          
          {/* Relevance Progress Bar */}
          <Box sx={{ minWidth: 100 }}>
            <LinearProgress
              variant="determinate"
              value={score * 100}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: `${getRelevanceColor(score)}20`,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: getRelevanceColor(score),
                  borderRadius: 3
                }
              }}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}