// src/hooks/useSession.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Session } from '@supabase/supabase-js';
import { createAuthClient } from '@/lib/supabase-auth';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createAuthClient(); // Use the singleton client

  // Helper function to check if current path is a public page
  const isPublicPage = (path: string) => {
    return path.includes('/privacy-policy') || 
           path.includes('/terms-and-conditions') || 
           path.includes('/refund-policy') ||
           path.includes('/pricing') ||
           path.includes('/blogs');
  };
  
  useEffect(() => {
    let mounted = true;
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;

    const checkAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        if (!mounted) return;
        
        setSession(currentSession);
        
        if (!currentSession?.user && !isPublicPage(window.location.pathname)) {
          router.push('/');
        }
      } catch (error) {
        console.error('Auth error:', error);
        if (!isPublicPage(window.location.pathname)) {
          router.push('/');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    const setupAuthListener = () => {
      const { data } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (!mounted) return;
        
        setSession(newSession);
        
        if (!newSession?.user && !isPublicPage(window.location.pathname)) {
          router.push('/');
        }
      });
      
      authListener = data;
    };

    checkAuth();
    setupAuthListener();

    return () => {
      mounted = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [router]);

  return { session, isLoading };
}