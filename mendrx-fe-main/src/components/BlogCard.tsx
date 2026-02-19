import { motion } from "framer-motion";
import Link from "next/link";

export interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  imageSrc: string;
  slug: string;
  externalUrl?: string; // Add this field for external blog posts
}

interface BlogCardProps {
  post: BlogPost;
  index: number;
}

const BlogCard = ({ post, index }: BlogCardProps) => {
  // Determine if this is an external blog post
  const isExternalBlog = !!post.externalUrl;

  // Create appropriate link component based on whether post is external or internal
  const BlogLink = ({ children }: { children: React.ReactNode }) => {
    if (isExternalBlog) {
      return (
        <a href={post.externalUrl} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    }

    return <Link href={`/blogs/${post.slug}`}>{children}</Link>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="blog-card bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100"
    >
      <div className="relative overflow-hidden h-48">
        <img
          src={post.imageSrc}
          alt={post.title}
          className="w-full h-full object-contain transition-transform duration-500 ease-in-out hover:scale-105"
          loading="lazy"
        />
        <div className="absolute top-4 left-4">
          <span className="category-chip inline-block bg-green-600 text-white text-xs font-medium px-2.5 py-1 rounded-full">
            {post.category}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
          <span>{post.date}</span>
          <span>{post.readTime} read</span>
        </div>

        <BlogLink>
          <h3 className="text-xl font-semibold text-black mb-2 hover:text-green-600 transition-colors">
            {post.title}
          </h3>
        </BlogLink>

        <p className="text-gray-600 mb-4 line-clamp-2">{post.excerpt}</p>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">By {post.author}</span>
          <BlogLink>
            <span className="text-green-600 hover:text-green-700 font-medium text-sm inline-flex items-center group">
              Read more
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 ml-1 transition-transform duration-300 group-hover:translate-x-1"
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
            </span>
          </BlogLink>
        </div>
      </div>
    </motion.div>
  );
};

export default BlogCard;
