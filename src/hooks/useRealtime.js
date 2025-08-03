import { useState, useEffect } from '../utils/reactUtils.js';
import realtimeService from '../services/realtimeService.js';
import { useAuth } from './useAuth.js';

export function useRealtime() {
    const { isAuthenticated } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        // Update connection status
        const updateStatus = () => {
            const status = realtimeService.getConnectionStatus();
            setConnectionStatus(status);
            setIsConnected(status.isEnabled && status.isAuthenticated);
        };

        // Initial status update
        updateStatus();

        // Listen for auth changes
        const authUnsubscribe = realtimeService.addListener('auth_changed', updateStatus);

        return () => {
            authUnsubscribe();
        };
    }, [isAuthenticated]);

    // Subscribe to data changes
    const subscribeToData = (callback) => {
        const unsubscribeInsert = realtimeService.addListener('data_inserted', callback);
        const unsubscribeUpdate = realtimeService.addListener('data_updated', callback);
        const unsubscribeDelete = realtimeService.addListener('data_deleted', callback);

        return () => {
            unsubscribeInsert();
            unsubscribeUpdate();
            unsubscribeDelete();
        };
    };

    // Subscribe to settings changes
    const subscribeToSettings = (callback) => {
        return realtimeService.addListener('settings_changed', callback);
    };

    // Subscribe to sync notifications
    const subscribeToSync = (callback) => {
        return realtimeService.addListener('sync_needed', callback);
    };

    // Subscribe to specific equipment
    const subscribeToEquipment = (unitType, equipmentId, callback) => {
        if (!isConnected) return null;
        return realtimeService.subscribeToEquipment(unitType, equipmentId, callback);
    };

    // Subscribe to unit data
    const subscribeToUnit = (unitType, callback) => {
        if (!isConnected) return null;
        return realtimeService.subscribeToUnit(unitType, callback);
    };

    // Add notification
    const addNotification = (notification) => {
        const id = Date.now().toString();
        const newNotification = {
            id,
            timestamp: new Date().toISOString(),
            ...notification
        };

        setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // Keep last 10

        return id;
    };

    // Remove notification
    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    // Clear all notifications
    const clearNotifications = () => {
        setNotifications([]);
    };

    // Enable/disable notifications
    const toggleNotifications = (enabled) => {
        realtimeService.setNotifications(enabled);
    };

    return {
        // Connection state
        isConnected,
        connectionStatus,
        
        // Notifications
        notifications,
        addNotification,
        removeNotification,
        clearNotifications,
        toggleNotifications,
        
        // Subscriptions
        subscribeToData,
        subscribeToSettings,
        subscribeToSync,
        subscribeToEquipment,
        subscribeToUnit
    };
}