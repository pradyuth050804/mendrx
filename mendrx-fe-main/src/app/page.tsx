"use client";

import { useEffect } from "react";
import Header from "@/components/Header";
import AuthBox from "@/components/AuthBox";
import {
  Brain,
  BarChartIcon as ChartBar,
  FlaskRoundIcon as Flask,
  Users,
  Clock,
  Target,
  Award,
  Zap,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Image from "next/image";

export default function Home() {
  useEffect(() => {
    // Check if there's a stored scroll target
    const scrollTarget = sessionStorage.getItem("scrollTarget");
    if (scrollTarget) {
      // Clear the stored target to prevent scrolling on future page loads
      sessionStorage.removeItem("scrollTarget");

      // Small timeout to ensure the page is fully rendered
      setTimeout(() => {
        const targetElement = document.getElementById(scrollTarget);
        if (targetElement) {
          // Get the element's position
          const elementPosition = targetElement.getBoundingClientRect().top;
          // Get the current scroll position
          const offsetPosition = elementPosition + window.pageYOffset;

          // Scroll to element minus 100px offset (adjust this value as needed)
          window.scrollTo({
            top: offsetPosition - 25, // Adjust this offset value as needed
            behavior: "smooth",
          });
        }
      }, 100);
    }
  }, []);
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <main className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between py-16">
          <div className="md:w-1/2 mb-8 md:mb-0 animate-[slideIn_0.5s_ease-out]">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
              Elevate Your Practice with AI-Powered Precision
            </h1>
            <p className="text-xl text-gray-600">
              Revolutionizing Healthcare with AI-Driven Insights. Medical
              science is evolving, and so should your practice. MendRx empowers
              healthcare professionals with cutting-edge AI-powered analysis to
              transform raw medical data into actionable insights.
            </p>
            {/* <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="text-lg">
                Request Demo
              </Button>
              <Button size="lg" variant="outline" className="text-lg">
                Learn More
              </Button>
            </div> */}
          </div>
          <div className="md:w-1/2 auth-box flex justify-center">
            <AuthBox />
          </div>
        </div>

        {/* Demo Video Section */}
        <div className="py-16 bg-gray-50 rounded-lg">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4 text-gray-800">
              See MendRx in Action
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Watch our guided tour to see how MendRx can transform your
              healthcare practice
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="relative pt-[56.25%] w-full overflow-hidden rounded-lg shadow-xl">
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src="https://www.youtube.com/embed/kp2wz4gjP5o"
                title="MendRx Guided Tour"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>

          <div className="text-center mt-8">
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg text-lg"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Try It Yourself
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-800">
              Why Healthcare Professionals Choose MendRx
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our AI-powered platform helps you deliver exceptional care while
              growing your practice
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-2 border-green-100 shadow-lg">
              <CardContent className="pt-6">
                <div className="mb-4 bg-green-100 p-3 rounded-full w-14 h-14 flex items-center justify-center">
                  <Zap size={28} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Time-Saving Analysis</h3>
                <p className="text-gray-600">
                  Reduce hours of manual work to minutes with our AI-powered
                  root cause analysis of blood markers.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-100 shadow-lg">
              <CardContent className="pt-6">
                <div className="mb-4 bg-green-100 p-3 rounded-full w-14 h-14 flex items-center justify-center">
                  <Target size={28} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  Personalized Recommendations
                </h3>
                <p className="text-gray-600">
                  Generate customized supplement and diet plans based on
                  scientific analysis of individual health markers.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-100 shadow-lg">
              <CardContent className="pt-6">
                <div className="mb-4 bg-green-100 p-3 rounded-full w-14 h-14 flex items-center justify-center">
                  <Award size={28} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  Boost Your Credibility
                </h3>
                <p className="text-gray-600">
                  Elevate your practice beyond general dietitians with
                  data-driven insights and professional-grade reports.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-100 shadow-lg">
              <CardContent className="pt-6">
                <div className="mb-4 bg-green-100 p-3 rounded-full w-14 h-14 flex items-center justify-center">
                  <Users size={28} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Scale Your Practice</h3>
                <p className="text-gray-600">
                  Handle more clients efficiently with streamlined workflows and
                  advanced client management.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-100 shadow-lg">
              <CardContent className="pt-6">
                <div className="mb-4 bg-green-100 p-3 rounded-full w-14 h-14 flex items-center justify-center">
                  <Clock size={28} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Quick Implementation</h3>
                <p className="text-gray-600">
                  Get started in minutes with our user-friendly interface – no
                  technical expertise required.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-100 shadow-lg">
              <CardContent className="pt-6">
                <div className="mb-4 bg-green-100 p-3 rounded-full w-14 h-14 flex items-center justify-center">
                  <FileCheck size={28} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">White Labeling</h3>
                <p className="text-gray-600">
                  Customize reports with your branding for a seamless client
                  experience (Premium plan).
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Testimonials Section */}
        {/* <div className="py-16 bg-gray-50 rounded-lg">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-800">
              What Users Are Saying
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Hear from professionals who transformed their practice with MendRx
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mx-auto max-w-6xl">
            <Card className="border border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-200 rounded-full overflow-hidden mr-4">
                    <Image
                      src="/api/placeholder/100/100"
                      alt="Priya Sharma"
                      width={48}
                      height={48}
                    />
                  </div>
                  <div>
                    <h4 className="font-bold">Priya Sharma</h4>
                    <p className="text-sm text-gray-500">
                      Nutritionist, Mumbai
                    </p>
                  </div>
                </div>
                <p className="italic text-gray-600">
                  "MendRx has transformed my practice. The AI analysis gives me
                  confidence in my recommendations and saves hours of research
                  time. My clients are impressed with the detailed insights!"
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-200 rounded-full overflow-hidden mr-4">
                    <Image
                      src="/api/placeholder/100/100"
                      alt="Dr. Rohan Mehta"
                      width={48}
                      height={48}
                    />
                  </div>
                  <div>
                    <h4 className="font-bold">Dr. Rohan Mehta</h4>
                    <p className="text-sm text-gray-500">
                      Functional Nutritionist, Delhi
                    </p>
                  </div>
                </div>
                <p className="italic text-gray-600">
                  "As my practice grew, I needed efficient systems. MendRx's
                  analysis and white-labeled reports have helped me scale while
                  maintaining quality care. Worth every rupee!"
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-200 rounded-full overflow-hidden mr-4">
                    <Image
                      src="/api/placeholder/100/100"
                      alt="Anjali Desai"
                      width={48}
                      height={48}
                    />
                  </div>
                  <div>
                    <h4 className="font-bold">Anjali Desai</h4>
                    <p className="text-sm text-gray-500">
                      Dietitian, Bangalore
                    </p>
                  </div>
                </div>
                <p className="italic text-gray-600">
                  "I started using MendRx in my first year of practice. It gave
                  me the confidence to deliver detailed analysis that my more
                  experienced competitors couldn't match!"
                </p>
              </CardContent>
            </Card>
          </div>
        </div> */}

        {/* Pricing Section */}
        <div id="pricing" className="py-16">
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

          <Tabs defaultValue="quarterly" className="max-w-5xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 mb-8">
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
                        <span>Purchase in multiples of 100 credits</span>
                      </li>
                      <li className="flex items-start">
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
                        <span>Credits expire in 1 week</span>
                      </li>
                      <li className="flex items-start">
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
                        <span>Basic blood marker analysis</span>
                      </li>
                    </ul>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() =>
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }
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
                    <h3 className="text-xl font-bold mb-2 text-center">
                      Starter
                    </h3>
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
                        <span>6000 credits per quarter</span>
                      </li>
                      <li className="flex items-start">
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
                        <span>Advanced blood marker analysis</span>
                      </li>
                      <li className="flex items-start">
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
                        <span>Detailed supplement recommendations</span>
                      </li>
                      <li className="flex items-start">
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
                        <span>Personalized diet planning</span>
                      </li>
                    </ul>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() =>
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }
                    >
                      Sign Up Now
                    </Button>
                  </CardContent>
                </Card>

                {/* Elite */}
                <Card className="border-2 border-gray-200 hover:border-green-500 transition-all duration-300">
                  <CardContent className="pt-6">
                    <h3 className="text-xl font-bold mb-2 text-center">
                      Elite
                    </h3>
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
                        <span>All features of Starter plan</span>
                      </li>
                      <li className="flex items-start">
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
                        <span>White labeling feature</span>
                      </li>
                      <li className="flex items-start">
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
                        <span>Get leads through B2C platform</span>
                      </li>
                      <li className="flex items-start">
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
                        <span>Advanced client management</span>
                      </li>
                    </ul>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() =>
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }
                    >
                      Sign Up Now
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
                        <span>Purchase in multiples of 100 credits</span>
                      </li>
                      <li className="flex items-start">
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
                        <span>Credits expire in 1 week</span>
                      </li>
                      <li className="flex items-start">
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
                        <span>Basic blood marker analysis</span>
                      </li>
                    </ul>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() =>
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }
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
                    <h3 className="text-xl font-bold mb-2 text-center">
                      Starter
                    </h3>
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
                        <span>24,000 credits per year</span>
                      </li>
                      <li className="flex items-start">
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
                        <span>Advanced blood marker analysis</span>
                      </li>
                      <li className="flex items-start">
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
                        <span>Detailed supplement recommendations</span>
                      </li>
                      <li className="flex items-start">
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
                        <span>Personalized diet planning</span>
                      </li>
                    </ul>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg text-lg mt-4"
                      onClick={() =>
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }
                    >
                      Sign Up Now
                    </Button>
                  </CardContent>
                </Card>

                {/* Elite */}
                <Card className="border-2 border-gray-200 hover:border-green-500 transition-all duration-300">
                  <CardContent className="pt-6">
                    <h3 className="text-xl font-bold mb-2 text-center">
                      Elite
                    </h3>
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
                        <span>All features of Starter plan</span>
                      </li>
                      <li className="flex items-start">
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
                        <span>White labeling feature</span>
                      </li>
                      <li className="flex items-start">
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
                        <span>Get leads through B2C platform</span>
                      </li>
                      <li className="flex items-start">
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
                        <span>Advanced client management</span>
                      </li>
                    </ul>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() =>
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }
                    >
                      Sign Up Now
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* FAQ Section */}
        <div id="faq" className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-800">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get answers to common questions about MendRx
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  How does the AI root cause analysis work?
                </AccordionTrigger>
                <AccordionContent>
                  Our AI analyzes blood markers against optimal ranges and
                  scientific literature to identify potential root causes for
                  health issues. It considers multiple factors and relationships
                  between markers to provide a comprehensive analysis that would
                  typically take hours to perform manually.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger>
                  How many credits do I need per client?
                </AccordionTrigger>
                <AccordionContent>
                  A standard blood marker Root Cause Analysis requires 100
                  credits. Supplement and diet recommendations typically require
                  an additional 100 credits each. For a complete client analysis
                  with all features, you would need approximately 300 credits.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger>
                  Can I upgrade my plan later?
                </AccordionTrigger>
                <AccordionContent>
                  Yes, you can upgrade your plan at any time. When you upgrade,
                  we'll prorate your current subscription and apply any
                  remaining balance to your new plan.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger>What is white labeling?</AccordionTrigger>
                <AccordionContent>
                  White labeling allows you to customize reports with your
                  practice name, logo, and contact information. This feature
                  gives your clients a seamless experience and helps strengthen
                  your professional brand.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger>
                  How do I get leads through the platform?
                </AccordionTrigger>
                <AccordionContent>
                  Under Elite subscription, you'll be listed in our nutritionist
                  directory that clients can browse. You can create a detailed
                  profile highlighting your specialties, experience, and
                  approach. We'll connect potential clients directly to you
                  through our platform.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger>Is my clients' data secure?</AccordionTrigger>
                <AccordionContent>
                  Yes, we take data security very seriously. All client
                  information is encrypted and stored securely following
                  industry best practices. We are compliant with data protection
                  regulations and never share client information with third
                  parties without explicit consent.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* CTA + AuthBox Section */}
        <div className="py-16 bg-gray-50 rounded-lg">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="md:w-1/2 mb-8 md:mb-0">
                <h2 className="text-3xl font-bold mb-4 text-gray-800">
                  Ready to Transform Your Nutrition Practice?
                </h2>
                <p className="text-xl text-gray-600 mb-6">
                  Join hundreds of Healthcare Professionals using MendRx to
                  deliver better client outcomes and grow their business.
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2"
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
                    <span>No credit card required to sign up</span>
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2"
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
                    <span>Active customer support included</span>
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2"
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
                    <span>Walkthrough to learn using the software</span>
                  </li>
                </ul>
              </div>
              <div className="md:w-1/2 flex flex-col items-center">
                <Image
                  src="/mendrx_logo.png"
                  alt="MendRx"
                  width={250}
                  height={250}
                  className="max-w-sm"
                />
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg text-lg mt-4"
                  onClick={() =>
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
