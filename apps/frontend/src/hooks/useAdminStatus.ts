"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

interface AdminStatusResponse {
  is_admin: boolean;
}

export function useAdminStatus() {
  const { isLoaded, getToken } = useAuth();
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

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/admin/check-status/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data: AdminStatusResponse = await response.json();
          setIsAdmin(data.is_admin);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [isLoaded, getToken]);

  return { isAdmin, isLoading };
}
