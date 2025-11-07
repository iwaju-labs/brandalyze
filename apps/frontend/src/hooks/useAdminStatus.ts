"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export function useAdminStatus() {
  const { getToken, isLoaded } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    const checkAdminStatus = async () => {
      try {
        const token = await getToken();
        
        if (!token) {
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        const url = `${process.env.NEXT_PUBLIC_API_URL}/payments/admin/check-status/`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Handle nested response structure
          const isAdmin = data.data?.is_admin || data.is_admin || false;
          setIsAdmin(isAdmin);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('💥 Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [getToken, isLoaded]);

  return { isAdmin, isLoading };
}
