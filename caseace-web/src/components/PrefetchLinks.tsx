'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

interface PrefetchLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  prefetch?: boolean;
}

export default function PrefetchLink({ 
  href, 
  children, 
  className, 
  prefetch = true 
}: PrefetchLinkProps) {
  const router = useRouter();

  const handleMouseEnter = () => {
    if (prefetch) {
      router.prefetch(href);
    }
  };

  return (
    <Link 
      href={href} 
      className={className}
      onMouseEnter={handleMouseEnter}
    >
      {children}
    </Link>
  );
}