'use client';

/**
 * FHE Validation Helpers
 * 
 * Provides utilities for validating encrypted values and encryption operations.
 * Useful for debugging and ensuring data integrity.
 */

/**
 * Result of a validation operation
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validate a single encrypted value
 */
export function validateEncryptedValue(
    value: string | bigint | number,
    fieldName?: string
): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const prefix = fieldName ? `${fieldName}: ` : '';

    if (value === null || value === undefined) {
        errors.push(`${prefix}Value is null or undefined`);
        return { valid: false, errors, warnings };
    }

    if (typeof value === 'string') {
        // Validate hex string format
        if (!value.startsWith('0x')) {
            errors.push(`${prefix}Missing 0x prefix`);
        }

        if (!/^0x[0-9a-fA-F]*$/.test(value)) {
            errors.push(`${prefix}Contains invalid hex characters`);
        }

        const expectedLength = 66; // 0x + 64 hex chars for 256-bit
        if (value.length !== expectedLength) {
            errors.push(
                `${prefix}Invalid length: ${value.length} (expected ${expectedLength})`
            );
        }
    } else if (typeof value === 'bigint') {
        // Validate BigInt
        if (value < 0n) {
            errors.push(`${prefix}BigInt should be positive`);
        }

        // Check if it's reasonably sized (should fit in 256-bit)
        const max256Bit = (1n << 256n) - 1n;
        if (value > max256Bit) {
            warnings.push(`${prefix}BigInt exceeds 256-bit range`);
        }
    } else if (typeof value === 'number') {
        if (!Number.isInteger(value)) {
            errors.push(`${prefix}Number should be integer`);
        }
        if (value < 0) {
            errors.push(`${prefix}Number should be positive`);
        }
    } else {
        errors.push(`${prefix}Invalid type: ${typeof value}`);
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Validate an object of encrypted values
 */
export function validateEncryptedObject(
    values: Record<string, unknown>
): Record<string, ValidationResult> {
    const results: Record<string, ValidationResult> = {};

    for (const [key, value] of Object.entries(values)) {
        results[key] = validateEncryptedValue(value as string | bigint | number, key);
    }

    return results;
}

/**
 * Check if a value is a valid ciphertext format
 */
export function isValidCiphertext(value: unknown): boolean {
    if (typeof value === 'string') {
        return /^0x[0-9a-fA-F]{64}$/.test(value);
    }
    if (typeof value === 'bigint') {
        return value >= 0n && value <= ((1n << 256n) - 1n);
    }
    return false;
}

/**
 * Convert validated value to contract-compatible format
 */
export function toContractValue(
    value: string | bigint | number
): bigint {
    try {
        if (typeof value === 'bigint') {
            return value;
        }
        if (typeof value === 'string') {
            return BigInt(value);
        }
        if (typeof value === 'number') {
            return BigInt(value);
        }
        throw new Error(`Cannot convert type ${typeof value} to BigInt`);
    } catch (error) {
        throw new Error(
            `Failed to convert value to BigInt: ${error instanceof Error ? error.message : String(error)}`
        );
    }
}

/**
 * Validate and convert entire order object
 */
export interface OrderValues {
    amount: string | bigint | number;
    duration: string | bigint | number;
    direction: string | bigint | number;
}

export interface ContractOrderValues {
    amount: bigint;
    duration: bigint;
    direction: bigint;
}

export function validateAndConvertOrder(
    order: Record<string, unknown>
): {
    valid: boolean;
    data?: ContractOrderValues;
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];
    const data: Partial<ContractOrderValues> = {};

    const requiredFields = ['amount', 'duration', 'direction'] as const;

    for (const field of requiredFields) {
        if (!(field in order)) {
            errors.push(`Missing required field: ${field}`);
            continue;
        }

        const validation = validateEncryptedValue(order[field] as string | bigint | number, field);
        if (!validation.valid) {
            errors.push(...validation.errors);
        }
        warnings.push(...validation.warnings);

        try {
            data[field] = toContractValue(order[field] as string | bigint | number);
        } catch (error) {
            errors.push(
                `Failed to convert ${field}: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    if (errors.length > 0) {
        return { valid: false, errors, warnings };
    }

    return {
        valid: true,
        data: data as ContractOrderValues,
        errors,
        warnings,
    };
}

/**
 * Compare two encrypted values (for testing)
 */
export function compareEncryptedValues(
    value1: string | bigint | number,
    value2: string | bigint | number
): {
    equal: boolean;
    value1Type: string;
    value2Type: string;
    value1Hex?: string;
    value2Hex?: string;
} {
    return {
        equal: String(value1) === String(value2),
        value1Type: typeof value1,
        value2Type: typeof value2,
        value1Hex: typeof value1 === 'string' ? value1 : `0x${BigInt(value1 as number | bigint).toString(16)}`,
        value2Hex: typeof value2 === 'string' ? value2 : `0x${BigInt(value2 as number | bigint).toString(16)}`,
    };
}

/**
 * Get size information about encrypted values
 */
export interface SizeInfo {
    stringLength: number;
    byteLength: number;
    bitLength: number;
    hexCharacters: number;
}

export function getEncryptedValueSize(value: string | bigint | number): SizeInfo {
    const hexStr = typeof value === 'string'
        ? value
        : `0x${BigInt(value as number | bigint).toString(16).padStart(64, '0')}`;

    return {
        stringLength: hexStr.length,
        byteLength: (hexStr.length - 2) / 2, // -2 for 0x prefix
        bitLength: 256, // Mock FHE uses 256-bit ciphertexts
        hexCharacters: hexStr.length - 2,
    };
}

/**
 * Format validation results nicely
 */
export function formatValidationResult(
    result: ValidationResult,
    fieldName: string = 'Value'
): string {
    let output = `${fieldName}: ${result.valid ? '✓ VALID' : '✗ INVALID'}\n`;

    if (result.errors.length > 0) {
        output += `\nErrors:\n`;
        result.errors.forEach(err => {
            output += `  - ${err}\n`;
        });
    }

    if (result.warnings.length > 0) {
        output += `\nWarnings:\n`;
        result.warnings.forEach(warn => {
            output += `  - ${warn}\n`;
        });
    }

    return output;
}

/**
 * Validate encryption operation success
 */
export interface EncryptionOperationResult {
    success: boolean;
    duration: number; // milliseconds
    valueSize?: SizeInfo;
    errors: string[];
}

export function validateEncryptionOperation(
    success: boolean,
    duration: number,
    encryptedValue?: string | bigint | number
): EncryptionOperationResult {
    const errors: string[] = [];

    if (!success) {
        errors.push('Encryption operation failed');
    }

    if (duration < 0) {
        errors.push('Duration cannot be negative');
    }

    if (duration > 30000) {
        errors.push('Encryption took longer than 30 seconds (possible timeout)');
    }

    if (duration < 50) {
        errors.push('Encryption completed suspiciously fast (< 50ms)');
    }

    let valueSize: SizeInfo | undefined;
    if (encryptedValue !== undefined) {
        const validation = validateEncryptedValue(encryptedValue);
        if (!validation.valid) {
            errors.push(`Invalid encrypted value: ${validation.errors.join(', ')}`);
        }
        valueSize = getEncryptedValueSize(encryptedValue);
    }

    return {
        success: success && errors.length === 0,
        duration,
        valueSize,
        errors,
    };
}

/**
 * Batch validation with detailed reporting
 */
export interface BatchValidationReport {
    totalItems: number;
    validItems: number;
    invalidItems: number;
    errorCount: number;
    warningCount: number;
    details: Record<string, ValidationResult>;
}

export function validateBatch(
    items: Record<string, unknown>
): BatchValidationReport {
    const details = validateEncryptedObject(items);
    const results = Object.values(details);

    const validItems = results.filter(r => r.valid).length;
    const invalidItems = results.filter(r => !r.valid).length;
    const errorCount = results.reduce((sum, r) => sum + r.errors.length, 0);
    const warningCount = results.reduce((sum, r) => sum + r.warnings.length, 0);

    return {
        totalItems: Object.keys(items).length,
        validItems,
        invalidItems,
        errorCount,
        warningCount,
        details,
    };
}

/**
 * Export validation utilities to global scope (for console debugging)
 */
if (typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalObj = window as any;
    globalObj.FHE_VALIDATE = {
        value: validateEncryptedValue,
        object: validateEncryptedObject,
        isCiphertext: isValidCiphertext,
        toContractValue,
        order: validateAndConvertOrder,
        compare: compareEncryptedValues,
        size: getEncryptedValueSize,
        operation: validateEncryptionOperation,
        batch: validateBatch,
        format: formatValidationResult,
    };
}
