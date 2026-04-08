// File: src/components/Header.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link"; // Import Link for navigation
import { useRouter } from "next/navigation";
import { createAuthClient } from "@/lib/supabase-auth";
import { Button } from "@/components/ui/button";
import {
  FileText,
  LogOut,
  Settings,
  Phone,
  Info,
  BookOpen,
  CreditCard,
} from "lucide-react"; // Added icons
import { useUserData } from "@/contexts/UserContext";
import ContactModal from "./ContactModel";
import { useAuth } from "@/hooks/useAuth"; // Import useAuth

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { userData } = useUserData();
  const { session } = useAuth(); // Get session from useAuth
  const router = useRouter();
  const supabase = createAuthClient();
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleLogoClick = () => {
    router.push("/dashboard");
  };

  const [isOpen, setIsOpen] = useState(false);
  const toggleDialog = () => {
    setIsOpen(!isOpen);
  };

  // Function to highlight AuthBox
  const handleSignInClick = () => {
    if (window.location.pathname !== "/") {
      // If not on the home page, navigate to home page first
      router.push("/");
    } else {
      // If we're already on the home page, just scroll to the auth box
      window.scrollTo({ top: 0, behavior: "smooth" });

      // Find the auth box and add the blinking effect
      const authBox = document.querySelector(".auth-box");
      if (authBox) {
        // Add attention class
        authBox.classList.add("auth-box-attention");

        // Remove the class after animation completes
        setTimeout(() => {
          authBox.classList.remove("auth-box-attention");
        }, 2000); // 2 seconds, matching the animation duration
      }
    }

    setIsMenuOpen(false);
  };

  // Add this helper function to your Header.tsx component
  const scrollToElementWithOffset = (
    elementId: string,
    offset: number = 25
  ) => {
    const element = document.getElementById(elementId);
    if (element) {
      // Get the element's position
      const elementPosition = element.getBoundingClientRect().top;
      // Get the current scroll position
      const offsetPosition = elementPosition + window.pageYOffset;

      // Scroll to element minus the offset
      window.scrollTo({
        top: offsetPosition - offset,
        behavior: "smooth",
      });
    }
  };

  // Then update your handlers to use this function
  const handlePricingClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (window.location.pathname !== "/") {
      sessionStorage.setItem("scrollTarget", "pricing");
      router.push("/");
    } else {
      scrollToElementWithOffset("pricing");
    }

    setIsMenuOpen(false);
  };

  const handleBlogsClick = () => {
    router.push("/blogs");
  };

  const handleFaqClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (window.location.pathname !== "/") {
      sessionStorage.setItem("scrollTarget", "faq");
      router.push("/");
    } else {
      scrollToElementWithOffset("faq");
    }

    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <div
            className="flex items-center cursor-pointer"
            onClick={handleLogoClick}
          >
            <Image
              src={
                userData &&
                userData.parentDTO?.useParentWhiteLabels &&
                userData.parentDTO.websiteWhiteLabelLogoFileUrl
                  ? userData.parentDTO.websiteWhiteLabelLogoFileUrl
                  : "/mendrx_logo.jpg"
              }
              alt="MendRx Icon"
              width={80}
              height={80}
              className="mr-2 w-12 h-12 sm:w-[80px] sm:h-[80px]"
              unoptimized
            />
          </div>

          {/* Conditional rendering based on authentication */}
          {session ? (
            // Authenticated user view
            <>
              {/* Desktop view */}
              <div className="hidden md:flex items-center space-x-6">
                <Button
                  variant="outline"
                  className="flex items-center"
                  onClick={() => router.push("/reports")}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Reports
                </Button>
                <div className="mr-4 text-right hidden lg:block">
                  <p className="text-sm font-semibold text-gray-700">
                    Available Credits: {userData?.credits || 0}
                  </p>
                  <p className="text-xs text-gray-500">
                    Active Till:{" "}
                    {userData?.expiry
                      ? new Date(userData.expiry).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="text-gray-600 hover:text-gray-800 focus:outline-none"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16m-7 6h7"
                      />
                    </svg>
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                      <button
                        onClick={() => router.push("/reports")}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <div className="flex items-center">
                          <FileText className="mr-2 h-4 w-4" />
                          Reports
                        </div>
                      </button>
                      <button
                        onClick={() => router.push("/settings")}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <div className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </div>
                      </button>
                      <button
                        onClick={toggleDialog}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <div className="flex items-center">
                          <Phone className="mr-2 h-4 w-4" />
                          Contact Us
                        </div>
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <div className="flex items-center">
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign out
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile view */}
              <div className="flex md:hidden items-center">
                <div className="mr-3 text-right">
                  <p className="text-xs font-semibold text-gray-700">
                    Credits: {userData?.credits || 0}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Till:{" "}
                    {userData?.expiry
                      ? new Date(userData.expiry).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="text-gray-600 hover:text-gray-800 focus:outline-none"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16m-7 6h7"
                      />
                    </svg>
                  </button>
                  {isMenuOpen && (
                    <div className="fixed inset-x-0 top-[56px] mx-2 bg-white rounded-b-lg shadow-lg py-1 z-50 sm:absolute sm:inset-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-48 sm:mx-0 sm:rounded-md">
                      <button
                        onClick={() => router.push("/reports")}
                        className="block w-full text-left px-4 py-3 sm:py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <div className="flex items-center">
                          <FileText className="mr-2 h-4 w-4" />
                          Reports
                        </div>
                      </button>
                      <button
                        onClick={() => router.push("/settings")}
                        className="block w-full text-left px-4 py-3 sm:py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <div className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </div>
                      </button>
                      <button
                        onClick={toggleDialog}
                        className="block w-full text-left px-4 py-3 sm:py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <div className="flex items-center">
                          <Phone className="mr-2 h-4 w-4" />
                          Contact Us
                        </div>
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-3 sm:py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <div className="flex items-center">
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign out
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            // Non-authenticated user view
            <>
              {/* Desktop view */}
              <div className="hidden md:flex items-center space-x-6">
                <a
                  href="#pricing"
                  className="text-gray-700 hover:text-green-600 font-medium flex items-center"
                  onClick={handlePricingClick}
                >
                  <CreditCard className="mr-1 h-4 w-4" />
                  Pricing
                </a>
                <a
                  href="#blogs"
                  className="text-gray-700 hover:text-green-600 font-medium flex items-center"
                  onClick={handleBlogsClick}
                >
                  <BookOpen className="mr-1 h-4 w-4" />
                  Blogs
                </a>
                <a
                  href="#faq"
                  className="text-gray-700 hover:text-green-600 font-medium flex items-center"
                  onClick={handleFaqClick}
                >
                  <Info className="mr-1 h-4 w-4" />
                  FAQ
                </a>
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleSignInClick}
                >
                  Sign In
                </Button>
              </div>

              {/* Mobile view */}
              <div className="flex md:hidden items-center">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="text-gray-600 hover:text-gray-800 focus:outline-none"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16m-7 6h7"
                    />
                  </svg>
                </button>
                {isMenuOpen && (
                  <div className="fixed inset-x-0 top-[56px] mx-2 bg-white rounded-b-lg shadow-lg py-1 z-50 sm:absolute sm:inset-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-48 sm:mx-0 sm:rounded-md">
                    <a
                      href="#pricing"
                      className="block w-full text-left px-4 py-3 sm:py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={(e) => {
                        handlePricingClick(e);
                        setIsMenuOpen(false);
                      }}
                    >
                      <div className="flex items-center">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pricing
                      </div>
                    </a>
                    <a
                      href="#blogs"
                      className="block w-full text-left px-4 py-3 sm:py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={(e) => {
                        handleBlogsClick();
                        setIsMenuOpen(false);
                      }}
                    >
                      <div className="flex items-center">
                        <BookOpen className="mr-2 h-4 w-4" />
                        Blogs
                      </div>
                    </a>
                    <a
                      href="#faq"
                      className="block w-full text-left px-4 py-3 sm:py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={(e) => {
                        handleFaqClick(e);
                        setIsMenuOpen(false);
                      }}
                    >
                      <div className="flex items-center">
                        <Info className="mr-2 h-4 w-4" />
                        FAQ
                      </div>
                    </a>
                    <button
                      onClick={handleSignInClick}
                      className="block w-full text-left px-4 py-3 sm:py-2 text-sm bg-green-600 text-white hover:bg-green-700 rounded-b-lg sm:rounded-none"
                    >
                      <div className="flex items-center">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign In
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <ContactModal isOpen={isOpen} toggleDialog={toggleDialog} />
      </header>
    </>
  );
};

export default Header;
