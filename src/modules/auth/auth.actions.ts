'use server';

import { authService } from "@/modules/auth/auth.service";
import { cookies } from "next/headers";
import { Result } from "@/core/types/result";
import { AppError } from "@/core/errors/app-error";

// --- Registration ---

export async function registerStart(username: string) {
    try {
        const result = await authService.generateRegistrationOptions(username);
        return result;
    } catch (err: any) {
        return Result.fail(err.message, err.code);
    }
}

export async function registerVerify(userId: string, response: any) {
    try {
        const result = await authService.verifyRegistration(userId, response);
        if (result.success) {
            // Create session cookie
            (await cookies()).set("session_user_id", userId, { httpOnly: true, secure: true, path: "/" });
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
