import { User } from '@prisma/client';

// Extended User type with verification fields
export interface ExtendedUser extends User {
    hashedOtp: string | null;
    otpExpires: Date | null;
    isVerified: boolean;
    verificationAttempts: number;
    verificationLockUntil: Date | null;
}
