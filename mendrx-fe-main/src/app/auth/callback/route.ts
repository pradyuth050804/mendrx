// File: src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { fetchWithAuth } from '@/utils/api'

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

interface UserData {
  email: string;
  type: string;
  credits: number;
  expiry: string;
}
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode?: string;
}

export async function GET(request: Request) {
  console.log('Authentication callback initiated');
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  if (code) {
    console.log('Authentication code received');
    const supabase = createRouteHandlerClient({ cookies })
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.session) {
      console.log('Session exchanged successfully');
      const token = data.session.access_token

      try {
        // Instead of making a separate call, combine user check and data fetch
        const apiUrl = getApiUrl();
        if (!apiUrl) {
          throw new Error("API URL is not defined");
        }

        console.log("user API call 5")
        const response = await fetch(`${apiUrl}/user`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (response.status === 404) {
          // User not found, proceed with registration
          console.log('User not found, proceeding with registration');
          const registerResponse = await fetch(`${apiUrl}/register`, {
            method: 'POST',
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              email: data.session.user.email
            })
          });

          const responseData = await registerResponse.json();
          if (responseData.success) {
            console.log('Registration successful', responseData);
            return NextResponse.redirect(`${origin}/dashboard?message=registration_successful&credits=${responseData.data.credits}`);
          }
          throw new Error('Registration failed');
        }

        // Existing user found
        const userData = await response.json();
        if (userData.success) {
          console.log('User data fetched successfully');
          return NextResponse.redirect(`${origin}/dashboard?message=welcome_back`);
        }
        throw new Error('Failed to fetch user data');
      } catch (error) {
        console.error("Error during authentication:", error);
        return NextResponse.redirect(`${origin}?authError=true`);
      }
    }
  }
  return NextResponse.redirect(`${origin}?authError=true`);
}