import { useState, useEffect } from 'react';

export async function clearLogoCache(url: string): Promise<void> {
    try {
        const cache = await caches.open('logo-cache');
        const cacheKey = new Request(`logo-${url}`);
        await cache.delete(cacheKey);
    } catch (error) {
        console.error('Error clearing logo cache:', error);
    }
}

export function useLogoCache(signedUrl: string | null) {
    const [cachedUrl, setCachedUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        let objectUrl: string | null = null;

        async function loadAndCacheLogo() {
            if (!signedUrl) {
                setIsLoading(false);
                return;
            }

            try {
                const cache = await caches.open('logo-cache');
                const cacheKey = new Request(`https://cache/${encodeURIComponent(signedUrl)}`);
                
                // Try to get from cache
                const cachedResponse = await cache.match(cacheKey);
                if (cachedResponse) {
                    const blob = await cachedResponse.blob();
                    objectUrl = URL.createObjectURL(blob);
                    if (mounted) {
                        setCachedUrl(objectUrl);
                        setIsLoading(false);
                    }
                    return;
                }

                // Fetch and cache if not found
                const response = await fetch(signedUrl, {
                    mode: 'cors',
                    credentials: 'omit',
                    headers: {
                        'Accept': 'image/*'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch logo: ${response.status}`);
                }

                const blob = await response.blob();
                
                // Create a new response with the blob
                const cacheResponse = new Response(blob, {
                    status: 200,
                    headers: {
                        'Content-Type': blob.type,
                        'Content-Length': String(blob.size)
                    }
                });

                // Cache the response
                try {
                    await cache.put(cacheKey, cacheResponse.clone());
                } catch (cacheError) {
                    console.warn('Failed to cache logo, but continuing:', cacheError);
                    // Continue even if caching fails
                }

                objectUrl = URL.createObjectURL(blob);
                if (mounted) {
                    setCachedUrl(objectUrl);
                }
            } catch (err) {
                console.error('Error loading logo:', err);
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Failed to load logo');
                    setCachedUrl(null);
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        }

        loadAndCacheLogo();

        return () => {
            mounted = false;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [signedUrl]);

    return { cachedUrl, isLoading, error };
}