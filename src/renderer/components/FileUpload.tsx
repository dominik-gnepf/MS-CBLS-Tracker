import React from 'react';

interface FileUploadProps {
  onImport: () => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onImport, isLoading }) => {
  return (
    <button
      onClick={onImport}
      disabled={isLoading}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-medium
        ${isLoading
          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
        }
        transition-colors duration-150
      `}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
        />
      </svg>
      {isLoading ? 'Loading...' : 'Import CSV'}
    </button>
  );
};

export default FileUpload;
