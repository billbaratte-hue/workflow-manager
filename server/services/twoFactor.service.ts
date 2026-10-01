/**
 * @file server/services/twoFactor.service.ts
 * Two-Factor Authentication (2FA) Service compliant with RFC 6238 (TOTP) and RFC 4226 (HOTP).
 * Generates cryptographic TOTP secrets, QR codes for authenticator apps (Google Authenticator,
 * Microsoft Authenticator, FreeOTP), verifies 6-digit codes with clock drift tolerance,
 * and manages single-use hashed backup recovery codes (NIS 2 / ANSSI compliance).
 */

import crypto from 'crypto';
import QRCode from 'qrcode';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export interface TwoFactorSetupData {
    secret: string;
    otpauthUrl: string;
    qrCodeDataUrl: string;
    backupCodes: string[];
}

export class TwoFactorService {
    /**
     * Encodes a Buffer to a Base32 string (RFC 4648)
     */
    static base32Encode(buffer: Buffer, pad: boolean = false): string {
        let bits = 0;
        let value = 0;
        let output = '';
        for (let i = 0; i < buffer.length; i++) {
            value = (value << 8) | buffer[i];
            bits += 8;
            while (bits >= 5) {
                output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
                bits -= 5;
            }
        }
        if (bits > 0) {
            output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
        }
        if (pad && output.length > 0) {
            while (output.length % 8 !== 0) {
                output += '=';
            }
        }
        return output;
    }

    static encodeBase32(buffer: Buffer, pad: boolean = true): string {
        return this.base32Encode(buffer, pad);
    }

    /**
     * Decodes a Base32 string to a Buffer (RFC 4648)
     */
    static base32Decode(str: string): Buffer {
        const cleaned = str.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
        let bits = 0;
        let value = 0;
        const output: number[] = [];
        for (let i = 0; i < cleaned.length; i++) {
            const val = BASE32_ALPHABET.indexOf(cleaned[i]);
            if (val === -1) continue;
            value = (value << 5) | val;
            bits += 5;
            if (bits >= 8) {
                output.push((value >>> (bits - 8)) & 255);
                bits -= 8;
            }
        }
        return Buffer.from(output);
    }

    static decodeBase32(str: string): Buffer {
        return this.base32Decode(str);
    }

    /**
     * Generates a 160-bit cryptographically secure Base32 secret
     */
    static generateSecret(): string {
        return this.base32Encode(crypto.randomBytes(20));
    }

    /**
     * Generates a 6-digit TOTP code for a given secret at a specific counter step (RFC 6238 / RFC 4226)
     */
    static generateTOTP(
        secretBase32: string,
        counterOrTimestampOrOptions?:
            | number
            | bigint
            | { timestampMs?: number; counter?: bigint | number; stepSeconds?: number; digits?: number }
    ): string {
        const secretBuffer = this.base32Decode(secretBase32);
        let counter: bigint;
        let digits = 6;

        if (counterOrTimestampOrOptions === undefined) {
            counter = BigInt(Math.floor(Date.now() / 1000 / 30));
        } else if (typeof counterOrTimestampOrOptions === 'bigint') {
            counter = counterOrTimestampOrOptions;
        } else if (typeof counterOrTimestampOrOptions === 'number') {
            if (counterOrTimestampOrOptions > 1e11) {
                counter = BigInt(Math.floor(counterOrTimestampOrOptions / 1000 / 30));
            } else if (counterOrTimestampOrOptions > 1e8) {
                counter = BigInt(Math.floor(counterOrTimestampOrOptions / 30));
            } else {
                counter = BigInt(counterOrTimestampOrOptions);
            }
        } else {
            const opts = counterOrTimestampOrOptions;
            if (opts.digits) digits = opts.digits;
            const step = opts.stepSeconds || 30;
            if (opts.counter !== undefined) {
                counter = BigInt(opts.counter);
            } else if (opts.timestampMs !== undefined) {
                counter = BigInt(Math.floor(opts.timestampMs / 1000 / step));
            } else {
                counter = BigInt(Math.floor(Date.now() / 1000 / step));
            }
        }

        const counterBuffer = Buffer.alloc(8);
        counterBuffer.writeBigInt64BE(counter);

        const hmac = crypto.createHmac('sha1', secretBuffer).update(counterBuffer).digest();
        const offset = hmac[hmac.length - 1] & 0x0f;
        const binaryCode =
            ((hmac[offset] & 0x7f) << 24) |
            ((hmac[offset + 1] & 0xff) << 16) |
            ((hmac[offset + 2] & 0xff) << 8) |
            (hmac[offset + 3] & 0xff);

        const modulo = Math.pow(10, digits);
        return (binaryCode % modulo).toString().padStart(digits, '0');
    }

    /**
     * Verifies a 6-digit TOTP code with time-window tolerance (default +/- 1 step = 30 seconds drift tolerance)
     */
    static verifyTOTP(
        secretBase32: string,
        code: string,
        windowStepsOrOptions: number | { windowSteps?: number; window?: number; timestampMs?: number } = 1
    ): boolean {
        if (!secretBase32 || !code) return false;
        const cleanCode = code.trim().replace(/\s+/g, '');
        if (!/^\d{6}$/.test(cleanCode)) return false;

        let windowSteps = 1;
        let effectiveTimeMs = Date.now();

        if (typeof windowStepsOrOptions === 'number') {
            windowSteps = windowStepsOrOptions;
        } else if (typeof windowStepsOrOptions === 'object') {
            if (windowStepsOrOptions.windowSteps !== undefined) windowSteps = windowStepsOrOptions.windowSteps;
            else if (windowStepsOrOptions.window !== undefined) windowSteps = windowStepsOrOptions.window;
            if (windowStepsOrOptions.timestampMs !== undefined) effectiveTimeMs = windowStepsOrOptions.timestampMs;
        }

        const currentStep = BigInt(Math.floor(effectiveTimeMs / 1000 / 30));

        for (let i = -windowSteps; i <= windowSteps; i++) {
            const expected = this.generateTOTP(secretBase32, currentStep + BigInt(i));
            if (crypto.timingSafeEqual(Buffer.from(cleanCode), Buffer.from(expected))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generates a random set of 8 single-use backup recovery codes
     */
    static generateBackupCodes(count: number = 8): string[] {
        const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Unambiguous chars
        const codes: string[] = [];

        for (let i = 0; i < count; i++) {
            let code = '';
            const randomBytes = crypto.randomBytes(8);
            for (let j = 0; j < 8; j++) {
                code += charset[randomBytes[j] % charset.length];
                if (j === 3) code += '-';
            }
            codes.push(code);
        }

        return codes;
    }

    /**
     * Hashes a backup code with SHA-256 for secure storage
     */
    static hashBackupCode(code: string): string {
        const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
        return crypto.createHash('sha256').update(normalized).digest('hex');
    }

    /**
     * Verifies and consumes a backup code if found in the user's stored hashed backup codes
     */
    static verifyAndConsumeBackupCode(
        inputCode: string,
        hashedBackupCodes: string[]
    ): { valid: boolean; remainingHashedCodes: string[] } {
        if (!inputCode || !hashedBackupCodes || !Array.isArray(hashedBackupCodes)) {
            return { valid: false, remainingHashedCodes: hashedBackupCodes || [] };
        }

        const inputHash = this.hashBackupCode(inputCode);
        const index = hashedBackupCodes.findIndex(h => h === inputHash);

        if (index >= 0) {
            const remaining = [...hashedBackupCodes];
            remaining.splice(index, 1);
            return { valid: true, remainingHashedCodes: remaining };
        }

        return { valid: false, remainingHashedCodes: hashedBackupCodes };
    }

    /**
     * Generates a complete 2FA setup payload including secret, otpauth URI, QR code Data URL, and backup codes
     */
    static async generateSetup(userEmail: string, issuer: string = 'Workflow Manager'): Promise<TwoFactorSetupData> {
        // 20 random bytes (160 bits) = 32 Base32 characters (recommended for SHA1 TOTP)
        const secretBytes = crypto.randomBytes(20);
        const secret = this.base32Encode(secretBytes);

        const cleanEmail = userEmail.trim().toLowerCase();
        const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(cleanEmail)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 256,
            color: {
                dark: '#002395', // Brand primary blue
                light: '#FFFFFF'
            }
        });

        const backupCodes = this.generateBackupCodes(8);

        return {
            secret,
            otpauthUrl,
            qrCodeDataUrl,
            backupCodes
        };
    }
}
