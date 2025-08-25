import { useState, useEffect, useCallback } from 'react';
import { apiCache } from '@/lib/cache';
import api from '@/lib/axios';

export function useOptimizedFetch<T>(url: string, cacheKey?: string, ttlMinutes = 5) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (useCache = true) => {
    const key = cacheKey || url;
    
    if (useCache) {
      const cached = apiCache.get(key);
      if (cached) {
        setData(cached);
        setLoading(false);
        return cached;
      }
    }

    try {
      setLoading(true);
      const response = await api.get(url);
      const result = response.data;
      
      apiCache.set(key, result, ttlMinutes);
      setData(result);
      setError(null);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [url, cacheKey, ttlMinutes]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(false) };
}