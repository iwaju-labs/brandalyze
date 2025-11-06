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
      console.log('🔍 Checking admin status...');
      try {
        const token = await getToken();
        console.log('🎫 Got token:', token ? 'Token exists' : 'No token');
        
        if (!token) {
          console.log('❌ No token available');
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        const url = `${process.env.NEXT_PUBLIC_API_URL}/payments/admin/check-status/`;
        console.log('📡 Calling:', url);
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('📨 Response status:', response.status);
        console.log('📨 Response ok:', response.ok);        if (response.ok) {
          const data = await response.json();
          console.log('✅ Admin check result:', data);
          // Handle nested response structure
          const isAdmin = data.data?.is_admin || data.is_admin || false;
          console.log('✅ Final admin status:', isAdmin);
          setIsAdmin(isAdmin);
        } else {
          const errorText = await response.text();
          console.log('❌ Admin check failed:', errorText);
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
