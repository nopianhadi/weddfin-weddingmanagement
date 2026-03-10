/**
 * Logger Utility
 * Hanya log di development mode, tidak di production
 */

const DEBUG = import.meta.env.DEV;

export const logger = {
    /**
     * Log informasi umum (hanya di development)
     */
    log: (...args: any[]) => {
        if (DEBUG) console.log(...args);
    },

    /**
     * Log warning (hanya di development)
     */
    warn: (...args: any[]) => {
        if (DEBUG) console.warn(...args);
    },

    /**
     * Log error (selalu log, bahkan di production)
     */
    error: (...args: any[]) => {
        console.error(...args);
    },

    /**
     * Log informasi (hanya di development)
     */
    info: (...args: any[]) => {
        if (DEBUG) console.info(...args);
    },

    /**
     * Log debug (hanya di development)
     */
    debug: (...args: any[]) => {
        if (DEBUG) console.debug(...args);
    },
};

export default logger;
