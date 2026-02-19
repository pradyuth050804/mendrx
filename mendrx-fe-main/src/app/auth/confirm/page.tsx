'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAuthClient } from '@/lib/supabase-auth';

const getApiUrl = () => {
    switch (process.env.NEXT_PUBLIC_ENV) {
        case 'production':
            return process.env.NEXT_PUBLIC_PROD_API_URL;
        case 'development':
            return process.env.NEXT_PUBLIC_DEV_API_URL;
        default:
            return process.env.NEXT_PUBLIC_LOCAL_API_URL;
    }
};

export default function AuthConfirmPage() {
    const router = useRouter();
    const [status, setStatus] = useState('Completing sign in...');

    useEffect(() => {
        const supabase = createAuthClient();

        const handleMagicLink = async () => {
            try {
                // Supabase JS client automatically reads #access_token from URL hash
                // and sets the session. We just need to call getSession().
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error || !session) {
                    console.error('No session after magic link click:', error);
                    router.push('/?authError=true');
                    return;
                }

                const token = session.access_token;
                const apiUrl = getApiUrl();
                if (!apiUrl) throw new Error('API URL not defined');

                setStatus('Checking your account...');

                const response = await fetch(`${apiUrl}/user`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (response.status === 404) {
                    setStatus('Creating your account...');
                    const registerResponse = await fetch(`${apiUrl}/register`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ email: session.user.email }),
                    });

                    const registerData = await registerResponse.json();
                    if (registerData.success) {
                        router.push(`/dashboard?message=registration_successful&credits=${registerData.data.credits}`);
                    } else {
                        throw new Error('Registration failed: ' + registerData.message);
                    }
                    return;
                }

                const userData = await response.json();
                if (userData.success) {
                    router.push('/dashboard?message=welcome_back');
                } else {
                    throw new Error('Failed to fetch user data');
                }
            } catch (err) {
                console.error('Auth confirm error:', err);
                router.push('/?authError=true');
            }
        };

        handleMagicLink();
    }, [router]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            fontFamily: 'sans-serif',
            color: '#444',
            gap: '1rem',
        }}>
            <div style={{ fontSize: '2rem' }}>⏳</div>
            <p style={{ fontSize: '1.1rem' }}>{status}</p>
        </div>
    );
}
