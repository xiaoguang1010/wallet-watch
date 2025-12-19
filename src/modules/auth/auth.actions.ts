'use server';

import { authService } from "@/modules/auth/auth.service";
import { cookies } from "next/headers";
import { Result } from "@/core/types/result";
import { AppError } from "@/core/errors/app-error";
import { db } from "@/data/db";
import { users } from "@/data/schema/users";
import { eq } from "drizzle-orm";

// --- Registration ---

export async function registerStart(username: string) {
    try {
        const result = await authService.generateRegistrationOptions(username);
        if (result.success && result.data) {
            const cookieStore = await cookies();
            const { options, userId, username: resUsername } = result.data;

            // Store ephemeral context in cookies
            cookieStore.set("reg_challenge", options.challenge, { httpOnly: true, secure: true, path: "/", maxAge: 60 * 5 });
            cookieStore.set("reg_user_id", userId, { httpOnly: true, secure: true, path: "/", maxAge: 60 * 5 });
            cookieStore.set("reg_username", resUsername, { httpOnly: true, secure: true, path: "/", maxAge: 60 * 5 });

            return Result.ok(options);
        }

        // If we reach here, it means success was false or data was missing
        // We explicitly construct a generic failure result to avoid leaking the internal Result<{options, userId...}> type
        // which causes TypeScript type mismatch in the client.
        const errorMessage = typeof result.error === 'string' ? result.error : "Failed to start registration";
        return Result.fail(errorMessage);
    } catch (err: any) {
        return Result.fail(err.message, err.code);
    }
}

export async function registerVerify(clientUserId: string | null, response: any) {
    try {
        const cookieStore = await cookies();
        const challenge = cookieStore.get("reg_challenge")?.value;
        const userId = cookieStore.get("reg_user_id")?.value;
        const username = cookieStore.get("reg_username")?.value;

        // Verify using context from cookies
        const result = await authService.verifyRegistration(response, challenge!, userId!, username!);

        if (result.success && result.data?.userId) {
            // Create session cookie
            cookieStore.set("session_user_id", result.data.userId, { httpOnly: true, secure: true, path: "/" });

            // Clean up reg cookies
            cookieStore.delete("reg_challenge");
            cookieStore.delete("reg_user_id");
            cookieStore.delete("reg_username");
        }
        return result;
    } catch (err: any) {
        return Result.fail(err.message, err.code);
    }
}

// --- Login ---

export async function loginStart(username?: string) {
    try {
        const result = await authService.generateLoginOptions(username);
        if (result.success && result.data?.challenge) {
            // Store challenge in cookie for usernameless flow if needed
            (await cookies()).set("auth_challenge", result.data.challenge, { httpOnly: true, secure: true, path: "/", maxAge: 60 * 5 });
        }
        return result;
    } catch (err: any) {
        return Result.fail(err.message, err.code);
    }
}

export async function loginVerify(response: any) {
    try {
        const challengeCookie = (await cookies()).get("auth_challenge");
        const result = await authService.verifyLogin(response, challengeCookie?.value);

        if (result.success && result.data?.userId) {
            (await cookies()).set("session_user_id", result.data.userId, { httpOnly: true, secure: true, path: "/" });
            // clear challenge cookie
            (await cookies()).delete("auth_challenge");
        }
        return result;
    } catch (err: any) {
        return Result.fail(err.message, err.code);
    }
}

export async function logout() {
    (await cookies()).delete("session_user_id");
}

export async function getCurrentUser() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("session_user_id")?.value;

    if (!userId) return Result.fail("Not authenticated");

    try {
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        
        if (!user || user.length === 0) {
            return Result.fail("User not found");
        }

        return Result.ok(user[0]);
    } catch (error: any) {
        return Result.fail(error.message || "Failed to fetch user");
    }
}
