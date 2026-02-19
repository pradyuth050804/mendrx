// src/utils/api.ts

export const getApiUrl = () => {
    switch (process.env.NEXT_PUBLIC_ENV) {
      case "production":
        return process.env.NEXT_PUBLIC_PROD_API_URL;
      case "development":
        return process.env.NEXT_PUBLIC_DEV_API_URL;
      default:
        return process.env.NEXT_PUBLIC_LOCAL_API_URL;
    }
  };
  
  export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const apiUrl = getApiUrl();
    if (!apiUrl) {
      throw new Error("API URL is not defined");
    }
  
    const url = `${apiUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
      },
    });
  
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  
    return response.json();
  };