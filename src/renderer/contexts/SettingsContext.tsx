import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings, DEFAULT_SETTINGS, getCategoryColorClass } from '../types';

interface SettingsContextType {
  settings: AppSettings;
  isLoading: boolean;
  updateSettings: (newSettings: AppSettings) => Promise<void>;
  getCategoryColor: (categoryName: string) => string;
  getCategoryOrder: () => string[];
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await window.api.getSettings();
      if (loadedSettings) {
        setSettings(loadedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: AppSettings) => {
    try {
      const result = await window.api.saveSettings(newSettings);
      if (result.success) {
        setSettings(newSettings);
      } else {
        throw new Error(result.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  };

  const getCategoryColor = (categoryName: string): string => {
    const category = settings.categories.find((c) => c.name === categoryName);
    if (category) {
      return getCategoryColorClass(category.color);
    }
    return getCategoryColorClass('gray');
  };

  const getCategoryOrder = (): string[] => {
    return settings.categories
      .sort((a, b) => a.order - b.order)
      .map((c) => c.name);
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        updateSettings,
        getCategoryColor,
        getCategoryOrder,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
