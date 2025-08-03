// Simple reactive state management without React
class StateManager {
    constructor(initialState) {
        this.state = initialState;
        this.listeners = [];
    }

    setState(newState) {
        const prevState = this.state;
        this.state = typeof newState === 'function' ? newState(prevState) : newState;
        
        this.listeners.forEach(listener => {
            try {
                listener(this.state, prevState);
            } catch (error) {
                console.error('Error in state listener:', error);
            }
        });
    }

    subscribe(listener) {
        this.listeners.push(listener);
        
        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    getState() {
        return this.state;
    }
}

// Simple useState hook equivalent
export function useState(initialValue) {
    const manager = new StateManager(initialValue);
    
    const setState = (newValue) => {
        manager.setState(newValue);
    };

    return [manager.getState(), setState, manager.subscribe.bind(manager)];
}

// Simple useEffect hook equivalent
export function useEffect(effect, dependencies = []) {
    let cleanup;
    let prevDeps = [];

    const runEffect = () => {
        // Check if dependencies changed
        const depsChanged = dependencies.length === 0 || 
            dependencies.some((dep, index) => dep !== prevDeps[index]);

        if (depsChanged) {
            // Cleanup previous effect
            if (cleanup && typeof cleanup === 'function') {
                cleanup();
            }

            // Run effect
            cleanup = effect();
            prevDeps = [...dependencies];
        }
    };

    // Run effect initially
    runEffect();

    // Return cleanup function
    return () => {
        if (cleanup && typeof cleanup === 'function') {
            cleanup();
        }
    };
}

// Simple component state management
export class Component {
    constructor(props = {}) {
        this.props = props;
        this.state = {};
        this.mounted = false;
        this.effects = [];
        this.element = null;
    }

    setState(newState, callback) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...newState };
        
        if (this.mounted) {
            this.render();
            if (callback) callback();
        }
    }

    mount(container) {
        this.mounted = true;
        this.element = this.render();
        
        if (typeof container === 'string') {
            container = document.getElementById(container);
        }
        
        if (container && this.element) {
            container.appendChild(this.element);
        }
        
        // Run effects
        this.effects.forEach(effect => effect());
        
        return this.element;
    }

    unmount() {
        this.mounted = false;
        
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        // Cleanup effects would go here
        this.effects = [];
    }

    render() {
        // Override in subclasses
        return document.createElement('div');
    }
}

// Event emitter for component communication
export class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        
        // Return unsubscribe function
        return () => {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        };
    }

    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }

    emit(event, ...args) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in event listener for "${event}":`, error);
                }
            });
        }
    }
}

// Global event bus for cross-component communication
export const eventBus = new EventEmitter();

// Utility for creating reactive elements
export function createReactiveElement(tagName, initialProps = {}) {
    const element = document.createElement(tagName);
    const state = new StateManager(initialProps);

    // Apply initial props
    Object.entries(initialProps).forEach(([key, value]) => {
        if (key.startsWith('on')) {
            // Event listener
            const eventName = key.slice(2).toLowerCase();
            element.addEventListener(eventName, value);
        } else if (key === 'className') {
            element.className = value;
        } else if (key === 'innerHTML') {
            element.innerHTML = value;
        } else {
            element.setAttribute(key, value);
        }
    });

    // Add update method
    element.updateProps = (newProps) => {
        state.setState(newProps);
        
        Object.entries(newProps).forEach(([key, value]) => {
            if (key.startsWith('on')) {
                // Remove old listener and add new one
                const eventName = key.slice(2).toLowerCase();
                element.removeEventListener(eventName, state.getState()[key]);
                element.addEventListener(eventName, value);
            } else if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else {
                element.setAttribute(key, value);
            }
        });
    };

    return element;
}

// Template literal processor for HTML
export function html(strings, ...values) {
    let result = '';
    
    strings.forEach((string, i) => {
        result += string;
        if (i < values.length) {
            result += values[i];
        }
    });
    
    return result;
}

// Create element from HTML string
export function createElement(htmlString) {
    const template = document.createElement('template');
    template.innerHTML = htmlString.trim();
    return template.content.firstChild;
}

// Batch DOM updates
export function batchUpdate(callback) {
    if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(callback);
    } else {
        setTimeout(callback, 0);
    }
}

// Debounce utility
export function debounce(func, wait) {
    let timeout;
    
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle utility
export function throttle(func, wait) {
    let inThrottle;
    
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            
            setTimeout(() => {
                inThrottle = false;
            }, wait);
        }
    };
}