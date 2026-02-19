// File: src/hooks/useAuth.ts

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Session } from '@supabase/supabase-js';
import { useUserData } from '@/contexts/UserContext';
import { createAuthClient } from '@/lib/supabase-auth'

interface UserData {
  email: string;
  type: string;
  credits: number;
  expiry: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { userData, updateUserData } = useUserData();
  const router = useRouter();
  const supabase = createAuthClient();

  const getApiUrl = () => {
    switch (process.env.NEXT_PUBLIC_ENV) {
      case "production":
        return process.env.NEXT_PUBLIC_PROD_API_URL;
      case "development":
        return process.env.NEXT_PUBLIC_DEV_API_URL;
      default:
        return process.env.NEXT_PUBLIC_LOCAL_API_URL;
    }
  };

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
    let debounceTimeout: NodeJS.Timeout;

    const checkAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(currentSession);

        if (currentSession?.user) {
          setUser(currentSession.user);
          const apiUrl = getApiUrl();
          console.log("user API call 0")

          debounceTimeout = setTimeout(async () => {
            if (!mounted) return;

            const response = await fetch(`${apiUrl}/user`, {
              headers: {
                Authorization: `Bearer ${currentSession.access_token}`,
              },
            });

            if (!mounted) return;

            if (response.status === 404) {
              // New user — register them automatically
              console.log('User not found in DB, registering...');
              const registerResponse = await fetch(`${apiUrl}/register`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${currentSession.access_token}`,
                },
                body: JSON.stringify({ email: currentSession.user.email }),
              });
              const registerResult = await registerResponse.json();

              if (registerResult.success) {
                console.log('Registration successful', registerResult);
                updateUserData(registerResult.data);
                router.push('/dashboard');
              } else {
                // Registration failed — user may already exist (duplicate key race condition).
                // Try fetching the user one more time before giving up.
                console.warn('Registration failed, retrying GET /user...', registerResult);
                const retryResponse = await fetch(`${apiUrl}/user`, {
                  headers: { Authorization: `Bearer ${currentSession.access_token}` },
                });
                const retryResult = await retryResponse.json();
                if (retryResult.success) {
                  updateUserData(retryResult.data);
                  router.push('/dashboard');
                } else {
                  console.error('Could not register or fetch user. Signing out.');
                  await supabase.auth.signOut();
                  router.push('/');
                }
              }
              return;
            }

            const result = await response.json();
            if (!result.success) {
              throw new Error(result.message || "Failed to fetch user data");
            }

            updateUserData(result.data);

            // Check subscription status
            const expiryDate = new Date(result.data.expiry);
            const now = new Date();
            if (expiryDate < now || result.data.credits === 0) {
              // Handle subscription/credits status through context or state management
              // This will be picked up by components that need to show the dialog
            }
          }, 300);
        } else {
          if (!isPublicPage(window.location.pathname)) {
            router.push('/');
          }
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

      return () => {
        clearTimeout(debounceTimeout);
      };
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      setUser(session?.user ?? null);
      setSession(session);
      if (!session?.user && !isPublicPage(window.location.pathname)) {
        router.push('/');
      }
    });

    checkAuth();

    return () => {
      mounted = false;
      clearTimeout(debounceTimeout);
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, session, isLoading };
}