import React from 'react';

interface ImportResultProps {
  result: {
    success: boolean;
    recordsProcessed?: number;
    newProducts?: number;
    updatedProducts?: number;
    error?: string;
  };
  onClose: () => void;
}

const ImportResultModal: React.FC<ImportResultProps> = ({ result, onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 rounded-t-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center gap-3">
            {result.success ? (
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <h2 className={`text-lg font-bold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.success ? 'Import Successful' : 'Import Failed'}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {result.success ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Records Processed</span>
                <span className="font-bold text-gray-800">{result.recordsProcessed}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">New Products</span>
                <span className="font-bold text-green-600">{result.newProducts}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Updated Products</span>
                <span className="font-bold text-blue-600">{result.updatedProducts}</span>
              </div>
            </div>
          ) : (
            <div className="text-red-600">
              <p className="font-medium mb-2">Error:</p>
              <p className="text-sm bg-red-50 p-3 rounded border border-red-200">
                {result.error || 'Unknown error occurred'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportResultModal;
