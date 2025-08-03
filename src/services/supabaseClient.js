import { createClient } from '@supabase/supabase-js';
import { APP_CONFIG } from '../utils/constants.js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'vibrate-auth',
        storage: window.localStorage,
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

// Database table names
export const TABLES = {
    USER_PROFILES: 'user_profiles',
    USER_SETTINGS: 'user_settings',
    VIBRATE_DATA: 'vibrate_data',
    DATA_SYNC_LOG: 'data_sync_log',
    INVITE_LINKS: 'invite_links'
};

// Helper functions for common operations
export const supabaseHelpers = {
    // Get current user
    async getCurrentUser() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    },

    // Get user profile
    async getUserProfile(userId) {
        const { data, error } = await supabase
            .from(TABLES.USER_PROFILES)
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        return data;
    },

    // Get user settings
    async getUserSettings(userId) {
        const { data, error } = await supabase
            .from(TABLES.USER_SETTINGS)
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error) throw error;
        return data;
    },

    // Check connection status
    async checkConnection() {
        try {
            const { error } = await supabase.from('user_profiles').select('id').limit(1);
            return !error;
        } catch (error) {
            return false;
        }
    },

    // Subscribe to table changes
    subscribeToTable(table, callback, filters = {}) {
        let subscription = supabase
            .channel(`${table}-changes`)
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: table,
                    ...filters
                }, 
                callback
            )
            .subscribe();

        return subscription;
    },

    // Unsubscribe from changes
    unsubscribe(subscription) {
        if (subscription) {
            supabase.removeChannel(subscription);
        }
    }
};

// Error handling wrapper
export const handleSupabaseError = (error, operation = 'عملیات') => {
    console.error(`Supabase error in ${operation}:`, error);
    
    let message = `خطا در ${operation}`;
    
    if (error?.code === 'PGRST116') {
        message = 'رکوردی یافت نشد';
    } else if (error?.code === '23505') {
        message = 'این رکورد قبلاً وجود دارد';
    } else if (error?.code === '23503') {
        message = 'خطا در ارتباط داده‌ها';
    } else if (error?.message?.includes('JWT')) {
        message = 'خطا در احراز هویت - لطفاً دوباره وارد شوید';
    } else if (error?.message?.includes('network')) {
        message = 'خطا در اتصال به شبکه';
    } else if (error?.message) {
        message = error.message;
    }
    
    return {
        code: error?.code || 'UNKNOWN',
        message,
        originalError: error
    };
};

export default supabase;