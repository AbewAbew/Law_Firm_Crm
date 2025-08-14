'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/axios';

export default function ClientRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const response = await api.get('/auth/profile');
        const userRole = response.data.role;
        
        // If client tries to access dashboard, redirect to cases
        if (userRole === 'CLIENT' && pathname === '/dashboard') {
          router.push('/cases');
        }
        
        // If non-partner tries to access analytics, redirect to cases
        if (userRole !== 'PARTNER' && pathname === '/analytics') {
          router.push('/cases');
        }
        
        // If client tries to access time-tracking, redirect to cases
        if (userRole === 'CLIENT' && pathname === '/time-tracking') {
          router.push('/cases');
        }
      } catch (error) {
        console.error('Failed to check user role');
      }
    };

    checkUserRole();
  }, [pathname, router]);

  return null;
}