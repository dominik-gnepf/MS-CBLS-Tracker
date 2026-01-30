import React, { useState, useEffect } from 'react';

type UpdateState = 'idle' | 'available' | 'downloading' | 'downloaded' | 'error';

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

const UpdateNotification: React.FC = () => {
  const [updateState, setUpdateState] = useState<UpdateState>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Subscribe to update events
    const unsubAvailable = window.electronAPI.onUpdateAvailable((info) => {
      setUpdateInfo({ version: info.version, releaseNotes: info.releaseNotes });
      setUpdateState('available');
      setDismissed(false);
    });

    const unsubNotAvailable = window.electronAPI.onUpdateNotAvailable(() => {
      setUpdateState('idle');
    });

    const unsubProgress = window.electronAPI.onUpdateDownloadProgress((progress) => {
      setDownloadProgress(progress);
    });

    const unsubDownloaded = window.electronAPI.onUpdateDownloaded((info) => {
      setUpdateInfo({ version: info.version });
      setUpdateState('downloaded');
      setDownloadProgress(null);
    });

    const unsubError = window.electronAPI.onUpdateError((error) => {
      setErrorMessage(error);
      setUpdateState('error');
    });

    // Cleanup subscriptions
    return () => {
      unsubAvailable();
      unsubNotAvailable();
      unsubProgress();
      unsubDownloaded();
      unsubError();
    };
  }, []);

  const handleDownload = async () => {
    setUpdateState('downloading');
    setDownloadProgress({ percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 });
    await window.electronAPI.downloadUpdate();
  };

  const handleInstall = () => {
    window.electronAPI.installUpdate();
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  // Don't show anything if dismissed or no update
  if (dismissed || updateState === 'idle') {
    return null;
  }

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="font-medium text-blue-800">Update Available</span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          {updateState === 'available' && updateInfo && (
            <>
              <p className="text-sm text-gray-600 mb-3">
                Version <span className="font-semibold">{updateInfo.version}</span> is available.
              </p>
              <button
                onClick={handleDownload}
                className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Download Update
              </button>
            </>
          )}

          {updateState === 'downloading' && downloadProgress && (
            <>
              <p className="text-sm text-gray-600 mb-2">
                Downloading... {downloadProgress.percent.toFixed(0)}%
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}
                {downloadProgress.bytesPerSecond > 0 && (
                  <span className="ml-2">({formatBytes(downloadProgress.bytesPerSecond)}/s)</span>
                )}
              </p>
            </>
          )}

          {updateState === 'downloaded' && updateInfo && (
            <>
              <p className="text-sm text-gray-600 mb-3">
                Version <span className="font-semibold">{updateInfo.version}</span> is ready to install.
              </p>
              <button
                onClick={handleInstall}
                className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Restart & Install
              </button>
            </>
          )}

          {updateState === 'error' && (
            <>
              <p className="text-sm text-red-600 mb-2">
                Update failed: {errorMessage}
              </p>
              <button
                onClick={handleDismiss}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;
