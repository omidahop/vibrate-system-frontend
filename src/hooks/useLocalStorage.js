import { useState, useEffect } from '../utils/reactUtils.js';
import { storageUtils } from '../utils/helpers.js';

export function useLocalStorage(key, defaultValue = null) {
    const [value, setValue] = useState(() => {
        return storageUtils.get(key, defaultValue);
    });

    const setStoredValue = (newValue) => {
        try {
            // Allow value to be a function so we have the same API as useState
            const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
            
            setValue(valueToStore);
            storageUtils.set(key, valueToStore);
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    };

    const removeStoredValue = () => {
        try {
            setValue(defaultValue);
            storageUtils.remove(key);
        } catch (error) {
            console.error(`Error removing localStorage key "${key}":`, error);
        }
    };

    // Listen for changes to this key from other tabs/windows
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === key && e.newValue !== null) {
                setValue(JSON.parse(e.newValue));
            }
        };

        window.addEventListener('storage', handleStorageChange);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [key]);

    return [value, setStoredValue, removeStoredValue];
}

// Hook for managing user settings
export function useSettings() {
    const [settings, setSettings, removeSettings] = useLocalStorage('vibrate_settings', {});
    
    const updateSetting = (key, value) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const updateMultipleSettings = (newSettings) => {
        setSettings(prev => ({
            ...prev,
            ...newSettings
        }));
    };

    const resetSettings = () => {
        removeSettings();
    };

    const getSetting = (key, defaultValue = null) => {
        return settings[key] ?? defaultValue;
    };

    return {
        settings,
        updateSetting,
        updateMultipleSettings,
        resetSettings,
        getSetting
    };
}

// Hook for managing theme
export function useTheme() {
    const [theme, setTheme] = useLocalStorage('vibrate_theme', 'light');

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        applyTheme(newTheme);
    };

    const applyTheme = (themeName = theme) => {
        document.documentElement.setAttribute('data-theme', themeName);
    };

    // Apply theme on mount
    useEffect(() => {
        applyTheme();
    }, []);

    return {
        theme,
        setTheme: (newTheme) => {
            setTheme(newTheme);
            applyTheme(newTheme);
        },
        toggleTheme
    };
}