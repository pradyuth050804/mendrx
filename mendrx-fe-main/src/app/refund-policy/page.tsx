"use client";

import React from "react";
import Header from "@/components/Header";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RefundPolicy() {
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
            Refund and Cancellation Policy
          </h1>
          <div className="bg-gray-50 p-4 rounded-md mb-8">
            <p className="text-gray-600">
              <strong>Effective Date:</strong> 01/01/2025
            </p>
          </div>

          <div className="prose max-w-none">
            <p>
              At MendRx, we strive to provide the best experience for our users.
              This Refund and Cancellation Policy outlines the terms under which
              you may cancel your subscription and request a refund.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              1. Subscription Cancellation
            </h2>
            <ul className="list-disc pl-6 mb-6">
              <li className="mb-2">
                You can cancel your MendRx subscription at any time through your
                account settings or by contacting{" "}
                <span className="text-green-700">support@wholisticmend.in</span>
              </li>
              <li className="mb-2">
                Cancellation will prevent auto-renewal for the next billing
                cycle but will not provide a refund for the current billing
                period.
              </li>
              <li className="mb-2">
                After cancellation, you will retain access to the service until
                the end of your current subscription period.
              </li>
            </ul>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              2. Refund Policy
            </h2>
            <p className="mb-4">
              Refunds are applicable under the following conditions:
            </p>
            <ul className="list-disc pl-6 mb-6">
              <li className="mb-2">
                If you cancel your subscription within 7 days of the initial
                purchase, you are eligible for a full refund (only applicable to
                first-time users).
              </li>
              <li className="mb-2">
                If MendRx fails to provide the promised service due to technical
                failures for an extended period (more than 7 consecutive days),
                you may request a partial refund for the affected duration.
              </li>
              <li className="mb-2">
                Refund requests must be submitted within 15 days of the issue
                occurring.
              </li>
            </ul>

            <div className="bg-red-50 border border-red-100 rounded-lg p-4 my-6">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                No refunds will be issued for:
              </h3>
              <ul className="list-disc pl-6 text-red-700">
                <li className="mb-2">
                  Quarterly or Annual Plans once the 7-day refund window has
                  passed.
                </li>
                <li className="mb-2">
                  Unused Reports—all purchased reports must be used within the
                  subscription period.
                </li>
                <li className="mb-2">
                  Service disruptions caused by user error, internet issues, or
                  third-party integrations.
                </li>
                <li className="mb-2">
                  Subscription cancellations initiated by the user after the
                  refund period.
                </li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              3. How to Request a Refund
            </h2>
            <p>
              To request a refund, please email{" "}
              <span className="text-green-700">support@wholisticmend.in</span>{" "}
              with the following details:
            </p>
            <ul className="list-disc pl-6 mb-6">
              <li className="mb-2">
                Your registered email address and account details.
              </li>
              <li className="mb-2">Reason for the refund request.</li>
              <li className="mb-2">Any supporting evidence (if applicable).</li>
            </ul>
            <p>
              Refunds will be processed within 7-14 business days upon approval.
            </p>

            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-800">
              4. Changes to This Policy
            </h2>
            <p>
              MendRx reserves the right to modify this Refund and Cancellation
              Policy at any time. Continued use of the service after changes
              means you accept the updated policy.
            </p>

            <div className="bg-green-50 border border-green-100 rounded-lg p-6 my-8">
              <h3 className="text-lg font-semibold text-green-800 mb-3">
                Need Assistance?
              </h3>
              <p className="text-green-700 mb-2">
                For any questions or concerns regarding our refund and
                cancellation policy, please feel free to reach out to our
                support team.
              </p>
              <p className="text-green-700 font-medium">
                Email: support@wholisticmend.in
              </p>
            </div>
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
