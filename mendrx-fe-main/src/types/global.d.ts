// src/types/global.d.ts

interface Window {
  gtag: (
    command: 'config' | 'event',
    targetId: string,
    params?: { [key: string]: any }
  ) => void;
}

declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_GA_ID: string;
    NEXT_PUBLIC_ENV: 'production' | 'development' | 'local';
  }
}