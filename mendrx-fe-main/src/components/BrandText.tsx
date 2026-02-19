// File: src/components/BrandText.tsx
import React from "react";

const BrandText = () => {
  return (
    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center my-4">
      <span className="text-green-600">Mend</span>
      <span className="relative">
        <span style={{ color: "#002D62" }}>Rx</span>
        <span className="absolute -bottom-2 left-0 w-full h-2 bg-green-500 transform -skew-x-12"></span>
      </span>
    </h1>
  );
};

export default BrandText;
