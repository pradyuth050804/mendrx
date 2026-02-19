// src/components/GoogleAnalytics.tsx

"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";
import * as gtag from "@/lib/gtag";

export default function GoogleAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENV === "production" && pathname) {
      gtag.pageview(pathname);
    }
  }, [pathname]);

  // Only render Scripts in production
  if (process.env.NEXT_PUBLIC_ENV !== "production") {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_MEASUREMENT_ID}`}
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gtag.GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}
