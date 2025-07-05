import { Prisma } from '@prisma/client';

// Augment Prisma Client's types to include our new relations
declare module '@prisma/client' {
    namespace Prisma {
        interface ChannelInclude {
            admins?: boolean | UserDefaultArgs<ExtArgs>
        }

        interface ChannelSelect {
            admins?: boolean | UserDefaultArgs<ExtArgs>
        }

        interface ChannelCreateInput {
            admins?: UserCreateNestedManyWithoutAdminChannelsInput<ExtArgs>
        }

        interface ChannelUpdateInput {
            admins?: UserUpdateManyWithoutAdminChannelsNestedInput<ExtArgs>
        }

        interface ChannelUncheckedCreateInput {
            admins?: UserUncheckedCreateNestedManyWithoutAdminChannelsInput<ExtArgs>
        }

        interface ChannelUncheckedUpdateInput {
            admins?: UserUncheckedUpdateManyWithoutAdminChannelsNestedInput<ExtArgs>
        }
    }
}
