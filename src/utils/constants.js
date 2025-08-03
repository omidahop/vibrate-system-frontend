// Application Configuration
export const APP_CONFIG = {
    version: '3.0.0',
    dbName: 'VibrateDataDB',
    dbVersion: 4,
    
    // Equipment data with complete configuration
    equipments: [
        { id: 'GB-cp48A', name: 'گیربکس کمپرسور 48A', code: 'GB-cp 48A', icon: 'fas fa-cog', color: '#8b5cf6' },
        { id: 'CP-cp48A', name: 'کمپرسور 48A', code: 'CP-cp 48A', icon: 'fas fa-compress', color: '#06b6d4' },
        { id: 'GB-cp48B', name: 'گیربکس کمپرسور 48B', code: 'GB-cp 48B', icon: 'fas fa-cog', color: '#8b5cf6' },
        { id: 'CP-cp48B', name: 'کمپرسور 48B', code: 'CP-cp 48B', icon: 'fas fa-compress', color: '#06b6d4' },
        { id: 'GB-cp51', name: 'گیربکس کمپرسور 51', code: 'GB-cp 51', icon: 'fas fa-cog', color: '#8b5cf6' },
        { id: 'CP-cp51', name: 'کمپرسور 51', code: 'CP-cp 51', icon: 'fas fa-compress', color: '#06b6d4' },
        { id: 'GB-cp71', name: 'گیربکس کمپرسور 71', code: 'GB-cp 71', icon: 'fas fa-cog', color: '#8b5cf6' },
        { id: 'CP-cp71', name: 'کمپرسور 71', code: 'CP-cp 71', icon: 'fas fa-compress', color: '#06b6d4' },
        { id: 'CP-cpSGC', name: 'کمپرسور سیل گس', code: 'CP-cp SGC', icon: 'fas fa-compress', color: '#06b6d4' },
        { id: 'FN-fnESF', name: 'فن استک', code: 'FN-fn ESF', icon: 'fas fa-fan', color: '#10b981' },
        { id: 'FN-fnAUX', name: 'فن اگزیلاری', code: 'FN-fn AUX', icon: 'fas fa-fan', color: '#10b981' },
        { id: 'FN-fnMAB', name: 'فن هوای اصلی', code: 'FN-fn MAB', icon: 'fas fa-fan', color: '#10b981' }
    ],
    
    // Parameter data with validation rules
    parameters: [
        { id: 'V1', name: 'سرعت عمودی متصل', code: 'V1', icon: 'fas fa-arrow-up', color: '#ec4899', type: 'velocity', category: 'connected', maxValue: 20, order: 1 },
        { id: 'GV1', name: 'شتاب عمودی متصل', code: 'GV1', icon: 'fas fa-arrow-up', color: '#f59e0b', type: 'acceleration', category: 'connected', maxValue: 2, order: 2 },
        { id: 'H1', name: 'سرعت افقی متصل', code: 'H1', icon: 'fas fa-arrow-right', color: '#ec4899', type: 'velocity', category: 'connected', maxValue: 20, order: 3 },
        { id: 'GH1', name: 'شتاب افقی متصل', code: 'GH1', icon: 'fas fa-arrow-right', color: '#f59e0b', type: 'acceleration', category: 'connected', maxValue: 2, order: 4 },
        { id: 'A1', name: 'سرعت محوری متصل', code: 'A1', icon: 'fas fa-arrows-alt', color: '#ec4899', type: 'velocity', category: 'connected', maxValue: 20, order: 5 },
        { id: 'GA1', name: 'شتاب محوری متصل', code: 'GA1', icon: 'fas fa-arrows-alt', color: '#f59e0b', type: 'acceleration', category: 'connected', maxValue: 2, order: 6 },
        { id: 'V2', name: 'سرعت عمودی آزاد', code: 'V2', icon: 'fas fa-arrow-up', color: '#6366f1', type: 'velocity', category: 'free', maxValue: 20, order: 7 },
        { id: 'GV2', name: 'شتاب عمودی آزاد', code: 'GV2', icon: 'fas fa-arrow-up', color: '#8b5cf6', type: 'acceleration', category: 'free', maxValue: 2, order: 8 },
        { id: 'H2', name: 'سرعت افقی آزاد', code: 'H2', icon: 'fas fa-arrow-right', color: '#6366f1', type: 'velocity', category: 'free', maxValue: 20, order: 9 },
        { id: 'GH2', name: 'شتاب افقی آزاد', code: 'GH2', icon: 'fas fa-arrow-right', color: '#8b5cf6', type: 'acceleration', category: 'free', maxValue: 2, order: 10 },
        { id: 'A2', name: 'سرعت محوری آزاد', code: 'A2', icon: 'fas fa-arrows-alt', color: '#6366f1', type: 'velocity', category: 'free', maxValue: 20, order: 11 },
        { id: 'GA2', name: 'شتاب محوری آزاد', code: 'GA2', icon: 'fas fa-arrows-alt', color: '#8b5cf6', type: 'acceleration', category: 'free', maxValue: 2, order: 12 }
    ],
    
    // Units
    units: [
        { id: 'DRI1', name: 'واحد احیا مستقیم 1', code: 'DRI 1', color: '#3b82f6' },
        { id: 'DRI2', name: 'واحد احیا مستقیم 2', code: 'DRI 2', color: '#ef4444' }
    ],

    // API endpoints
    api: {
        baseUrl: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
        functions: {
            generateInvite: '/functions/v1/generate-invite-link',
            validateInvite: '/functions/v1/validate-invite',
            syncData: '/functions/v1/sync-local-data'
        }
    },

    // Local storage keys
    storageKeys: {
        user: 'vibrate_user',
        settings: 'vibrate_settings',
        localData: 'vibrate_local_data',
        lastSync: 'vibrate_last_sync'
    },

    // Theme colors
    colors: {
        randomColors: [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
            '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
            '#14b8a6', '#f43f5e', '#a855f7', '#22d3ee', '#eab308'
        ]
    }
};

// Default settings
export const DEFAULT_SETTINGS = {
    theme: 'light',
    primaryColor: '#2563eb',
    dri1Color: '#3b82f6',
    dri2Color: '#ef4444',
    equipmentPriority: {},
    parameterPriority: {},
    parameterMode: 'default',
    dataEntryEquipmentPriority: {},
    dataEntryParameterPriority: {},
    dataEntryParameterMode: 'default',
    analysisThreshold: 20,
    analysisTimeRange: 7,
    analysisComparisonDays: 1,
    autoSync: false,
    syncOnDataEntry: false,
    notificationsEnabled: true
};

// Application states
export const APP_STATES = {
    OFFLINE: 'offline',
    ONLINE: 'online',
    SYNCING: 'syncing',
    ERROR: 'error'
};

// User roles
export const USER_ROLES = {
    OPERATOR: 'operator',
    TECHNICIAN: 'technician',
    ENGINEER: 'engineer',
    SUPERVISOR: 'supervisor'
};

// Data validation rules
export const VALIDATION_RULES = {
    parameters: {
        minValue: 0,
        maxDecimalPlaces: 2,
        velocity: { max: 20 },
        acceleration: { max: 2 }
    },
    notes: {
        maxLength: 500
    },
    user: {
        nameMinLength: 2,
        nameMaxLength: 50
    }
};