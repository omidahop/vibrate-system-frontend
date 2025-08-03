import { APP_CONFIG, VALIDATION_RULES } from './constants.js';

export class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

export const validators = {
    // Parameter validation
    parameter: {
        value(value, parameterId) {
            if (!value && value !== 0) {
                throw new ValidationError('مقدار الزامی است', 'value');
            }
            
            const num = parseFloat(value);
            if (isNaN(num)) {
                throw new ValidationError('مقدار باید عدد باشد', 'value');
            }
            
            if (num < 0) {
                throw new ValidationError('مقدار نمی‌تواند منفی باشد', 'value');
            }
            
            const parameter = APP_CONFIG.parameters.find(p => p.id === parameterId);
            if (!parameter) {
                throw new ValidationError('پارامتر نامعتبر', 'parameterId');
            }
            
            const maxValue = parameter.maxValue || (parameter.type === 'velocity' ? 20 : 2);
            if (num > maxValue) {
                throw new ValidationError(`حداکثر مقدار ${maxValue} است`, 'value');
            }
            
            // Check decimal places
            const decimalPlaces = (num.toString().split('.')[1] || '').length;
            if (decimalPlaces > VALIDATION_RULES.parameters.maxDecimalPlaces) {
                throw new ValidationError(
                    `حداکثر ${VALIDATION_RULES.parameters.maxDecimalPlaces} رقم اعشار مجاز است`, 
                    'value'
                );
            }
            
            return num;
        }
    },
    
    // User validation
    user: {
        name(name) {
            if (!name || typeof name !== 'string') {
                throw new ValidationError('نام الزامی است', 'name');
            }
            
            const trimmedName = name.trim();
            if (trimmedName.length < VALIDATION_RULES.user.nameMinLength) {
                throw new ValidationError(
                    `نام باید حداقل ${VALIDATION_RULES.user.nameMinLength} کاراکتر باشد`, 
                    'name'
                );
            }
            
            if (trimmedName.length > VALIDATION_RULES.user.nameMaxLength) {
                throw new ValidationError(
                    `نام نباید بیشتر از ${VALIDATION_RULES.user.nameMaxLength} کاراکتر باشد`, 
                    'name'
                );
            }
            
            return trimmedName;
        },
        
        email(email) {
            if (!email || typeof email !== 'string') {
                throw new ValidationError('ایمیل الزامی است', 'email');
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new ValidationError('فرمت ایمیل نامعتبر است', 'email');
            }
            
            return email.toLowerCase();
        },
        
        password(password) {
            if (!password || typeof password !== 'string') {
                throw new ValidationError('رمز عبور الزامی است', 'password');
            }
            
            if (password.length < 6) {
                throw new ValidationError('رمز عبور باید حداقل ۶ کاراکتر باشد', 'password');
            }
            
            return password;
        },
        
        role(role) {
            const validRoles = ['operator', 'technician', 'engineer', 'supervisor'];
            if (!validRoles.includes(role)) {
                throw new ValidationError('نقش کاربری نامعتبر است', 'role');
            }
            
            return role;
        }
    },
    
    // Equipment validation
    equipment: {
        id(equipmentId) {
            if (!equipmentId) {
                throw new ValidationError('شناسه تجهیز الزامی است', 'equipmentId');
            }
            
            const equipment = APP_CONFIG.equipments.find(e => e.id === equipmentId);
            if (!equipment) {
                throw new ValidationError('تجهیز نامعتبر است', 'equipmentId');
            }
            
            return equipmentId;
        }
    },
    
    // Unit validation
    unit: {
        type(unitType) {
            if (!unitType) {
                throw new ValidationError('نوع واحد الزامی است', 'unitType');
            }
            
            const validUnits = ['DRI1', 'DRI2'];
            if (!validUnits.includes(unitType)) {
                throw new ValidationError('نوع واحد نامعتبر است', 'unitType');
            }
            
            return unitType;
        }
    },
    
    // Date validation
    date: {
        measurementDate(date) {
            if (!date) {
                throw new ValidationError('تاریخ اندازه‌گیری الزامی است', 'date');
            }
            
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
                throw new ValidationError('فرمت تاریخ نامعتبر است', 'date');
            }
            
            // Check if date is not in the future
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            dateObj.setHours(0, 0, 0, 0);
            
            if (dateObj > today) {
                throw new ValidationError('تاریخ نمی‌تواند در آینده باشد', 'date');
            }
            
            // Check if date is not too old (e.g., more than 1 year ago)
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            oneYearAgo.setHours(0, 0, 0, 0);
            
            if (dateObj < oneYearAgo) {
                throw new ValidationError('تاریخ نمی‌تواند بیشتر از یک سال پیش باشد', 'date');
            }
            
            return date;
        }
    },
    
    // Notes validation
    notes: {
        content(notes) {
            if (!notes) return '';
            
            if (typeof notes !== 'string') {
                throw new ValidationError('یادداشت باید متن باشد', 'notes');
            }
            
            if (notes.length > VALIDATION_RULES.notes.maxLength) {
                throw new ValidationError(
                    `یادداشت نباید بیشتر از ${VALIDATION_RULES.notes.maxLength} کاراکتر باشد`, 
                    'notes'
                );
            }
            
            return notes.trim();
        }
    },
    
    // Invite token validation
    invite: {
        token(token) {
            if (!token || typeof token !== 'string') {
                throw new ValidationError('توکن دعوت نامعتبر است', 'token');
            }
            
            // Basic UUID format check
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(token)) {
                throw new ValidationError('فرمت توکن دعوت نامعتبر است', 'token');
            }
            
            return token;
        }
    },
    
    // Settings validation
    settings: {
        theme(theme) {
            const validThemes = ['light', 'dark'];
            if (!validThemes.includes(theme)) {
                throw new ValidationError('تم نامعتبر است', 'theme');
            }
            return theme;
        },
        
        color(color) {
            if (!color || typeof color !== 'string') {
                throw new ValidationError('رنگ الزامی است', 'color');
            }
            
            // Basic hex color validation
            const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
            if (!hexColorRegex.test(color)) {
                throw new ValidationError('فرمت رنگ نامعتبر است', 'color');
            }
            
            return color;
        },
        
        threshold(value) {
            const num = parseFloat(value);
            if (isNaN(num) || num < 1 || num > 100) {
                throw new ValidationError('آستانه باید بین ۱ تا ۱۰۰ باشد', 'threshold');
            }
            return num;
        },
        
        timeRange(value) {
            const num = parseInt(value);
            if (isNaN(num) || num < 1 || num > 365) {
                throw new ValidationError('بازه زمانی باید بین ۱ تا ۳۶۵ روز باشد', 'timeRange');
            }
            return num;
        }
    }
};

// Batch validation for complex objects
export const batchValidators = {
    vibrateDataEntry(data) {
        const errors = [];
        
        try {
            validators.unit.type(data.unitType);
        } catch (error) {
            errors.push(error);
        }
        
        try {
            validators.equipment.id(data.equipmentId);
        } catch (error) {
            errors.push(error);
        }
        
        try {
            validators.date.measurementDate(data.measurementDate);
        } catch (error) {
            errors.push(error);
        }
        
        try {
            validators.notes.content(data.notes);
        } catch (error) {
            errors.push(error);
        }
        
        // Validate parameters
        if (!data.parameters || typeof data.parameters !== 'object') {
            errors.push(new ValidationError('پارامترها الزامی است', 'parameters'));
        } else {
            for (const [parameterId, value] of Object.entries(data.parameters)) {
                try {
                    validators.parameter.value(value, parameterId);
                } catch (error) {
                    error.field = `parameters.${parameterId}`;
                    errors.push(error);
                }
            }
        }
        
        if (errors.length > 0) {
            throw errors;
        }
        
        return true;
    },
    
    userRegistration(data) {
        const errors = [];
        
        try {
            validators.user.name(data.name);
        } catch (error) {
            errors.push(error);
        }
        
        try {
            validators.user.email(data.email);
        } catch (error) {
            errors.push(error);
        }
        
        try {
            validators.user.password(data.password);
        } catch (error) {
            errors.push(error);
        }
        
        try {
            validators.user.role(data.role);
        } catch (error) {
            errors.push(error);
        }
        
        try {
            validators.invite.token(data.inviteToken);
        } catch (error) {
            errors.push(error);
        }
        
        if (errors.length > 0) {
            throw errors;
        }
        
        return true;
    }
};