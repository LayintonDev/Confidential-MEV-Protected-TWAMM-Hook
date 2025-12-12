'use client';

/**
 * FHE Debug Utilities
 * 
 * Provides debugging and monitoring tools for FHE operations:
 * - Performance timing analysis
 * - Encrypted value inspection
 * - Failure simulation for error handling
 * - Statistics tracking
 * 
 * Enable via: window.FHE_DEBUG = true in console
 */

export interface FHEDebugStats {
    totalEncryptions: number;
    successfulEncryptions: number;
    failedEncryptions: number;
    totalEncryptionTime: number;
    averageEncryptionTime: number;
    minEncryptionTime: number;
    maxEncryptionTime: number;
    lastEncryptionTime: number;
}

export interface FHEDebugConfig {
    enabled: boolean;
    verbose: boolean;
    simulateFailures: boolean;
    failureRate: number; // 0-1, probability of simulating failure
    overrideDelay: number | null; // Override encryption delay (ms)
    trackStats: boolean;
    logCiphertexts: boolean; // Log actual encrypted values (verbose)
}

class FHEDebugger {
    private config: FHEDebugConfig = {
        enabled: false,
        verbose: false,
        simulateFailures: false,
        failureRate: 0,
        overrideDelay: null,
        trackStats: true,
        logCiphertexts: false,
    };

    private stats: FHEDebugStats = {
        totalEncryptions: 0,
        successfulEncryptions: 0,
        failedEncryptions: 0,
        totalEncryptionTime: 0,
        averageEncryptionTime: 0,
        minEncryptionTime: Infinity,
        maxEncryptionTime: 0,
        lastEncryptionTime: 0,
    };

    private encryptionTimes: number[] = [];

    constructor() {
        // Check if debug mode is enabled globally
        if (typeof window !== 'undefined') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const globalDebug = (window as any).FHE_DEBUG;
            if (globalDebug === true) {
                this.config.enabled = true;
                this.config.verbose = true;
                console.log('[FHE DEBUG] Debug mode enabled. Use FHE_DEBUG_CONFIG to configure.');
                this.printConfig();
            }
        }
    }

    /**
     * Enable debug mode
     */
    enable(verbose = false): void {
        this.config.enabled = true;
        this.config.verbose = verbose;
        console.log('[FHE DEBUG] Debug mode enabled');
        if (verbose) {
            this.printConfig();
        }
    }

    /**
     * Disable debug mode
     */
    disable(): void {
        this.config.enabled = false;
        console.log('[FHE DEBUG] Debug mode disabled');
    }

    /**
     * Update debug configuration
     */
    configure(partial: Partial<FHEDebugConfig>): void {
        this.config = { ...this.config, ...partial };
        console.log('[FHE DEBUG] Configuration updated:', this.config);
    }

    /**
     * Get current configuration
     */
    getConfig(): FHEDebugConfig {
        return { ...this.config };
    }

    /**
     * Check if should simulate failure
     */
    shouldSimulateFailure(): boolean {
        if (!this.config.simulateFailures) return false;
        return Math.random() < this.config.failureRate;
    }

    /**
     * Get effective encryption delay
     */
    getEncryptionDelay(): number {
        if (this.config.overrideDelay !== null) {
            return this.config.overrideDelay;
        }
        return Math.random() * 1000 + 500; // Default: 500-1500ms
    }

    /**
     * Track encryption operation
     */
    trackEncryption(
        field: string,
        startTime: number,
        success: boolean,
        ciphertext?: string | number
    ): void {
        if (!this.config.trackStats) return;

        const duration = Date.now() - startTime;
        this.encryptionTimes.push(duration);

        this.stats.totalEncryptions++;
        this.stats.lastEncryptionTime = duration;

        if (success) {
            this.stats.successfulEncryptions++;
        } else {
            this.stats.failedEncryptions++;
        }

        // Update statistics
        this.stats.totalEncryptionTime += duration;
        this.stats.averageEncryptionTime = this.stats.totalEncryptionTime / this.stats.totalEncryptions;
        this.stats.minEncryptionTime = Math.min(this.stats.minEncryptionTime, duration);
        this.stats.maxEncryptionTime = Math.max(this.stats.maxEncryptionTime, duration);

        if (this.config.verbose) {
            console.log(`[FHE DEBUG] Encrypted ${field}: ${duration}ms ${success ? '✓' : '✗'}`, {
                ciphertext: this.config.logCiphertexts ? ciphertext : '***',
            });
        }
    }

    /**
     * Get statistics
     */
    getStats(): FHEDebugStats {
        return { ...this.stats };
    }

    /**
     * Print statistics nicely
     */
    printStats(): void {
        const stats = this.stats;
        console.log('[FHE DEBUG] Encryption Statistics:');
        console.table({
            'Total Encryptions': stats.totalEncryptions,
            'Successful': stats.successfulEncryptions,
            'Failed': stats.failedEncryptions,
            'Success Rate': `${((stats.successfulEncryptions / stats.totalEncryptions) * 100).toFixed(1)}%`,
            'Average Time': `${stats.averageEncryptionTime.toFixed(1)}ms`,
            'Min Time': `${stats.minEncryptionTime.toFixed(1)}ms`,
            'Max Time': `${stats.maxEncryptionTime.toFixed(1)}ms`,
            'Last Time': `${stats.lastEncryptionTime.toFixed(1)}ms`,
        });
    }

    /**
     * Print configuration nicely
     */
    printConfig(): void {
        console.log('[FHE DEBUG] Current Configuration:');
        console.table(this.config);
    }

    /**
     * Reset statistics
     */
    resetStats(): void {
        this.stats = {
            totalEncryptions: 0,
            successfulEncryptions: 0,
            failedEncryptions: 0,
            totalEncryptionTime: 0,
            averageEncryptionTime: 0,
            minEncryptionTime: Infinity,
            maxEncryptionTime: 0,
            lastEncryptionTime: 0,
        };
        this.encryptionTimes = [];
        console.log('[FHE DEBUG] Statistics reset');
    }

    /**
     * Get detailed encryption timing history
     */
    getTimingHistory(): number[] {
        return [...this.encryptionTimes];
    }

    /**
     * Validate ciphertext format
     */
    validateCiphertext(ciphertext: string | bigint): { valid: boolean; issues: string[] } {
        const issues: string[] = [];

        if (typeof ciphertext === 'string') {
            // Check hex format
            if (!ciphertext.startsWith('0x')) {
                issues.push('Missing 0x prefix');
            }
            // Check length (should be 256-bit = 64 hex chars + 2 for 0x)
            if (ciphertext.length !== 66) {
                issues.push(`Incorrect length: ${ciphertext.length} (expected 66)`);
            }
            // Check valid hex
            if (!/^0x[0-9a-fA-F]*$/.test(ciphertext)) {
                issues.push('Contains invalid hex characters');
            }
        } else if (typeof ciphertext === 'bigint') {
            // BigInt is valid, but should be positive
            if (ciphertext < 0n) {
                issues.push('BigInt should be positive');
            }
        } else {
            issues.push(`Invalid type: ${typeof ciphertext}`);
        }

        return {
            valid: issues.length === 0,
            issues,
        };
    }

    /**
     * Export statistics as JSON
     */
    exportStats(): string {
        return JSON.stringify(this.getStats(), null, 2);
    }

    /**
     * Export timing data as CSV
     */
    exportTimingCSV(): string {
        const header = 'Index,Duration (ms)\n';
        const rows = this.encryptionTimes
            .map((time, idx) => `${idx + 1},${time}`)
            .join('\n');
        return header + rows;
    }
}

// Create singleton instance
export const fheDebugger = new FHEDebugger();

/**
 * Setup global debug interface
 * Make available as window.FHE_DEBUG_CONFIG in console
 */
if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalObj = window as any;
    globalObj.FHE_DEBUG_CONFIG = {
        enable: () => fheDebugger.enable(true),
        disable: () => fheDebugger.disable(),
        config: (cfg: Partial<FHEDebugConfig>) => fheDebugger.configure(cfg),
        stats: () => fheDebugger.printStats(),
        config_show: () => fheDebugger.printConfig(),
        getStats: () => fheDebugger.getStats(),
        reset: () => fheDebugger.resetStats(),
        validate: (ct: string | bigint) => fheDebugger.validateCiphertext(ct),
        export: () => ({ stats: fheDebugger.exportStats(), timing: fheDebugger.exportTimingCSV() }),
    };
    globalObj.FHE_DEBUG = fheDebugger;
}
