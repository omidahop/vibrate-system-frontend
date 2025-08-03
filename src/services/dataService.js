import { supabase, supabaseHelpers, handleSupabaseError, TABLES } from './supabaseClient.js';
import authService from './authService.js';
import { APP_CONFIG, DEFAULT_SETTINGS } from '../utils/constants.js';
import { storageUtils, dateUtils } from '../utils/helpers.js';
import { batchValidators } from '../utils/validations.js';

class DataService {
    constructor() {
        this.localDB = null;
        this.isInitialized = false;
        this.syncInProgress = false;
        this.initializeLocalDB();
    }

    // Initialize IndexedDB for offline storage
    async initializeLocalDB() {
        try {
            const { openDB } = await import('https://unpkg.com/idb@7/build/index.js');
            
            this.localDB = await openDB(APP_CONFIG.dbName, APP_CONFIG.dbVersion, {
                upgrade(db) {
                    // Vibrate data store
                    if (!db.objectStoreNames.contains('vibrateData')) {
                        const vibrateStore = db.createObjectStore('vibrateData', { 
                            keyPath: 'id', 
                            autoIncrement: true 
                        });
                        vibrateStore.createIndex('unit', 'unit');
                        vibrateStore.createIndex('equipment', 'equipment');
                        vibrateStore.createIndex('date', 'date');
                        vibrateStore.createIndex('syncStatus', 'syncStatus');
                        vibrateStore.createIndex('unitEquipmentDate', ['unit', 'equipment', 'date'], { unique: false });
                    }
                    
                    // Settings store
                    if (!db.objectStoreNames.contains('settings')) {
                        db.createObjectStore('settings', { keyPath: 'key' });
                    }
                    
                    // User store
                    if (!db.objectStoreNames.contains('users')) {
                        db.createObjectStore('users', { keyPath: 'id' });
                    }
                }
            });
            
            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing local DB:', error);
        }
    }

    // Save data to local database
    async saveToLocal(data) {
        try {
            if (!this.localDB) await this.initializeLocalDB();
            
            const dataToSave = {
                ...data,
                id: `${data.unit}_${data.equipment}_${data.date}`,
                userId: authService.getCurrentUser()?.id,
                userName: authService.getCurrentUserProfile()?.full_name || 'نامشخص',
                timestamp: new Date().toISOString(),
                syncStatus: authService.isAuthenticated() ? 'pending' : 'local_only'
            };
            
            await this.localDB.put('vibrateData', dataToSave);
            
            return {
                success: true,
                data: dataToSave
            };
            
        } catch (error) {
            console.error('Error saving to local DB:', error);
            throw new Error('خطا در ذخیره محلی داده‌ها');
        }
    }

    // Get data from local database
    async getFromLocal(filters = {}) {
        try {
            if (!this.localDB) await this.initializeLocalDB();
            
            const tx = this.localDB.transaction('vibrateData', 'readonly');
            let cursor;
            
            if (filters.unit && filters.equipment && filters.date) {
                cursor = await tx.store.index('unitEquipmentDate').openCursor([filters.unit, filters.equipment, filters.date]);
            } else if (filters.unit) {
                cursor = await tx.store.index('unit').openCursor(filters.unit);
            } else if (filters.equipment) {
                cursor = await tx.store.index('equipment').openCursor(filters.equipment);
            } else if (filters.date) {
                cursor = await tx.store.index('date').openCursor(filters.date);
            } else {
                cursor = await tx.store.openCursor();
            }
            
            const results = [];
            while (cursor) {
                const data = cursor.value;
                
                // Apply additional filters
                let include = true;
                
                if (filters.dateFrom && data.date < filters.dateFrom) include = false;
                if (filters.dateTo && data.date > filters.dateTo) include = false;
                if (filters.syncStatus && data.syncStatus !== filters.syncStatus) include = false;
                if (filters.userId && data.userId !== filters.userId) include = false;
                
                if (include) {
                    results.push(data);
                }
                
                cursor = await cursor.continue();
            }
            
            return results;
            
        } catch (error) {
            console.error('Error getting from local DB:', error);
            return [];
        }
    }

    // Sync local data to server
    async syncToServer() {
        if (this.syncInProgress) {
            throw new Error('همگام‌سازی در حال انجام است');
        }
        
        if (!authService.isAuthenticated()) {
            throw new Error('برای همگام‌سازی باید وارد سیستم شوید');
        }

        try {
            this.syncInProgress = true;
            
            // Get pending data
            const pendingData = await this.getFromLocal({ syncStatus: 'pending' });
            
            if (pendingData.length === 0) {
                return {
                    success: true,
                    message: 'هیچ داده‌ای برای همگام‌سازی وجود ندارد',
                    syncedCount: 0
                };
            }

            // Validate data before sync
            const validData = [];
            const errors = [];

            for (const data of pendingData) {
                try {
                    // Convert local format to server format
                    const serverData = {
                        unitType: data.unit,
                        equipmentId: data.equipment,
                        measurementDate: data.date,
                        parameters: data.parameters,
                        notes: data.notes || '',
                        localTimestamp: data.timestamp
                    };
                    
                    batchValidators.vibrateDataEntry(serverData);
                    validData.push({ local: data, server: serverData });
                } catch (error) {
                    errors.push({ data, error: error.message });
                }
            }

            if (validData.length === 0) {
                throw new Error('هیچ داده معتبری برای همگام‌سازی یافت نشد');
            }

            // Send to server
            const { data: syncResult, error: syncError } = await supabase.functions.invoke('sync-local-data', {
                body: { localData: validData.map(item => item.server) }
            });

            if (syncError) throw syncError;

            // Update local sync status
            for (const item of validData) {
                item.local.syncStatus = 'synced';
                item.local.serverTimestamp = new Date().toISOString();
                await this.localDB.put('vibrateData', item.local);
            }

            // Store last sync time
            storageUtils.set(APP_CONFIG.storageKeys.lastSync, new Date().toISOString());

            return {
                success: true,
                message: `${syncResult.successCount} رکورد همگام‌سازی شد`,
                syncedCount: syncResult.successCount,
                errors: syncResult.errors || errors
            };

        } catch (error) {
            console.error('Error syncing to server:', error);
            throw new Error(error.message || 'خطا در همگام‌سازی با سرور');
        } finally {
            this.syncInProgress = false;
        }
    }

    // Get data from server
    async getFromServer(filters = {}) {
        if (!authService.isAuthenticated()) {
            throw new Error('برای دریافت داده‌ها باید وارد سیستم شوید');
        }

        try {
            let query = supabase
                .from(TABLES.VIBRATE_DATA)
                .select(`
                    *,
                    user_profiles!vibrate_data_user_id_fkey(full_name)
                `)
                .order('measurement_date', { ascending: false })
                .order('server_timestamp', { ascending: false });

            // Apply filters
            if (filters.unitType) {
                query = query.eq('unit_type', filters.unitType);
            }
            
            if (filters.equipmentId) {
                query = query.eq('equipment_id', filters.equipmentId);
            }
            
            if (filters.measurementDate) {
                query = query.eq('measurement_date', filters.measurementDate);
            }
            
            if (filters.dateFrom) {
                query = query.gte('measurement_date', filters.dateFrom);
            }
            
            if (filters.dateTo) {
                query = query.lte('measurement_date', filters.dateTo);
            }
            
            if (filters.userId) {
                query = query.eq('user_id', filters.userId);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Convert to local format for consistency
            const localFormat = data.map(item => ({
                id: `${item.unit_type}_${item.equipment_id}_${item.measurement_date}`,
                unit: item.unit_type,
                equipment: item.equipment_id,
                equipmentName: item.equipment_name,
                date: item.measurement_date,
                parameters: item.parameters,
                notes: item.notes,
                userId: item.user_id,
                userName: item.user_profiles?.full_name || 'نامشخص',
                timestamp: item.local_timestamp || item.server_timestamp,
                serverTimestamp: item.server_timestamp,
                syncStatus: 'synced'
            }));

            return localFormat;

        } catch (error) {
            const errorInfo = handleSupabaseError(error, 'دریافت داده‌ها از سرور');
            throw new Error(errorInfo.message);
        }
    }

    // Get combined data (server + local)
    async getData(filters = {}, preferServer = false) {
        try {
            let serverData = [];
            let localData = [];

            // Get server data if authenticated and requested
            if (authService.isAuthenticated() && preferServer) {
                try {
                    serverData = await this.getFromServer(filters);
                } catch (error) {
                    console.warn('Failed to get server data:', error);
                }
            }

            // Get local data
            localData = await this.getFromLocal(filters);

            // If we have server data, filter out synced local data to avoid duplicates
            if (serverData.length > 0) {
                localData = localData.filter(item => item.syncStatus !== 'synced');
            }

            // Combine and sort
            const combinedData = [...serverData, ...localData];
            
            return combinedData.sort((a, b) => {
                // Sort by date (descending), then by timestamp (descending)
                if (a.date !== b.date) {
                    return new Date(b.date) - new Date(a.date);
                }
                return new Date(b.timestamp) - new Date(a.timestamp);
            });

        } catch (error) {
            console.error('Error getting combined data:', error);
            throw error;
        }
    }

    // Save data (with automatic sync if authenticated)
    async saveData(data) {
        try {
            // Validate data
            const validatedData = {
                unitType: data.unit,
                equipmentId: data.equipment,
                measurementDate: data.date,
                parameters: data.parameters,
                notes: data.notes || ''
            };
            
            batchValidators.vibrateDataEntry(validatedData);

            // Save to local first
            const localResult = await this.saveToLocal(data);

            // If authenticated and auto-sync is enabled, try to sync immediately
            if (authService.isAuthenticated()) {
                const settings = await this.getUserSettings();
                if (settings?.syncOnDataEntry) {
                    try {
                        await this.syncToServer();
                    } catch (error) {
                        console.warn('Auto-sync failed:', error);
                        // Continue - data is saved locally
                    }
                }
            }

            return localResult;

        } catch (error) {
            if (Array.isArray(error)) {
                // Validation errors
                const messages = error.map(e => e.message).join(', ');
                throw new Error(`خطاهای اعتبارسنجی: ${messages}`);
            }
            throw error;
        }
    }

    // Delete data
    async deleteData(dataId) {
        try {
            // Delete from local
            if (this.localDB) {
                await this.localDB.delete('vibrateData', dataId);
            }

            // If authenticated, delete from server too
            if (authService.isAuthenticated()) {
                const [unit, equipment, date] = dataId.split('_');
                const { error } = await supabase
                    .from(TABLES.VIBRATE_DATA)
                    .delete()
                    .eq('unit_type', unit)
                    .eq('equipment_id', equipment)
                    .eq('measurement_date', date)
                    .eq('user_id', authService.getCurrentUser().id);

                if (error) throw error;
            }

            return {
                success: true,
                message: 'داده حذف شد'
            };

        } catch (error) {
            const errorInfo = handleSupabaseError(error, 'حذف داده');
            throw new Error(errorInfo.message);
        }
    }

    // Get user settings
    async getUserSettings() {
        const userId = authService.getCurrentUser()?.id;
        if (!userId) {
            return storageUtils.get(APP_CONFIG.storageKeys.settings, DEFAULT_SETTINGS);
        }

        try {
            const settings = await supabaseHelpers.getUserSettings(userId);
            return settings;
        } catch (error) {
            console.warn('Failed to get user settings from server:', error);
            return storageUtils.get(APP_CONFIG.storageKeys.settings, DEFAULT_SETTINGS);
        }
    }

    // Save user settings
    async saveUserSettings(settings) {
        const userId = authService.getCurrentUser()?.id;
        
        // Save locally first
        storageUtils.set(APP_CONFIG.storageKeys.settings, settings);

        // If authenticated, save to server
        if (userId) {
            try {
                const { error } = await supabase
                    .from(TABLES.USER_SETTINGS)
                    .upsert({
                        user_id: userId,
                        ...settings
                    });

                if (error) throw error;

                return {
                    success: true,
                    message: 'تنظیمات ذخیره شد'
                };

            } catch (error) {
                console.warn('Failed to save settings to server:', error);
                return {
                    success: true,
                    message: 'تنظیمات محلی ذخیره شد'
                };
            }
        }

        return {
            success: true,
            message: 'تنظیمات محلی ذخیره شد'
        };
    }

    // Get sync status
    getSyncStatus() {
        return {
            inProgress: this.syncInProgress,
            lastSync: storageUtils.get(APP_CONFIG.storageKeys.lastSync),
            isAuthenticated: authService.isAuthenticated()
        };
    }

    // Get database statistics
    async getDatabaseStats() {
        try {
            const localData = await this.getFromLocal();
            const serverData = authService.isAuthenticated() ? 
                await this.getFromServer().catch(() => []) : [];

            const stats = {
                local: {
                    totalRecords: localData.length,
                    pendingSync: localData.filter(d => d.syncStatus === 'pending').length,
                    byUnit: {
                        DRI1: localData.filter(d => d.unit === 'DRI1').length,
                        DRI2: localData.filter(d => d.unit === 'DRI2').length
                    }
                },
                server: {
                    totalRecords: serverData.length,
                    byUnit: {
                        DRI1: serverData.filter(d => d.unit === 'DRI1').length,
                        DRI2: serverData.filter(d => d.unit === 'DRI2').length
                    }
                },
                lastSync: storageUtils.get(APP_CONFIG.storageKeys.lastSync)
            };

            if (serverData.length > 0) {
                const recentData = serverData.slice(0, 10);
                stats.server.recentEntries = recentData.map(item => ({
                    unit: item.unit,
                    equipment: item.equipment,
                    date: item.date,
                    userName: item.userName,
                    timestamp: item.serverTimestamp || item.timestamp
                }));
            }

            return stats;

        } catch (error) {
            console.error('Error getting database stats:', error);
            return null;
        }
    }

    // Clear all local data
    async clearLocalData() {
        try {
            if (this.localDB) {
                await this.localDB.clear('vibrateData');
                await this.localDB.clear('settings');
            }
            
            // Clear localStorage
            Object.values(APP_CONFIG.storageKeys).forEach(key => {
                storageUtils.remove(key);
            });

            return {
                success: true,
                message: 'تمام داده‌های محلی پاک شد'
            };

        } catch (error) {
            console.error('Error clearing local data:', error);
            throw new Error('خطا در پاک کردن داده‌های محلی');
        }
    }
}

// Create singleton instance
const dataService = new DataService();

export default dataService;