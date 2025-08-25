'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import { createIntersectionObserver } from '@/lib/performance';
import { Box, Skeleton } from '@mui/material';

interface LazyWrapperProps {
  children: ReactNode;
  height?: number;
  fallback?: ReactNode;
}

export default function LazyWrapper({ 
  children, 
  height = 200, 
  fallback 
}: LazyWrapperProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = createIntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer?.disconnect();
          }
        });
      }
    );

    if (ref.current && observer) {
      observer.observe(ref.current);
    }

    return () => observer?.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {isVisible ? (
        children
      ) : (
        fallback || (
          <Box sx={{ width: '100%', height }}>
            <Skeleton variant="rectangular" width="100%" height="100%" />
          </Box>
        )
      )}
    </div>
  );
}