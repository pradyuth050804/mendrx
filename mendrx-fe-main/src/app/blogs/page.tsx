"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import BlogCard, { BlogPost } from "@/components/BlogCard";
import FeaturedPost from "@/components/FeaturedPost";
import BlogCategories from "@/components/BlogCategories";

// Sample blog posts data with both internal and external posts
const blogPosts: BlogPost[] = [
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

  //   {
  //     id: 2,
  //     title: "Gut Microbiome: The Key to Optimal Health",
  //     excerpt:
  //       "Discover how your gut microbiome affects everything from digestion to mental health and immunity.",
  //     imageSrc:
  //       "https://images.unsplash.com/photo-1576086213369-97a306d36557?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80",
  //     date: "March 10, 2025",
  //     author: "MendRx",
  //     readTime: "8 min read",
  //     category: "Gut Health",
  //     slug: "gut-microbiome-health", // Still maintain a slug for consistency
  //     externalUrl: "https://medium.com/mendrx/gut-microbiome-health",
  //   },
  //   // Example of another internal blog post
  //   {
  //     id: 3,
  //     title: "Understanding Insulin Resistance: Beyond Type 2 Diabetes",
  //     excerpt:
  //       "Insulin resistance affects more than just blood sugar and diabetes risk—learn about its wide-ranging impacts.",
  //     imageSrc:
  //       "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80",
  //     date: "March 5, 2025",
  //     author: "MendRx",
  //     readTime: "7 min read",
  //     category: "Metabolism",
  //     slug: "insulin-resistance-explained",
  //   },
  //   // Example of another external blog post
  //   {
  //     id: 4,
  //     title: "The Connection Between Stress and Hormonal Imbalance",
  //     excerpt:
  //       "Chronic stress disrupts hormonal balance in multiple ways, affecting everything from mood to fertility.",
  //     imageSrc:
  //       "https://images.unsplash.com/photo-1600267204091-5c1ab8b10c02?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80",
  //     date: "February 28, 2025",
  //     author: "MendRx",
  //     readTime: "5 min read",
  //     category: "Hormones",
  //     slug: "stress-hormonal-imbalance",
  //     externalUrl: "https://medium.com/mendrx/stress-hormonal-imbalance",
  //   },
  // Add more blog posts here as needed
];

const Blogs = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>(blogPosts);
  const [isLoading, setIsLoading] = useState(true);

  // Extract unique categories
  const categories = Array.from(
    new Set(blogPosts.map((post) => post.category))
  );

  // Featured post is the first post in our list
  const featuredPost = blogPosts[0];

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (activeCategory) {
      setFilteredPosts(
        blogPosts.filter((post) => post.category === activeCategory)
      );
    } else {
      setFilteredPosts(blogPosts);
    }
  }, [activeCategory]);

  const handleCategoryChange = (category: string | null) => {
    setActiveCategory(category);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
            Our Blog
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Discover the latest insights, tutorials, and updates from our team
          </p>
        </motion.div>

        {isLoading ? (
          <div className="animate-pulse">
            <div className="rounded-xl bg-gray-200 h-[450px] w-full mb-12" />
          </div>
        ) : (
          <FeaturedPost post={featuredPost} />
        )}

        <div className="my-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-black mb-4 md:mb-0">
              Latest Articles
            </h2>

            <BlogCategories
              categories={categories}
              activeCategory={activeCategory}
              onCategoryChange={handleCategoryChange}
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="rounded-lg bg-gray-200 h-48 w-full mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory || "all"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              >
                {filteredPosts.map((post, index) => (
                  <BlogCard key={post.id} post={post} index={index} />
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
};

export default Blogs;
