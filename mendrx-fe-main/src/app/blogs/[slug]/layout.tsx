import { Metadata } from "next";
import { generateBlogMetadata } from "@/components/BlogMetadata";

// Generate metadata for blog post pages
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  return generateBlogMetadata({ params });
}

export default function BlogPostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
