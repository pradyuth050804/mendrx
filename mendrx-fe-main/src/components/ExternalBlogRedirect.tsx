"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";

interface ExternalBlogRedirectProps {
  title: string;
  excerpt: string;
  externalUrl: string;
  category: string;
  author: string;
}

const ExternalBlogRedirect = ({
  title,
  excerpt,
  externalUrl,
  category,
  author,
}: ExternalBlogRedirectProps) => {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Set up countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Redirect after countdown reaches 0
          window.location.href = externalUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [externalUrl]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <Link
              href="/blogs"
              className="inline-flex items-center text-green-600 font-medium hover:text-green-700 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Blogs
            </Link>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-8 shadow-md">
            <div className="inline-block mb-4 bg-green-600 text-white text-sm font-medium px-3 py-1 rounded-full">
              {category}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
              {title}
            </h1>

            <p className="text-gray-600 mb-6">{excerpt}</p>

            <div className="mb-8">
              <p className="text-gray-500 text-sm">By {author}</p>
            </div>

            <div className="relative mb-6 h-1 bg-gray-200 rounded overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-green-600 transition-all duration-1000"
                style={{ width: `${(countdown / 5) * 100}%` }}
              ></div>
            </div>

            <p className="text-gray-700 mb-6">
              Redirecting you to the external article in{" "}
              <span className="font-bold">{countdown}</span> seconds...
            </p>

            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center justify-center"
              >
                Go to Article Now
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>

              <button
                onClick={() => router.push("/blogs")}
                className="border border-gray-300 bg-white text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Return to Blogs
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExternalBlogRedirect;
