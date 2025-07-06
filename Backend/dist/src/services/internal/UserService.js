"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const UserRepository_1 = __importDefault(require("../../repository/UserRepository"));
const MONTHLY_REPLENISH_AMOUNT = 100;
class UserService {
    constructor() {
        this.userRepository = new UserRepository_1.default();
        console.log('[UserService] UserRepository instance created.');
    }
    createUser(userData) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('[UserService.createUser] Attempting with data:', userData);
            try {
                if (!userData.email) {
                    console.error('[UserService.createUser] Email is required to create a user.');
                    throw new Error('Email is required to create a user.');
                }
                const payloadForRepo = {
                    userId: userData.userId,
                    email: userData.email,
                    firstName: userData.firstName !== undefined ? userData.firstName : '',
                    lastName: userData.lastName !== undefined ? userData.lastName : '',
                    profilePictureUrl: userData.profilePictureUrl !== undefined ? userData.profilePictureUrl : null,
                    videoUrl: null,
                    zipcode: userData.zipcode !== undefined ? userData.zipcode : null,
                    stickers: null,
                    tokens: 100,
                    enableNotifications: true, // Default to true for new users
                    is_profile_complete: false,
                };
                const createdUser = yield this.userRepository.createUser(payloadForRepo);
                if (!createdUser) {
                    console.warn('[UserService.createUser] userRepository.createUser returned null.');
                    return null;
                }
                console.log(`[UserService.createUser] User created successfully. UserID: ${createdUser.userId}, Email: ${createdUser.email}, Initial Tokens: ${createdUser.tokens}`);
                return createdUser;
            }
            catch (error) {
                console.error('[UserService.createUser] Error:', error);
                throw error;
            }
        });
    }
    getUserById(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepository.getUserById(userId);
            return user;
        });
    }
    updateUser(userId, 
    // The updateData comes from the handler and is already shaped by UpdateUserPayload
    // but the repository expects Partial<User>. We need to ensure compatibility.
    updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[UserService.updateUser] Updating user ${userId} with:`, updateData);
            if (Object.keys(updateData).length === 0) {
                console.log(`[UserService.updateUser] No valid fields for update for user ${userId}. Fetching current data.`);
                return this.getUserById(userId);
            }
            // Prepare data for the repository, ensuring type compatibility
            const repoUpdateData = Object.assign({}, updateData);
            // Specifically handle enableNotifications if it's present in updateData
            // and its type in UpdateUserPayload might include null
            if (updateData.enableNotifications !== undefined) {
                if (updateData.enableNotifications === null) {
                    // Decide how to treat null:
                    // Option A: Treat null as 'false' (or 'true', or a default)
                    // repoUpdateData.enableNotifications = false;
                    // Option B: Remove it so DB default applies or it's unchanged if DB doesn't have default
                    // delete repoUpdateData.enableNotifications;
                    // Option C (Chosen here): If User.enableNotifications is `boolean`, null is invalid.
                    // The handler should already convert it to boolean. If it still arrives as null,
                    // it means UpdateUserPayload allows null, but User doesn't.
                    // Let's assume UpdateUserPayload from handler provides boolean.
                    // The error was because the TYPE of updateData.enableNotifications (from UpdateUserPayload)
                    // could be `boolean | null | undefined` while Partial<User>['enableNotifications'] was `boolean | undefined`.
                    // The handler's conversion to Boolean(value) should prevent null from reaching here.
                    // If `UpdateUserPayload` allows `null` for `enableNotifications`, and `User` type's `enableNotifications` is `boolean`,
                    // then the conversion must happen before this service method, or `User.enableNotifications` must allow `null`.
                    // Given the error, it implies `updateData.enableNotifications` can be `null`.
                    // If `User.enableNotifications` cannot be `null`, we must convert it.
                    // Let's assume if null is passed, we default it to false (or true, based on app logic)
                    // or remove it if we want to keep the existing value / use DB default.
                    // For safety, if it's `null`, let's explicitly set it to a boolean.
                    // The handler was: validUpdateData.enableNotifications = Boolean(updateDataFromRequest.enableNotifications);
                    // So null would become false. This should be fine.
                    // The issue might be if UpdateUserPayload *itself* is Partial<User> and then User has strict boolean.
                    // Let's re-evaluate: The error comes from `updateData as UpdateUserPayload` in the *previous* version
                    // of the code which was calling `userRepository.updateUser`.
                    // The current `updateData` parameter for `UserService.updateUser` is already more specific.
                    // The call to `userRepository.updateUser` is now:
                    // `await this.userRepository.updateUser(userId, repoUpdateData);`
                    // The problem is IF repoUpdateData.enableNotifications is null AND User.enableNotifications is boolean.
                    // If UpdateUserPayload for enableNotifications is `boolean | null | undefined`
                    // and User.enableNotifications is `boolean | undefined` (or just `boolean`)
                    if (repoUpdateData.enableNotifications === null) {
                        // If your User type's enableNotifications cannot be null,
                        // you must decide what null means here.
                        // e.g., treat null as false, or remove the property to not update it.
                        // Let's assume if null is passed, it means "disable".
                        console.warn(`[UserService.updateUser] enableNotifications was null for user ${userId}, converting to false.`);
                        repoUpdateData.enableNotifications = false;
                    }
                }
            }
            // Ensure 'email' or 'tokens' are not in updateData from less trusted sources
            // This check is a safeguard; the type signature of updateData already excludes them.
            if ('email' in repoUpdateData)
                delete repoUpdateData.email;
            if ('tokens' in repoUpdateData)
                delete repoUpdateData.tokens;
            if (Object.keys(repoUpdateData).length === 0) {
                console.log(`[UserService.updateUser] No valid fields left after filtering for user ${userId}.`);
                return this.getUserById(userId);
            }
            try {
                const updatedUser = yield this.userRepository.updateUser(userId, repoUpdateData);
                if (!updatedUser) {
                    console.warn(`[UserService.updateUser] userRepository.updateUser returned null for ${userId}.`);
                    return null;
                }
                console.log(`[UserService.updateUser] User ${userId} updated. Current tokens: ${updatedUser.tokens}`);
                return updatedUser;
            }
            catch (error) {
                console.error(`[UserService.updateUser] Error for ${userId}:`, error);
                throw error;
            }
        });
    }
    deleteUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[UserService.deleteUser] Attempting to delete user ID: ${userId}`);
            const result = yield this.userRepository.deleteUser(userId);
            if (result) {
                console.log(`[UserService.deleteUser] User ${userId} deleted successfully.`);
            }
            else {
                console.warn(`[UserService.deleteUser] User ${userId} not found or delete failed.`);
            }
            return result;
        });
    }
    getAllUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[UserService.getAllUsers] Fetching all users.`);
            return this.userRepository.getAllUsers();
        });
    }
    replenishAllUsersMonthlyTokens() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('[UserService.replenishAllUsersMonthlyTokens] Starting monthly token replenishment for all users.');
            try {
                const updatedCount = yield this.userRepository.replenishAllUserTokens(MONTHLY_REPLENISH_AMOUNT);
                console.log(`[UserService.replenishAllUsersMonthlyTokens] ${updatedCount} users had their tokens set to ${MONTHLY_REPLENISH_AMOUNT}.`);
                return { successCount: updatedCount, errorCount: 0 };
            }
            catch (error) {
                console.error('[UserService.replenishAllUsersMonthlyTokens] Error during batch update:', error);
                let totalUsers = 0;
                try {
                    const allUsers = yield this.userRepository.getAllUsers();
                    totalUsers = allUsers.length;
                }
                catch (countError) {
                    console.error('[UserService.replenishAllUsersMonthlyTokens] Could not get total user count for error reporting.', countError);
                }
                return { successCount: 0, errorCount: totalUsers > 0 ? totalUsers : -1 };
            }
        });
    }
    spendTokensForUser(userId, amount, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[UserService.spendTokensForUser] User ${userId} attempting to spend ${amount} tokens for: ${reason}.`);
            if (amount <= 0) {
                console.warn(`[UserService.spendTokensForUser] Amount to spend must be positive. User: ${userId}, Amount: ${amount}`);
                throw new Error('Amount to spend must be positive.');
            }
            try {
                const updatedUser = yield this.userRepository.spendUserTokens(userId, amount);
                if (updatedUser) {
                    console.log(`[UserService.spendTokensForUser] User ${userId} spent ${amount} tokens. New balance: ${updatedUser.tokens}. Reason: ${reason}`);
                }
                else {
                    console.warn(`[UserService.spendTokensForUser] User ${userId} not found during token spending or spend failed returning null.`);
                }
                return updatedUser;
            }
            catch (error) {
                console.error(`[UserService.spendTokensForUser] Error for user ${userId} spending ${amount} for ${reason}: ${error.message}`);
                throw error;
            }
        });
    }
    grantTokensToUser(userId, amount, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[UserService.grantTokensToUser] Granting ${amount} tokens to user ${userId} for: ${reason}.`);
            if (amount <= 0) {
                console.warn(`[UserService.grantTokensToUser] Amount to grant must be positive. User: ${userId}, Amount: ${amount}`);
                throw new Error('Amount to grant must be positive.');
            }
            try {
                const user = yield this.userRepository.getUserById(userId);
                if (!user) {
                    console.warn(`[UserService.grantTokensToUser] User ${userId} not found. Cannot grant tokens.`);
                    return null;
                }
                const newTotal = (user.tokens || 0) + amount; // Ensure user.tokens is treated as 0 if null/undefined
                const updatedUser = yield this.userRepository.updateUser(userId, { tokens: newTotal });
                if (updatedUser) {
                    console.log(`[UserService.grantTokensToUser] User ${userId} granted ${amount} tokens. New balance: ${updatedUser.tokens}. Reason: ${reason}`);
                }
                else {
                    console.error(`[UserService.grantTokensToUser] Failed to update user ${userId} tokens after calculation.`);
                }
                return updatedUser;
            }
            catch (error) {
                console.error(`[UserService.grantTokensToUser] Error granting tokens to ${userId}: ${error.message}`);
                throw error;
            }
        });
    }
}
exports.default = UserService;
