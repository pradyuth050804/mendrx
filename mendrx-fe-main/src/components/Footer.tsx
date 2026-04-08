"use client";

import React, { useState } from "react";
import Link from "next/link";
import ContactModal from "./ContactModel";

const Footer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDialog = () => {
    setIsOpen(!isOpen);
  };

  return (
    <footer className="bg-gray-100 py-4">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        <p className="text-sm text-gray-600 mb-2 md:mb-0">
          © {new Date().getFullYear()} MendRx. All rights reserved.
        </p>
        <nav>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 justify-center md:justify-start">
            <li>
              <Link
                href="/privacy-policy"
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                href="/terms-and-conditions"
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Terms & Conditions
              </Link>
            </li>
            <li>
              <Link
                href="/refund-policy"
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Refund Policy
              </Link>
            </li>
            <li>
              <button
                onClick={toggleDialog}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Contact Us
              </button>
            </li>
          </ul>
        </nav>
      </div>
      <ContactModal isOpen={isOpen} toggleDialog={toggleDialog} />
    </footer>
  );
};

export default Footer;
