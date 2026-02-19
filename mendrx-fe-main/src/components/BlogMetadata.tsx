import { Metadata } from "next";
import { BlogPost } from "@/components/BlogCard";

// Sample blog posts data that includes both internal and external posts
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
  // Example of an external blog post (e.g., Medium)
  //   {
  //     id: 2,
  //     title: "Gut Microbiome: The Key to Optimal Health",
  //     excerpt:
  //       "Discover how your gut microbiome affects everything from digestion to mental health and immunity.",
  //     imageSrc:
  //       "https://images.unsplash.com/photo-1576086213369-97a306d36557?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80",
  //     date: "March 10, 2025",
  //     author: "MendrX",
  //     readTime: "8 min read",
  //     category: "Gut Health",
  //     slug: "gut-microbiome-health",
  //     externalUrl: "https://medium.com/mendrx/gut-microbiome-health",
  //   },
  // Add more blog posts as needed
];

/**
 * Generates metadata for blog posts, handling both internal and external posts
 */
export async function generateBlogMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const slug = params.slug;

  // Find the blog post by slug
  const post = blogPosts.find((post) => post.slug === slug);

  if (!post) {
    // Default metadata if post not found
    return {
      title: "Blog Post Not Found | MendRx",
      description: "The requested blog post could not be found.",
    };
  }

  // If it's an external blog post, we should redirect
  // This is handled in the page component, but we still need to provide metadata

  // Create a canonical URL for the post
  const canonicalUrl = post.externalUrl || `https://mendrx.in/blogs/${slug}`;

  return {
    title: post.title,
    description: post.excerpt,

    // Open Graph metadata (used by Facebook, LinkedIn)
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: canonicalUrl,
      siteName: "MendRx",
      images: [
        {
          url: post.imageSrc,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      locale: "en_US",
      type: "article",
    },

    // Twitter/X card
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [post.imageSrc],
    },

    // Alternative metadata for other platforms
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

/**
 * Retrieves a blog post by slug
 */
export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

/**
 * Retrieves all blog posts
 */
export function getAllBlogPosts(): BlogPost[] {
  return blogPosts;
}

/**
 * Retrieves related blog posts (same category, excluding the current post)
 */
export function getRelatedBlogPosts(
  currentPost: BlogPost,
  limit: number = 3
): BlogPost[] {
  return blogPosts
    .filter(
      (post) =>
        post.category === currentPost.category &&
        post.id !== currentPost.id &&
        !post.externalUrl // Only include internal posts as related
    )
    .slice(0, limit);
}
