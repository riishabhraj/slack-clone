import crypto from 'crypto';
import bcrypt from 'bcrypt';

/**
 * Generate a secure OTP for verification
 * @returns A random 6-digit OTP
 */
export function generateOTP(): string {
    // Generate a 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash an OTP for secure storage
 * @param otp The plaintext OTP
 * @returns The hashed OTP
 */
export async function hashOTP(otp: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(otp, saltRounds);
}

/**
 * Verify if the provided OTP matches the hashed OTP
 * @param plainOTP The plaintext OTP provided by the user
 * @param hashedOTP The hashed OTP stored in the database
 * @returns True if the OTPs match, false otherwise
 */
export async function verifyOTP(plainOTP: string, hashedOTP: string | null): Promise<boolean> {
    if (!hashedOTP) return false;
    return bcrypt.compare(plainOTP, hashedOTP);
}

/**
 * Calculate OTP expiry time
 * @param minutes Minutes until OTP expires
 * @returns Date object representing expiry time
 */
export function getOTPExpiry(minutes: number = 10): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + minutes);
    return expiry;
}

/**
 * Check if OTP has expired
 * @param expiry The OTP expiry timestamp
 * @returns True if OTP has expired, false otherwise
 */
export function isOTPExpired(expiry: Date | null): boolean {
    if (!expiry) return true;
    return new Date() > expiry;
}

/**
 * Check if verification is locked due to too many attempts
 * @param lockUntil The timestamp until verification is locked
 * @returns True if locked, false otherwise
 */
export function isVerificationLocked(lockUntil: Date | null): boolean {
    if (!lockUntil) return false;
    return new Date() < lockUntil;
}

/**
 * Calculate lock duration based on attempts
 * @param attempts Number of failed verification attempts
 * @returns Duration in milliseconds
 */
export function calculateLockDuration(attempts: number): number {
    // Exponential backoff: 5min, 15min, 30min, 1hr, 3hr, 6hr, 12hr, 24hr
    const baseDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
    const factor = Math.min(Math.pow(2, attempts - 1), 288); // Max 24 hours (288 * 5 min)
    return baseDuration * factor;
}

/**
 * Calculate lock until date based on attempts
 * @param attempts Number of failed verification attempts
 * @returns Date object representing when the lock expires, or null if not locked
 */
export function calculateLockUntil(attempts: number): Date | null {
    if (attempts < 3) return null; // Only lock after 3 failed attempts

    const lockDuration = calculateLockDuration(attempts);
    const lockUntil = new Date();
    lockUntil.setTime(lockUntil.getTime() + lockDuration);
    return lockUntil;
}
