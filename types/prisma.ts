import { User, Channel, ChannelAdmin } from "@prisma/client";

// Extended types for channel members with selection
export interface ChannelMember {
    id: string;
}

export interface ChannelAdminWithUserId {
    userId: string;
}

export interface ChannelWithMembers extends Channel {
    members: ChannelMember[];
    channelAdmins: ChannelAdminWithUserId[];
    _count?: {
        members: number;
        messages: number;
    };
}

// Extended user type with authentication-related fields
export interface ExtendedUser extends Omit<User, 'hashedOtp' | 'otpExpires' | 'isVerified' | 'verificationAttempts' | 'verificationLockUntil'> {
    hashedPassword: string | null;
    hashedOtp: string | null;
    otpExpires: Date | null;
    isVerified: boolean;
    verificationAttempts: number;
    verificationLockUntil: Date | null;
}
