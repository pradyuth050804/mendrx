"use client";

import React from "react";
import Header from "@/components/Header";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center text-gray-600 hover:text-green-600 transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-gray-900">
            Privacy Policy
          </h1>
          <div className="bg-gray-50 p-4 rounded-md mb-8">
            <p className="text-gray-600">
              <strong>Effective Date:</strong> October 18, 2024
            </p>
          </div>

          <div className="prose max-w-none">
            <p>
              This Privacy Policy outlines the types of personal information we
              collect when you use our website ("Website") and how we use,
              share, and protect that information. By using the Website, you
              agree to the terms of this Privacy Policy.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              1. Information We Collect
            </h2>

            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-700">
              Google Login Information:
            </h3>
            <p>
              When you sign in or sign up using your Google account, we may
              collect certain profile information, including but not limited to:
            </p>
            <ul className="list-disc pl-6 mb-6">
              <li className="mb-2">Your name</li>
              <li className="mb-2">Email address</li>
              <li className="mb-2">Google profile picture</li>
              <li className="mb-2">Unique Google ID</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-700">
              Automatically Collected Information:
            </h3>
            <p>
              When you access our Website, we may automatically collect
              information such as:
            </p>
            <ul className="list-disc pl-6 mb-6">
              <li className="mb-2">IP address</li>
              <li className="mb-2">Browser type and version</li>
              <li className="mb-2">
                Device information (e.g., operating system, device type)
              </li>
              <li className="mb-2">
                Usage data (e.g., pages visited, time spent on the Website)
              </li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              2. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 mb-6">
              <li className="mb-2">Provide and Improve Our Services</li>
              <li className="mb-2">Personalize Your Experience</li>
              <li className="mb-2">Communication</li>
              <li className="mb-2">Security</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              3. How We Share Your Information
            </h2>
            <p>
              We do not sell or rent your personal information to third parties.
              However, we may share your information in the following
              circumstances:
            </p>
            <ul className="list-disc pl-6 mb-6">
              <li className="mb-2">Service Providers</li>
              <li className="mb-2">Legal Obligations</li>
              <li className="mb-2">Business Transfers</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              4. How We Protect Your Information
            </h2>
            <p>
              We implement appropriate technical and organizational measures to
              protect your personal information from unauthorized access,
              disclosure, or loss. However, no method of transmission over the
              internet or method of electronic storage is 100% secure, so we
              cannot guarantee absolute security.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              5. Your Choices
            </h2>
            <ul className="list-disc pl-6 mb-6">
              <li className="mb-2">Google Account Settings</li>
              <li className="mb-2">Accessing and Updating Your Information</li>
              <li className="mb-2">Account Deletion</li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              6. Cookies and Tracking Technologies
            </h2>
            <p>
              We may use cookies or similar technologies to collect information
              about your use of the Website. Cookies help us improve your
              experience, personalize content, and track usage patterns. You can
              control the use of cookies through your browser settings.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              7. Google Analytics
            </h2>
            <p>
              We use Google Analytics to help us understand how our users
              interact with the Website. Google Analytics uses cookies to
              collect information about your use of the Website. This
              information is used to compile reports and help us improve the
              Website. The information collected is anonymized and does not
              personally identify you. You can opt-out of Google Analytics by
              using the Google Analytics Opt-out Browser Add-on.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              8. Third-Party Services
            </h2>
            <p>
              Our Website may contain links to third-party websites or services.
              This Privacy Policy does not apply to those third-party sites. We
              are not responsible for the privacy practices or content of those
              third-party services.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              9. Children's Privacy
            </h2>
            <p>
              Our Website is not intended for use by individuals under the age
              of 13, and we do not knowingly collect personal information from
              children under 13. If we become aware that we have collected
              personal information from a child under 13, we will take steps to
              delete that information.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              10. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. If we make
              any material changes, we will notify you through the Website or
              via email. Please review this Privacy Policy periodically for any
              updates.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              Contact Us
            </h2>
            <p>
              If you have any questions about this Privacy Policy, please
              contact us at{" "}
              <span className="text-green-700">+91 7892849030</span> or{" "}
              <span className="text-green-700">support@wholisticmend.in</span>.
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-gray-600 text-sm">
              Last updated: October 18, 2024
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
