'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useChannelStore } from '@/store/useChannelStore';
import { Check, CrownIcon, Plus, Search, Shield, UserPlus, X } from 'lucide-react';

interface User {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
}

interface ChannelMembersProps {
    channelId: string;
    onClose?: () => void;
}

export function ChannelMembers({ channelId, onClose }: ChannelMembersProps) {
    const { data: session } = useSession();
    const { activeChannel, inviteUserToChannel, promoteToChannelOwner, makeChannelAdmin } = useChannelStore();
    const [isModalOpen, setIsModalOpen] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [invitingUser, setInvitingUser] = useState<string | null>(null);
    const [promotingUser, setPromotingUser] = useState<string | null>(null);
    const [makingAdmin, setMakingAdmin] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'invite' | 'members'>('members');

    // Check permissions
    const isCurrentUserOwner = session?.user?.id === activeChannel?.ownerId;
    const isCurrentUserAdmin = activeChannel?.admins?.some(admin => admin.id === session?.user?.id) || isCurrentUserOwner;

    // Fetch users when modal opens
    useEffect(() => {
        if (!isModalOpen) return;

        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/users');
                if (!response.ok) throw new Error('Failed to fetch users');
                const data = await response.json();
                setUsers(data.users);
            } catch (error) {
                setError('Failed to load users');
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [isModalOpen]);

    // Filter users based on search term and exclude current members
    const filteredUsers = users.filter(user => {
        // Skip current user and existing channel members
        if (user.id === session?.user?.id) return false;
        if (activeChannel?.members?.some(member => member.id === user.id)) return false;

        // Filter by search term
        return (
            (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    });

    const handleInviteUser = async (userId: string) => {
        setInvitingUser(userId);
        setError(null);
        setSuccessMessage(null);

        const error = await inviteUserToChannel(channelId, userId);

        if (error) {
            setError(error);
        } else {
            // Find the user name to display in success message
            const invitedUser = users.find(u => u.id === userId);
            if (invitedUser) {
                setSuccessMessage(`${invitedUser.name || 'User'} has been invited!`);
            } else {
                setSuccessMessage('User has been invited!');
            }
        }

        setInvitingUser(null);
    };

    const handlePromoteUser = async (userId: string) => {
        setPromotingUser(userId);
        setError(null);
        setSuccessMessage(null);

        const error = await promoteToChannelOwner(channelId, userId);

        if (error) {
            setError(error);
        } else {
            // Find the user name to display in success message
            const promotedUser = activeChannel?.members?.find(m => m.id === userId);
            if (promotedUser) {
                setSuccessMessage(`${promotedUser.name || 'User'} is now the owner of this channel!`);
            } else {
                setSuccessMessage('User has been promoted to channel owner!');
            }
        }

        setPromotingUser(null);
    };

    const handleMakeAdmin = async (userId: string) => {
        setMakingAdmin(userId);
        setError(null);
        setSuccessMessage(null);

        const error = await makeChannelAdmin(channelId, userId);

        if (error) {
            setError(error);
        } else {
            // Find the user name to display in success message
            const adminUser = activeChannel?.members?.find(m => m.id === userId);
            if (adminUser) {
                setSuccessMessage(`${adminUser.name || 'User'} is now an admin of this channel!`);
            } else {
                setSuccessMessage('User has been made an admin of this channel!');
            }
        }

        setMakingAdmin(null);
    };

    // If this channel is not found or user doesn't have access to it
    if (!activeChannel) {
        return null;
    }

    return (
        <div className="mt-4">
            {/* Members toggle button */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
                <UserPlus size={16} />
                <span>Manage #{activeChannel.name}</span>
            </button>

            {/* Channel members modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background rounded-lg p-4 w-full max-w-md max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg">#{activeChannel.name}</h3>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    if (onClose) onClose();
                                }}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tab navigation */}
                        <div className="flex border-b mb-4">
                            <button
                                onClick={() => setActiveTab('members')}
                                className={`px-4 py-2 ${activeTab === 'members'
                                    ? 'border-b-2 border-primary font-medium'
                                    : 'text-muted-foreground'}`}
                            >
                                Members
                            </button>
                            {isCurrentUserAdmin && (
                                <button
                                    onClick={() => setActiveTab('invite')}
                                    className={`px-4 py-2 ${activeTab === 'invite'
                                        ? 'border-b-2 border-primary font-medium'
                                        : 'text-muted-foreground'}`}
                                >
                                    Invite
                                </button>
                            )}
                        </div>

                        {/* Success/Error message */}
                        {successMessage && (
                            <div className="mb-4 p-2 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-md text-sm">
                                {successMessage}
                            </div>
                        )}

                        {error && (
                            <div className="mb-4 p-2 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-md text-sm">
                                {error}
                            </div>
                        )}

                        {/* Invite tab */}
                        {activeTab === 'invite' && isCurrentUserAdmin && (
                            <>
                                {/* Search input */}
                                <div className="relative mb-4">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search for users..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-8 pr-4 py-2 rounded-md border bg-transparent"
                                    />
                                </div>

                                {/* Users to invite list */}
                                <div className="overflow-y-auto flex-1">
                                    {isLoading ? (
                                        <div className="flex justify-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                                        </div>
                                    ) : filteredUsers.length > 0 ? (
                                        <ul className="space-y-2">
                                            {filteredUsers.map(user => (
                                                <li
                                                    key={user.id}
                                                    className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {user.image ? (
                                                            <img
                                                                src={user.image}
                                                                alt={user.name || ''}
                                                                className="h-8 w-8 rounded-full"
                                                            />
                                                        ) : (
                                                            <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                                                                <span className="text-sm font-medium">
                                                                    {user.name?.charAt(0) || '?'}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-medium">{user.name}</div>
                                                            <div className="text-xs text-muted-foreground">{user.email}</div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleInviteUser(user.id)}
                                                        disabled={invitingUser === user.id}
                                                        className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                                    >
                                                        {invitingUser === user.id ? (
                                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                                        ) : (
                                                            <UserPlus size={16} />
                                                        )}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="py-8 text-center text-muted-foreground">
                                            No users found to invite
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Members tab */}
                        {activeTab === 'members' && (
                            <div className="overflow-y-auto flex-1">
                                {activeChannel.members && activeChannel.members.length > 0 ? (
                                    <ul className="space-y-2">
                                        {activeChannel.members.map(member => (
                                            <li
                                                key={member.id}
                                                className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {member.image ? (
                                                        <img
                                                            src={member.image}
                                                            alt={member.name || ''}
                                                            className="h-8 w-8 rounded-full"
                                                        />
                                                    ) : (
                                                        <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                                                            <span className="text-sm font-medium">
                                                                {member.name?.charAt(0) || '?'}
                                                            </span>
                                                        </div>
                                                    )}                                                        <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">
                                                                {member.name} {member.id === session?.user?.id ? '(you)' : ''}
                                                            </span>
                                                            {member.id === activeChannel.ownerId && (
                                                                <span className="flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded">
                                                                    <CrownIcon size={12} />
                                                                    Owner
                                                                </span>
                                                            )}
                                                            {member.id !== activeChannel.ownerId &&
                                                                activeChannel.admins?.some(admin => admin.id === member.id) && (
                                                                    <span className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded">
                                                                        <Shield size={12} />
                                                                        Admin
                                                                    </span>
                                                                )}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">{member.email}</div>
                                                    </div>
                                                </div>

                                                {/* Action buttons for member management */}
                                                <div className="flex gap-2">
                                                    {/* Make admin button (only for owner/admins for regular members) */}
                                                    {isCurrentUserAdmin &&
                                                        member.id !== session?.user?.id &&
                                                        member.id !== activeChannel.ownerId &&
                                                        !activeChannel.admins?.some(admin => admin.id === member.id) && (
                                                            <button
                                                                onClick={() => handleMakeAdmin(member.id)}
                                                                disabled={makingAdmin === member.id}
                                                                title="Make channel admin"
                                                                className="p-1.5 rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                                                            >
                                                                {makingAdmin === member.id ? (
                                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                                ) : (
                                                                    <Shield size={16} />
                                                                )}
                                                            </button>
                                                        )}

                                                    {/* Promote to owner button (only for owner) */}
                                                    {isCurrentUserOwner &&
                                                        member.id !== session?.user?.id &&
                                                        member.id !== activeChannel.ownerId && (
                                                            <button
                                                                onClick={() => handlePromoteUser(member.id)}
                                                                disabled={promotingUser === member.id}
                                                                title="Promote to channel owner"
                                                                className="p-1.5 rounded-md bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                                                            >
                                                                {promotingUser === member.id ? (
                                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                                ) : (
                                                                    <CrownIcon size={16} />
                                                                )}
                                                            </button>
                                                        )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="py-8 text-center text-muted-foreground">
                                        No members in this channel
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-4 pt-2 border-t flex justify-end">
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    if (onClose) onClose();
                                }}
                                className="px-4 py-2 rounded-md bg-muted hover:bg-muted/80 text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
