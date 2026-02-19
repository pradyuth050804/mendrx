// src/components/PricingOptions.tsx
"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

interface PricingOptionsProps {
  onSelectPlan?: (plan: string, period: string) => void;
  compact?: boolean; // For dialog view vs full page view
  scrollToTop?: boolean; // Whether buttons should scroll to top (for landing page) or handle plan selection
}

const PricingOptions: React.FC<PricingOptionsProps> = ({
  onSelectPlan,
  compact = false,
  scrollToTop = false,
}) => {
  const handlePlanClick = (plan: string, period: string) => {
    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (onSelectPlan) {
      onSelectPlan(plan, period);
    }
  };

  // Helper function to render checkmark SVG
  const CheckmarkSvg = () => (
    <svg
      className="w-5 h-5 text-green-500 mr-2 mt-0.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M5 13l4 4L19 7"
      ></path>
    </svg>
  );

  return (
    <div className={compact ? "py-2" : "py-16"} id="pricing">
      {!compact && (
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 text-gray-800">
            Affordable Plans for Every Healthcare Professional
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the plan that fits your practice needs and budget
          </p>
          <p className="text-md text-green-600 font-medium mt-4">
            1 Blood Marker RCA = 100 Credits
          </p>
        </div>
      )}

      <Tabs defaultValue="quarterly" className="max-w-5xl mx-auto">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="quarterly">Quarterly (3 months)</TabsTrigger>
          <TabsTrigger value="yearly">Yearly (Save More)</TabsTrigger>
        </TabsList>

        <TabsContent value="quarterly" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pay As You Go */}
            <Card className="border-2 border-gray-200 hover:border-green-500 transition-all duration-300">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold mb-2 text-center">
                  Pay As You Go
                </h3>
                <div className="text-center mb-4">
                  <span className="text-3xl font-bold">₹300</span>
                  <span className="text-gray-500 ml-2">/ 100 credits</span>
                </div>
                <div className="bg-gray-100 p-4 rounded mb-4">
                  <p className="text-center text-sm">
                    Flexible option for occasional use
                  </p>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>Purchase in multiples of 100 credits</span>
                  </li>
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>Credits expire in 1 week</span>
                  </li>
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>Basic blood marker analysis</span>
                  </li>
                </ul>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => handlePlanClick("pay-as-you-go", "quarterly")}
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>

            {/* Starter */}
            <Card className="border-2 border-green-500 shadow-lg relative">
              <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 text-sm font-bold rounded-bl-lg">
                POPULAR
              </div>
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold mb-2 text-center">Starter</h3>
                <div className="text-center mb-4">
                  <span className="text-3xl font-bold">₹3,000</span>
                  <span className="text-gray-500 ml-2">/ quarter</span>
                </div>
                <div className="bg-green-100 p-4 rounded mb-4">
                  <p className="text-center text-sm">
                    6000 credits for 30 Blood Marker RCAs & 30 Supplements &
                    Diet Plans
                  </p>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>6000 credits per quarter</span>
                  </li>
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>Advanced blood marker analysis</span>
                  </li>
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>Detailed supplement recommendations</span>
                  </li>
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>Personalized diet planning</span>
                  </li>
                </ul>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => handlePlanClick("starter", "quarterly")}
                >
                  Subscribe
                </Button>
              </CardContent>
            </Card>

            {/* Elite */}
            <Card className="border-2 border-gray-200 hover:border-green-500 transition-all duration-300">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold mb-2 text-center">Elite</h3>
                <div className="text-center mb-4">
                  <span className="text-3xl font-bold">₹12,000</span>
                  <span className="text-gray-500 ml-2">/ quarter</span>
                </div>
                <div className="bg-gray-100 p-4 rounded mb-4">
                  <p className="text-center text-sm">
                    All features of Starter plan plus premium features
                  </p>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>All features of Starter plan</span>
                  </li>
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>White labeling feature</span>
                  </li>
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>Get leads through B2C platform</span>
                  </li>
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>Advanced client management</span>
                  </li>
                </ul>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => handlePlanClick("elite", "quarterly")}
                >
                  Subscribe
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="yearly" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pay As You Go */}
            <Card className="border-2 border-gray-200 hover:border-green-500 transition-all duration-300">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold mb-2 text-center">
                  Pay As You Go
                </h3>
                <div className="text-center mb-4">
                  <span className="text-3xl font-bold">₹300</span>
                  <span className="text-gray-500 ml-2">/ 100 credits</span>
                </div>
                <div className="bg-gray-100 p-4 rounded mb-4">
                  <p className="text-center text-sm">
                    Flexible option for occasional use
                  </p>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>Purchase in multiples of 100 credits</span>
                  </li>
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>Credits expire in 1 week</span>
                  </li>
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>Basic blood marker analysis</span>
                  </li>
                </ul>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => handlePlanClick("pay-as-you-go", "yearly")}
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>

            {/* Starter */}
            <Card className="border-2 border-green-500 shadow-lg relative">
              <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 text-sm font-bold rounded-bl-lg">
                BEST VALUE
              </div>
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold mb-2 text-center">Starter</h3>
                <div className="text-center mb-4">
                  <span className="text-3xl font-bold">₹10,000</span>
                  <span className="text-gray-500 ml-2">/ year</span>
                </div>
                <div className="bg-green-100 p-4 rounded mb-4">
                  <p className="text-center text-sm">
                    Save ₹2,000 with annual billing
                  </p>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>24,000 credits per year</span>
                  </li>
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>Advanced blood marker analysis</span>
                  </li>
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>Detailed supplement recommendations</span>
                  </li>
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>Personalized diet planning</span>
                  </li>
                </ul>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg text-lg mt-4 w-full"
                  onClick={() => handlePlanClick("starter", "yearly")}
                >
                  Subscribe
                </Button>
              </CardContent>
            </Card>

            {/* Elite */}
            <Card className="border-2 border-gray-200 hover:border-green-500 transition-all duration-300">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold mb-2 text-center">Elite</h3>
                <div className="text-center mb-4">
                  <span className="text-3xl font-bold">₹36,000</span>
                  <span className="text-gray-500 ml-2">/ year</span>
                </div>
                <div className="bg-gray-100 p-4 rounded mb-4">
                  <p className="text-center text-sm">
                    Save ₹12,000 with annual billing
                  </p>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>All features of Starter plan</span>
                  </li>
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>White labeling feature</span>
                  </li>
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>Get leads through B2C platform</span>
                  </li>
                  <li className="flex items-start">
                    <CheckmarkSvg />
                    <span>Advanced client management</span>
                  </li>
                </ul>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => handlePlanClick("elite", "yearly")}
                >
                  Subscribe
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PricingOptions;
