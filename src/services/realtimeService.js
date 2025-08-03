import { supabase, supabaseHelpers, TABLES } from './supabaseClient.js';
import authService from './authService.js';
import { uiUtils } from '../utils/helpers.js';

class RealtimeService {
    constructor() {
        this.subscriptions = new Map();
        this.isEnabled = false;
        this.listeners = new Map();
        
        // Initialize when auth state changes
        authService.addAuthListener((event, user) => {
            if (event === 'SIGNED_IN') {
                this.enable();
            } else if (event === 'SIGNED_OUT') {
                this.disable();
            }
        });
    }

    // Enable realtime features
    enable() {
        if (!authService.isAuthenticated()) {
            console.warn('Cannot enable realtime without authentication');
            return;
        }

        this.isEnabled = true;
        console.log('Realtime service enabled');
        
        // Subscribe to vibrate data changes
        this.subscribeToVibrateData();
        
        // Subscribe to user settings changes
        this.subscribeToUserSettings();
    }

    // Disable realtime features
    disable() {
        this.isEnabled = false;
        
        // Unsubscribe from all channels
        this.subscriptions.forEach(subscription => {
            supabaseHelpers.unsubscribe(subscription);
        });
        
        this.subscriptions.clear();
        console.log('Realtime service disabled');
    }

    // Subscribe to vibrate data changes
    subscribeToVibrateData() {
        if (!this.isEnabled) return;

        const subscription = supabaseHelpers.subscribeToTable(
            TABLES.VIBRATE_DATA,
            (payload) => {
                this.handleVibrateDataChange(payload);
            }
        );

        this.subscriptions.set('vibrate_data', subscription);
    }

    // Subscribe to user settings changes
    subscribeToUserSettings() {
        if (!this.isEnabled || !authService.getCurrentUser()) return;

        const subscription = supabaseHelpers.subscribeToTable(
            TABLES.USER_SETTINGS,
            (payload) => {
                this.handleUserSettingsChange(payload);
            },
            {
                filter: `user_id=eq.${authService.getCurrentUser().id}`
            }
        );

        this.subscriptions.set('user_settings', subscription);
    }

    // Handle vibrate data changes
    handleVibrateDataChange(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        console.log('Vibrate data change:', eventType, newRecord);

        switch (eventType) {
            case 'INSERT':
                this.notifyListeners('data_inserted', {
                    type: 'insert',
                    data: this.convertServerToLocal(newRecord)
                });
                
                // Show notification if it's from another user
                if (newRecord.user_id !== authService.getCurrentUser()?.id) {
                    this.showDataChangeNotification('داده جدید اضافه شد', 'info');
                }
                break;

            case 'UPDATE':
                this.notifyListeners('data_updated', {
                    type: 'update',
                    data: this.convertServerToLocal(newRecord),
                    oldData: this.convertServerToLocal(oldRecord)
                });
                
                if (newRecord.user_id !== authService.getCurrentUser()?.id) {
                    this.showDataChangeNotification('داده‌ای به‌روزرسانی شد', 'info');
                }
                break;

            case 'DELETE':
                this.notifyListeners('data_deleted', {
                    type: 'delete',
                    data: this.convertServerToLocal(oldRecord)
                });
                
                if (oldRecord.user_id !== authService.getCurrentUser()?.id) {
                    this.showDataChangeNotification('داده‌ای حذف شد', 'warning');
                }
                break;
        }
    }

    // Handle user settings changes
    handleUserSettingsChange(payload) {
        const { eventType, new: newRecord } = payload;
        
        console.log('User settings change:', eventType, newRecord);

        if (eventType === 'UPDATE' || eventType === 'INSERT') {
            this.notifyListeners('settings_changed', {
                type: 'settings_update',
                data: newRecord
            });
        }
    }

    // Convert server format to local format
    convertServerToLocal(serverData) {
        if (!serverData) return null;

        return {
            id: `${serverData.unit_type}_${serverData.equipment_id}_${serverData.measurement_date}`,
            unit: serverData.unit_type,
            equipment: serverData.equipment_id,
            equipmentName: serverData.equipment_name,
            date: serverData.measurement_date,
            parameters: serverData.parameters,
            notes: serverData.notes,
            userId: serverData.user_id,
            timestamp: serverData.local_timestamp || serverData.server_timestamp,
            serverTimestamp: serverData.server_timestamp,
            syncStatus: 'synced'
        };
    }

    // Show notification for data changes
    showDataChangeNotification(message, type) {
        // Only show if notifications are enabled in settings
        const settings = JSON.parse(localStorage.getItem('vibrate_settings') || '{}');
        if (settings.notificationsEnabled !== false) {
            uiUtils.showNotification(message, type, 2000);
        }
    }

    // Add listener for realtime events
    addListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        
        this.listeners.get(event).push(callback);
        
        // Return unsubscribe function
        return () => {
            const listeners = this.listeners.get(event);
            if (listeners) {
                const index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
        };
    }

    // Remove listener
    removeListener(event, callback) {
        const listeners = this.listeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    // Notify listeners
    notifyListeners(event, data) {
        const listeners = this.listeners.get(event) || [];
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in realtime listener:', error);
            }
        });
    }

    // Subscribe to specific equipment data
    subscribeToEquipment(unitType, equipmentId, callback) {
        if (!this.isEnabled) return null;

        const channelName = `equipment_${unitType}_${equipmentId}`;
        
        const subscription = supabase
            .channel(channelName)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: TABLES.VIBRATE_DATA,
                filter: `unit_type=eq.${unitType}&equipment_id=eq.${equipmentId}`
            }, (payload) => {
                callback({
                    ...payload,
                    data: this.convertServerToLocal(payload.new || payload.old)
                });
            })
            .subscribe();

        this.subscriptions.set(channelName, subscription);
        
        return () => {
            supabaseHelpers.unsubscribe(subscription);
            this.subscriptions.delete(channelName);
        };
    }

    // Subscribe to unit data
    subscribeToUnit(unitType, callback) {
        if (!this.isEnabled) return null;

        const channelName = `unit_${unitType}`;
        
        const subscription = supabase
            .channel(channelName)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: TABLES.VIBRATE_DATA,
                filter: `unit_type=eq.${unitType}`
            }, (payload) => {
                callback({
                    ...payload,
                    data: this.convertServerToLocal(payload.new || payload.old)
                });
            })
            .subscribe();

        this.subscriptions.set(channelName, subscription);
        
        return () => {
            supabaseHelpers.unsubscribe(subscription);
            this.subscriptions.delete(channelName);
        };
    }

    // Get connection status
    getConnectionStatus() {
        return {
            isEnabled: this.isEnabled,
            isAuthenticated: authService.isAuthenticated(),
            activeSubscriptions: this.subscriptions.size,
            subscriptions: Array.from(this.subscriptions.keys())
        };
    }

    // Manually trigger sync check
    async triggerSyncCheck() {
        if (!this.isEnabled || !authService.isAuthenticated()) return;

        try {
            // Check for any pending local data
            const dataService = await import('./dataService.js');
            const pendingData = await dataService.default.getFromLocal({ syncStatus: 'pending' });
            
            if (pendingData.length > 0) {
                this.notifyListeners('sync_needed', {
                    pendingCount: pendingData.length
                });
                
                this.showDataChangeNotification(
                    `${pendingData.length} رکورد در انتظار همگام‌سازی`, 
                    'info'
                );
            }
        } catch (error) {
            console.error('Error checking sync status:', error);
        }
    }

    // Enable/disable notifications
    setNotifications(enabled) {
        const settings = JSON.parse(localStorage.getItem('vibrate_settings') || '{}');
        settings.notificationsEnabled = enabled;
        localStorage.setItem('vibrate_settings', JSON.stringify(settings));
    }
}

// Create singleton instance
const realtimeService = new RealtimeService();

export default realtimeService;