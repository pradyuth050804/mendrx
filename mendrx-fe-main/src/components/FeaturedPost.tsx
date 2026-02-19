import { motion } from "framer-motion";
import Link from "next/link";
import type { BlogPost } from "./BlogCard";

interface FeaturedPostProps {
  post: BlogPost;
}

const FeaturedPost = ({ post }: FeaturedPostProps) => {
  // Determine if this is an external blog post
  const isExternalBlog = !!post.externalUrl;

  // Create appropriate link component based on whether post is external or internal
  const BlogLink = ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => {
    if (isExternalBlog) {
      return (
        <a
          href={post.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          {children}
        </a>
      );
    }

    return (
      <Link href={`/blogs/${post.slug}`} className={className}>
        {children}
      </Link>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative w-full h-[450px] rounded-xl overflow-hidden group"
    >
      <div className="absolute inset-0 bg-black/30 z-10" />
      <img
        src={post.imageSrc}
        alt={post.title}
        className="absolute inset-0 w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 z-20 flex flex-col justify-end p-8 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex gap-2 mb-4">
            <span className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-full inline-block">
              {post.category}
            </span>
            {isExternalBlog && (
              <span className="px-3 py-1 bg-gray-800 text-white text-sm font-medium rounded-full inline-block">
                External
              </span>
            )}
          </div>

          <BlogLink>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              {post.title}
            </h2>
          </BlogLink>

          <p className="text-white/90 mb-6 max-w-3xl text-lg">{post.excerpt}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center text-white/90">
              <span className="mr-4">{post.date}</span>
              <span>{post.readTime} read</span>
            </div>

            <BlogLink className="bg-white text-black px-5 py-2 rounded-full inline-flex items-center group overflow-hidden relative">
              <span className="relative z-10">Read Article</span>
              <span className="absolute inset-0 bg-green-600 transform scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100" />
              <span className="absolute inset-0 bg-white transform scale-x-100 origin-right transition-transform duration-300 group-hover:scale-x-0" />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 ml-2 relative z-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
              {isExternalBlog && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-1 relative z-10"
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
              )}
            </BlogLink>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default FeaturedPost;
