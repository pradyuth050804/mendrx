import React from "react";

interface WatermarkPreviewProps {
  watermarkUrl: string;
}

const WatermarkPreview: React.FC<WatermarkPreviewProps> = ({
  watermarkUrl,
}) => {
  return (
    <div className="relative border rounded-md p-4 w-full h-[400px] bg-white overflow-hidden">
      {/* Sample PDF content */}
      <div className="relative z-10 pointer-events-none">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <div className="font-bold text-lg">Sample PDF Document</div>
          <div className="text-gray-500 text-sm">Page 1</div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="bg-gray-100 p-3 rounded">
            <div className="font-semibold mb-1">Client Information</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Name:</span> John Doe
              </div>
              <div>
                <span className="font-medium">Age:</span> 45
              </div>
              <div>
                <span className="font-medium">Gender:</span> Male
              </div>
              <div>
                <span className="font-medium">Report Date:</span> March 31, 2025
              </div>
            </div>
          </div>

          <div>
            <div className="font-semibold mb-2">Blood Panel Analysis</div>
            <div className="border rounded overflow-hidden">
              <div className="bg-gray-50 p-2 border-b flex justify-between">
                <div className="font-medium">Metabolic Panel</div>
                <div className="text-green-600 font-medium">Good</div>
              </div>
              <div className="p-3 text-sm">
                <p>All parameters within optimal range.</p>
              </div>
            </div>
          </div>

          <div>
            <div className="font-semibold mb-2">Notes</div>
            <div className="text-sm space-y-2">
              <p>
                This is a sample report showing how the watermark will appear on
                your documents.
              </p>
              <p>
                The actual content will reflect your client's data and analysis.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Watermark overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none"
        style={{ opacity: 0.08 }} // Light opacity for watermark
      >
        <img
          src={watermarkUrl}
          alt="Watermark Preview"
          className="max-w-[60%] max-h-[60%] object-contain"
        />
      </div>
    </div>
  );
};

export default WatermarkPreview;
