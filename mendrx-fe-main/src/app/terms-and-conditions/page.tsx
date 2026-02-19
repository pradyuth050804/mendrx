"use client";

import React from "react";
import Header from "@/components/Header";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TermsAndConditions() {
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
            Terms and Conditions
          </h1>
          <div className="bg-gray-50 p-4 rounded-md mb-8">
            <p className="text-gray-600">
              <strong>Effective Date:</strong> 01/01/2025
            </p>
          </div>

          <div className="prose max-w-none">
            <p>
              Welcome to MendRx ("Company," "we," "us," or "our"). These Terms
              and Conditions ("Terms") govern your access to and use of our
              Software-as-a-Service (SaaS) platform and any related services,
              websites, and applications (collectively, the "Service").
            </p>
            <p>
              By accessing or using our Service, you agree to comply with and be
              bound by these Terms. If you do not agree with any part of these
              Terms, please do not use our Service.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              1. Account Registration
            </h2>
            <ul className="list-disc pl-6 mb-6">
              <li className="mb-2">
                You must be at least 18 years old to create an account.
              </li>
              <li className="mb-2">
                You are responsible for maintaining the confidentiality of your
                account credentials.
              </li>
              <li className="mb-2">
                Any activity under your account is your responsibility. Notify
                us immediately of unauthorized access.
              </li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              2. Subscription and Payments
            </h2>
            <ul className="list-disc pl-6 mb-6">
              <li className="mb-2">
                MendRx operates on a subscription-based model with quarterly and
                annual billing options.
              </li>
              <li className="mb-2">
                Payments are non-refundable, unless explicitly stated otherwise.
              </li>
              <li className="mb-2">
                We reserve the right to modify pricing, with prior notice to
                subscribers.
              </li>
              <li className="mb-2">
                Failure to make payments may result in account suspension or
                termination.
              </li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              3. Permitted Use and Restrictions
            </h2>
            <p>
              You are granted a limited, non-exclusive, non-transferable license
              to use the Service.
            </p>
            <p>You must not:</p>
            <ul className="list-disc pl-6 mb-6">
              <li className="mb-2">Resell, copy, or modify our Service.</li>
              <li className="mb-2">Use the Service for unlawful purposes.</li>
              <li className="mb-2">
                Attempt to hack, reverse engineer, or disrupt the platform.
              </li>
            </ul>
            <p>
              We reserve the right to suspend or terminate accounts violating
              these Terms.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              4. Data Privacy and Security
            </h2>
            <ul className="list-disc pl-6 mb-6">
              <li className="mb-2">
                We collect and process data per our{" "}
                <Link
                  href="/privacy-policy"
                  className="text-green-600 hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </li>
              <li className="mb-2">
                We implement industry-standard data security, encryption, and
                backup measures, but we cannot guarantee absolute security.
              </li>
              <li className="mb-2">
                You retain ownership of your data, but we may use aggregated and
                anonymized data to improve our Service.
              </li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              5. Service Availability and Support
            </h2>
            <ul className="list-disc pl-6 mb-6">
              <li className="mb-2">
                We strive for 99.9% uptime but do not guarantee uninterrupted
                access.
              </li>
              <li className="mb-2">
                Scheduled maintenance and unforeseen technical issues may cause
                temporary service disruptions.
              </li>
              <li className="mb-2">
                Support is available via email at support@wholisticmend.in, and
                response times may vary based on your subscription plan.
              </li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              6. Intellectual Property
            </h2>
            <ul className="list-disc pl-6 mb-6">
              <li className="mb-2">
                All software, content, and trademarks belong to MendRx.
              </li>
              <li className="mb-2">
                You may not use our brand assets without written permission.
              </li>
              <li className="mb-2">
                You retain ownership of the data you input but grant us a
                license to use it for providing the Service.
              </li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              7. Termination and Suspension
            </h2>
            <ul className="list-disc pl-6 mb-6">
              <li className="mb-2">
                You may cancel your subscription at any time, but no refunds
                will be provided for the remaining term.
              </li>
              <li className="mb-2">
                We may suspend or terminate your access for:
                <ul className="list-disc pl-6 mt-2">
                  <li>Non-payment</li>
                  <li>Violation of these Terms</li>
                  <li>Illegal or harmful activity</li>
                </ul>
              </li>
              <li className="mb-2">
                Upon termination, access to your data may be restricted or
                deleted.
              </li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              8. Limitation of Liability
            </h2>
            <ul className="list-disc pl-6 mb-6">
              <li className="mb-2">
                Our liability is limited to the amount paid for the Service in
                the last 6 months.
              </li>
              <li className="mb-2">
                We are not responsible for:
                <ul className="list-disc pl-6 mt-2">
                  <li>Loss of data due to user actions.</li>
                  <li>Third-party service interruptions.</li>
                  <li>Indirect or incidental damages.</li>
                </ul>
              </li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              9. Changes to Terms
            </h2>
            <ul className="list-disc pl-6 mb-6">
              <li className="mb-2">
                We reserve the right to update these Terms at any time.
              </li>
              <li className="mb-2">
                Continued use of the Service after changes means you accept the
                updated Terms.
              </li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              10. Governing Law and Dispute Resolution
            </h2>
            <ul className="list-disc pl-6 mb-6">
              <li className="mb-2">
                These Terms are governed by the laws of Karnataka, India.
              </li>
              <li className="mb-2">
                Any disputes shall be resolved through arbitration or the courts
                in Karnataka, India.
              </li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              11. Contact Information
            </h2>
            <p>
              For any questions regarding these Terms, please contact us at:
            </p>
            <p className="font-medium text-green-700">
              support@wholisticmend.in
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-gray-600 text-sm">
              Last updated: January 1, 2025
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
