import { motion } from "framer-motion";

interface BlogCategoriesProps {
  categories: string[];
  activeCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

const BlogCategories = ({
  categories,
  activeCategory,
  onCategoryChange,
}: BlogCategoriesProps) => {
  const handleCategoryClick = (category: string | null) => {
    onCategoryChange(category);
  };

  return (
    <div className="mb-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap gap-3"
      >
        <button
          onClick={() => handleCategoryClick(null)}
          className={`category-chip px-4 py-2 rounded-full text-sm font-medium transition-all 
          ${
            activeCategory === null
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryClick(category)}
            className={`category-chip px-4 py-2 rounded-full text-sm font-medium transition-all 
            ${
              activeCategory === category
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {category}
          </button>
        ))}
      </motion.div>
    </div>
  );
};

export default BlogCategories;
