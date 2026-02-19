"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Header from "@/components/Header";
import { BlogPost as BlogPostType } from "@/components/BlogCard";
import SocialShare from "@/components/SocialShare";
import ExternalBlogRedirect from "@/components/ExternalBlogRedirect";

// Sample blog data - in a real app, this would come from an API or database
const blogPosts: BlogPostType[] = [
  {
    id: 1,
    title:
      "The Future of Functional Medicine: How AI is Transforming Root Cause Analysis",
    excerpt:
      "Discover how AI-powered technology is revolutionizing functional medicine with faster diagnostics and personalized treatment plans.",
    category: "Technology",
    author: "MendRx",
    date: "March 30, 2025",
    readTime: "5 min read",
    imageSrc: "/blogs/1_1.png",
    slug: "ai-functional-medicine",
  },
  {
    id: 2,
    title:
      "Understanding Blood Markers: The Key to Personalized Health Optimization for Medical Practitioners",
    excerpt:
      "In modern healthcare, optimizing patient outcomes requires a data-driven and personalized approach. Blood markers provide critical insights into a patient’s metabolic, inflammatory, and organ health, allowing medical practitioners to detect early imbalances before they progress into chronic conditions. MendRx simplifies the process of analyzing these markers, enabling practitioners to make informed decisions with ease.",
    imageSrc:
      "https://media.licdn.com/dms/image/v2/D5612AQH1hH3sfK0LFw/article-cover_image-shrink_720_1280/B56ZXyjvKqHEAI-/0/1743531214197?e=1751500800&v=beta&t=5n7YsQukunVlsI0VY8vjvRJUVjz2JHMGCfgiBCSZLzI",
    date: "April 1, 2025",
    author: "MendRx",
    readTime: "5 min read",
    category: "Functional Medicine",
    slug: "understanding-blood-markers-key-personalized-health-optimization-s1h1c",
    externalUrl:
      "https://www.linkedin.com/pulse/understanding-blood-markers-key-personalized-health-optimization-s1h1c/?trackingId=X4xqKDUAmzy7PR7EorqhpQ%3D%3D",
  },
  {
    id: 3,
    title:
      'Case Study: "Fatigue with Normal Labs?" — A Hidden Story in the Numbers',
    excerpt:
      "A functional medicine deep-dive reveals how ‘normal’ lab values can mask sub-optimal ferritin, B12, vitamin D, and low-grade inflammation driving chronic fatigue—and how targeted interventions led to a 70% energy rebound.",
    imageSrc:
      "https://media.licdn.com/dms/image/v2/D5612AQHwsT7QBwMH0w/article-cover_image-shrink_600_2000/B56ZZUKDROGoAQ-/0/1745168648061?e=1751500800&v=beta&t=Km_XCtHh9hOGr2lwxycJeJQ6PMiQuguzlu_86t6Quu4",
    date: "April 20, 2025",
    author: "MendRx",
    readTime: "6 min read",
    category: "Functional Medicine",
    slug: "case-study-fatigue-normal-labs-hidden-story-numbers-mendrxapp-lfyec",
    externalUrl:
      "https://www.linkedin.com/pulse/case-study-fatigue-normal-labs-hidden-story-numbers-mendrxapp-lfyec/?trackingId=QXEIMUIJVH9SzU3Ns%2F7%2FCg%3D%3D",
  },
  // Example of another internal blog post
  // {
  //   id: 3,
  //   title: "Understanding Insulin Resistance: Beyond Type 2 Diabetes",
  //   excerpt:
  //     "Insulin resistance affects more than just blood sugar and diabetes risk—learn about its wide-ranging impacts.",
  //   imageSrc:
  //     "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80",
  //   date: "March 5, 2025",
  //   author: "MendRx",
  //   readTime: "7 min read",
  //   category: "Metabolism",
  //   slug: "insulin-resistance-explained",
  // },
  // // Include external blog posts so they are properly handled
  // {
  //   id: 2,
  //   title: "Gut Microbiome: The Key to Optimal Health",
  //   excerpt:
  //     "Discover how your gut microbiome affects everything from digestion to mental health and immunity.",
  //   imageSrc:
  //     "https://images.unsplash.com/photo-1576086213369-97a306d36557?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80",
  //   date: "March 10, 2025",
  //   author: "MendRx",
  //   readTime: "8 min read",
  //   category: "Gut Health",
  //   slug: "gut-microbiome-health",
  //   externalUrl: "https://medium.com/mendrx/gut-microbiome-health",
  // },
  // {
  //   id: 4,
  //   title: "The Connection Between Stress and Hormonal Imbalance",
  //   excerpt:
  //     "Chronic stress disrupts hormonal balance in multiple ways, affecting everything from mood to fertility.",
  //   imageSrc:
  //     "https://images.unsplash.com/photo-1600267204091-5c1ab8b10c02?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80",
  //   date: "February 28, 2025",
  //   author: "MendRx",
  //   readTime: "5 min read",
  //   category: "Hormones",
  //   slug: "stress-hormonal-imbalance",
  //   externalUrl: "https://medium.com/mendrx/stress-hormonal-imbalance",
  // },
];

// Blog content - this would typically come from a CMS or database
const blogContent = {
  "ai-functional-medicine": `
    <div>
      <p class="mb-6 text-lg leading-relaxed">Functional medicine is evolving, and <strong>AI-driven technology is leading the way</strong>. Medical practitioners applying functional medicine principles have long relied on blood marker analysis, symptom mapping, and lifestyle assessments to uncover the root causes of chronic conditions. However, manual interpretation can be <strong>time-consuming, complex, and prone to human error</strong>.</p>
      
      <p class="mb-6 text-lg leading-relaxed">Now, with <strong>AI-powered root cause analysis</strong>, practitioners can analyze lab results faster, detect hidden health imbalances, and create highly personalized treatment plans—all in a fraction of the time.</p>
      
      <h2 class="text-2xl font-bold text-green-600 mt-10 mb-4">The Challenge: Why Functional Medicine Needs AI</h2>
      <p class="mb-6 text-lg leading-relaxed">Functional medicine focuses on identifying and treating the root cause of diseases rather than just managing symptoms. However, practitioners often face key challenges:</p>
      
      <ul class="list-disc pl-6 mb-6 text-lg leading-relaxed">
        <li><strong>Time-Consuming Lab Interpretation</strong>: Reviewing and correlating blood markers, nutrient deficiencies, and metabolic dysfunctions manually takes hours.</li>
        <li><strong>Hidden Health Patterns Go Unnoticed</strong>: Subtle connections between inflammation, blood sugar dysregulation, and hormonal imbalances may be missed.</li>
        <li><strong>Scaling Personalized Care is Difficult</strong>: Creating custom nutrition, supplement, and lifestyle plans for each patient can be overwhelming.</li>
      </ul>
      
      <p class="mb-6 text-lg leading-relaxed">AI bridges this gap by providing faster, smarter, and more accurate functional health assessments.</p>
      
      <h2 class="text-2xl font-bold text-green-600 mt-10 mb-4">How AI is Transforming Functional Medicine</h2>
      
      <h3 class="text-xl font-bold text-gray-800 mt-8 mb-3">1. Instant Blood Marker Interpretation with AI</h3>
      <p class="mb-6 text-lg leading-relaxed">Traditional lab reports flag abnormal levels, but AI goes beyond by analyzing patterns between biomarkers to detect early metabolic imbalances, inflammatory triggers, and nutrient deficiencies.</p>
      
      <h3 class="text-xl font-bold text-gray-800 mt-8 mb-3">2. Precision Root Cause Analysis</h3>
      <p class="mb-6 text-lg leading-relaxed">AI correlates multiple data points—such as glucose, CRP, insulin resistance, gut health markers, and hormonal imbalances—to pinpoint underlying dysfunctions rather than just surface-level symptoms.</p>
      
      <h3 class="text-xl font-bold text-gray-800 mt-8 mb-3">3. AI-Driven Personalized Nutrition & Supplement Plans</h3>
      <p class="mb-6 text-lg leading-relaxed">By integrating lab insights, AI can recommend:</p>
      <ul class="list-disc pl-6 mb-6 text-lg leading-relaxed">
        <li>Targeted dietary modifications based on metabolic health</li>
        <li>Precision supplementation tailored to deficiencies</li>
        <li>Lifestyle adjustments for optimal recovery and well-being</li>
      </ul>
      
      <h3 class="text-xl font-bold text-gray-800 mt-8 mb-3">4. Saving Time & Scaling Patient Care</h3>
      <p class="mb-6 text-lg leading-relaxed">With AI automating blood marker analysis and treatment planning, practitioners can:</p>
      <ul class="list-disc pl-6 mb-6 text-lg leading-relaxed">
        <li>Spend less time on manual data interpretation</li>
        <li>Focus on coaching and patient engagement</li>
        <li>Scale their practice while maintaining high-quality, personalized care</li>
      </ul>
      
      <h2 class="text-2xl font-bold text-green-600 mt-10 mb-4">The Future of AI in Functional Medicine</h2>
      <p class="mb-6 text-lg leading-relaxed">With the rise of data-driven healthcare, AI-powered platforms like MendRx are revolutionizing how functional medicine practitioners analyze blood markers, optimize patient outcomes, and scale their services.</p>
      
      <p class="mb-6 text-lg leading-relaxed">The future of functional medicine isn't just about treating disease—it's about <strong>preventing it through precision health insights</strong>.</p>
      
      <h2 class="text-2xl font-bold text-green-600 mt-10 mb-4">Are You Ready to Integrate AI into Your Practice?</h2>
      <p class="mb-6 text-lg leading-relaxed">Discover how MendRx can help you leverage AI for faster diagnostics, smarter treatment plans, and better patient outcomes.</p>
      
      <p class="mb-6 text-lg leading-relaxed">
        <strong>Get a Demo Today</strong> by signing up on <a href="https://mendrx.in" class="text-green-600 underline">mendrx.in</a>!
      </p>
      
      <p class="mb-6 text-lg leading-relaxed">
        For more health insights and to understand how AI can transform healthcare, visit <a href="https://mendrx.in" class="text-green-600 underline">MendRx</a>.
      </p>
    </div>
  `,
};

const BlogPost = () => {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostType[]>([]);

  // Define currentUrl
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  useEffect(() => {
    // Simulate API fetch for the blog post
    const timer = setTimeout(() => {
      if (slug) {
        const foundPost = blogPosts.find((post) => post.slug === slug);

        if (foundPost) {
          setPost(foundPost);

          // Get related posts (same category)
          // For both internal and external posts, we'll show related internal posts
          setRelatedPosts(
            blogPosts
              .filter(
                (p) =>
                  p.category === foundPost.category &&
                  p.id !== foundPost.id &&
                  !p.externalUrl // Only show internal posts as related
              )
              .slice(0, 3)
          );
        } else {
          setPost(null);
        }
      }
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse max-w-4xl mx-auto">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-8" />
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-12" />
            <div className="h-96 bg-gray-200 rounded w-full mb-8" />
            <div className="h-4 bg-gray-200 rounded w-full mb-4" />
            <div className="h-4 bg-gray-200 rounded w-full mb-4" />
            <div className="h-4 bg-gray-200 rounded w-full mb-4" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold mb-4">Blog Post Not Found</h1>
          <p className="mb-8">
            Sorry, we couldn't find the blog post you're looking for.
          </p>
          <Link
            href="/blogs"
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Return to Blogs
          </Link>
        </div>
      </div>
    );
  }

  // For external blog posts, show the redirect component instead
  if (post?.externalUrl) {
    return (
      <ExternalBlogRedirect
        title={post.title}
        excerpt={post.excerpt}
        externalUrl={post.externalUrl}
        category={post.category}
        author={post.author}
      />
    );
  }

  // For internal blog posts, show the regular blog post component
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <article className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link
              href="/blogs"
              className="inline-flex items-center text-green-600 font-medium mb-6 hover:text-green-700 transition-colors"
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

            <div className="mb-8">
              <span className="inline-block bg-green-600 text-white text-sm font-medium px-3 py-1 rounded-full mb-4">
                {post?.category}
              </span>
              <h1 className="text-4xl md:text-5xl font-bold text-black mb-6 leading-tight">
                {post?.title}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-gray-600 mb-6">
                <div className="flex flex-wrap items-center mb-3 sm:mb-0">
                  <span className="mr-4">By {post?.author}</span>
                  <span className="mr-4">{post?.date}</span>
                  <span>{post?.readTime}</span>
                </div>
                <SocialShare
                  url={currentUrl}
                  title={post?.title || ""}
                  summary={post?.excerpt || ""}
                />
              </div>
            </div>

            <div className="mb-12 rounded-xl overflow-hidden h-96 relative">
              <img
                src={post?.imageSrc}
                alt={post?.title}
                className="w-full h-full object-contain"
              />
            </div>

            <div
              className="prose prose-lg max-w-none mb-12"
              dangerouslySetInnerHTML={{
                __html: blogContent[slug as keyof typeof blogContent] || "",
              }}
            />
          </motion.div>

          {relatedPosts.length > 0 && (
            <div className="border-t border-gray-200 pt-8 mt-12">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-black">
                  Related Articles
                </h2>
                <Link
                  href="/blogs"
                  className="text-green-600 hover:text-green-700 transition-colors font-medium"
                >
                  View All
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {relatedPosts.map((relatedPost, index) => (
                  <motion.div
                    key={relatedPost.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100"
                  >
                    <div className="relative overflow-hidden h-48">
                      <img
                        src={relatedPost.imageSrc}
                        alt={relatedPost.title}
                        className="w-full h-full object-contain transition-transform duration-500 hover:scale-105"
                      />
                    </div>
                    <div className="p-5">
                      <Link href={`/blogs/${relatedPost.slug}`}>
                        <h3 className="text-lg font-semibold text-black mb-2 hover:text-green-600 transition-colors">
                          {relatedPost.title}
                        </h3>
                      </Link>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{relatedPost.date}</span>
                        <span>{relatedPost.readTime}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>
    </div>
  );
};

export default BlogPost;
