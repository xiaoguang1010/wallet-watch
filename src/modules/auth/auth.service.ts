import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { db } from "@/data/db";
import { users } from "@/data/schema/users";
import { authenticators } from "@/data/schema/authenticators";
import { eq } from "drizzle-orm";
import { env } from "@/config/env";
import { v4 as uuidv4 } from "uuid";
import { Result } from "@/core/types/result";
import { AppError } from "@/core/errors/app-error";

export class AuthService {
    /**
     * Step 1: Generate Registration Options
     */
    async generateRegistrationOptions(username: string) {
        // 1. Check if user exists, if not create a temp one or handle existing
        // For simplicity, we require username to be unique.
        let user = await db.query.users.findFirst({
            where: eq(users.username, username),
        });

        if (!user) {
            // Create new user
            const userId = uuidv4();
            await db.insert(users).values({
                id: userId,
                username,
                displayName: username,
            });
            user = { id: userId, username, displayName: username } as any;
        }

        // 2. Get user's existing authenticators to exclude them
        const userAuthenticators = await db.query.authenticators.findMany({
            where: eq(authenticators.userId, user!.id),
        });

        const options = await generateRegistrationOptions({
            rpName: env.RP_NAME,
            rpID: env.RP_ID,
            userID: new TextEncoder().encode(user!.id),
            userName: user!.username,
            attestationType: "none",
            excludeCredentials: userAuthenticators.map((auth) => ({
                id: auth.credentialID,
                type: "public-key",
            })),
            authenticatorSelection: {
                residentKey: "preferred",
                userVerification: "preferred",
                // authenticatorAttachment: "platform", // Allow both platform (TouchID) and cross-platform (YubiKey)
            },
        });

        // 3. Save challenge to DB
        await db.update(users).set({ currentChallenge: options.challenge }).where(eq(users.id, user!.id));

        return Result.ok(options);
    }

    /**
     * Step 2: Verify Registration Response
     */
    async verifyRegistration(userId: string, response: any) {
        // Decode userId from Base64URL since SimpleWebAuthn returns it encoded in options
        let lookupId = userId;
        if (userId.length > 36) {
            lookupId = Buffer.from(userId, 'base64url').toString('utf-8');
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, lookupId),
        });

        if (!user || !user.currentChallenge) {
            throw new AppError("User or challenge not found", "AUTH_ERROR", 400);
        }

        const verification = await verifyRegistrationResponse({
            response,
            expectedChallenge: user.currentChallenge,
            expectedOrigin: env.RP_ORIGIN,
            expectedRPID: env.RP_ID,
        });

        if (verification.verified && verification.registrationInfo) {
            const info = verification.registrationInfo as any;

            // Extract from nested 'credential' object if top-level is missing
            const credentialData = info.credential || info;

            const credentialID = credentialData.id || info.credentialID;
            const credentialPublicKey = credentialData.publicKey || info.credentialPublicKey;
            const counter = credentialData.counter || info.counter || 0;

            if (!credentialPublicKey) {
                throw new AppError("Missing public key in verification result", "AUTH_ERROR", 500);
            }

            // Save authenticator
            await db.insert(authenticators).values({
                id: uuidv4(),
                userId: user.id,
                credentialID: credentialID,
                credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64'), // Store as base64 string
                counter: counter,
                transports: response.response.transports?.join(",") || "",
            });

            // Clear challenge
            await db.update(users).set({ currentChallenge: null }).where(eq(users.id, user.id));

            return Result.ok({ verified: true });
        }

        return Result.fail("Verification failed");
    }

    /**
   * Step 3: Generate Login Options
   */
    async generateLoginOptions(username?: string) {
        // If username is provided, we can fetch their authenticators to pass as `allowCredentials`.
        // If not (conditional UI / autofill), we send empty allowCredentials.

        let userAuthenticators: any[] = [];
        let user: any = null;

        if (username) {
            user = await db.query.users.findFirst({ where: eq(users.username, username) });
            if (user) {
                userAuthenticators = await db.query.authenticators.findMany({
                    where: eq(authenticators.userId, user.id),
                });
            }
        }

        const options = await generateAuthenticationOptions({
            rpID: env.RP_ID,
            allowCredentials: userAuthenticators.map((auth) => ({
                id: auth.credentialID,
                type: "public-key",
            })),
            userVerification: "preferred",
        });

        // We need to store the challenge somewhere. 
        // Usually in a session or a temporary cookie because we might not know the user ID yet (if usernameless).
        // EXCEPT: For simplicity in this non-redis setup, we might need the username to store it in the user row.
        // OR we use a signed cookie to store the challenge sent to the client.
        // Let's assume for now we store it in the user row IF username is provided.
        // If usernameless, we rely on signed cookie strategy (will implement in controller).

        if (user) {
            await db.update(users).set({ currentChallenge: options.challenge }).where(eq(users.id, user.id));
        }

        return Result.ok(options);
    }

    /**
    * Step 4: Verify Login Response
    */
    async verifyLogin(response: any, challengeFromCookie?: string) {
        // Verify response
        // First we need to find the credential in DB to get the public key
        const credentialID = response.id;
        const authenticator = await db.query.authenticators.findFirst({
            where: eq(authenticators.credentialID, credentialID)
        });

        if (!authenticator) {
            throw new AppError("Authenticator not found", "AUTH_ERROR", 400);
        }

        const user = await db.query.users.findFirst({ where: eq(users.id, authenticator.userId) });
        if (!user) throw new AppError("User not found", "AUTH_ERROR", 400);

        // Determine expected challenge: either from User DB (if username flow) or Cookie (if usernameless)
        let expectedChallenge = user.currentChallenge;
        if (!expectedChallenge && challengeFromCookie) {
            expectedChallenge = challengeFromCookie;
        }

        if (!expectedChallenge) {
            throw new AppError("Challenge not found", "AUTH_ERROR", 400);
        }

        const verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge,
            expectedOrigin: env.RP_ORIGIN,
            expectedRPID: env.RP_ID,
            credential: {
                id: authenticator.credentialID,
                publicKey: new Uint8Array(Buffer.from(authenticator.credentialPublicKey, 'base64')),
                counter: Number(authenticator.counter),
            },
        });

        if (verification.verified) {
            const info = verification.authenticationInfo;
            const newCounter = info?.newCounter || Number(authenticator.counter) + 1;

            // Update counter
            await db.update(authenticators)
                .set({ counter: newCounter })
                .where(eq(authenticators.id, authenticator.id));

            // Clear challenge
            await db.update(users).set({ currentChallenge: null }).where(eq(users.id, user.id));

            return Result.ok({ verified: true, userId: user.id });
        }

        return Result.fail("Login verification failed");
    }
}

export const authService = new AuthService();
