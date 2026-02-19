import { Metadata } from "next";

const newDescription =
  "Explore the MendRx blog for insights on AI-powered functional medicine. Discover articles for healthcare professionals on deep health analysis, interpreting blood markers, personalized nutrition/supplement plans, and strategies to elevate your practice.";

export const metadata: Metadata = {
  // Title remains specific and good for SEO
  title: "MendRx - Functional Medicine Software Blogs",
  // Updated main description
  description: newDescription,
  openGraph: {
    // Title remains the same
    title: "MendRx - Functional Medicine Software Blogs",
    // Updated OpenGraph description
    description: newDescription,
    url: "https://mendrx.in/blogs",
    siteName: "MendRx",
    images: [
      {
        url: "https://mendrx.in/mendrx_logo.jpg", // Ensure this image URL is correct and accessible
        width: 1200,
        height: 630,
        alt: "MendRx Functional Medicine Software Blogs - AI-Powered Health Insights", // Slightly more descriptive alt text
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    // Title remains the same
    title: "MendRx - Functional Medicine Software Blogs",
    description: newDescription,
    images: ["https://mendrx.in/mendrx_logo.jpg"], // Ensure this image URL is correct
  },
};

export default function BlogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
