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
    /**
     * Step 1: Generate Registration Options
     */
    async generateRegistrationOptions(username: string) {
        // 1. Check if user exists
        let user: any = await db.query.users.findFirst({
            where: eq(users.username, username),
        });

        let userId = user ? user.id : uuidv4();
        let userAuthenticators: any[] = [];

        if (user) {
            // 2. Get user's existing authenticators to exclude them
            userAuthenticators = await db.query.authenticators.findMany({
                where: eq(authenticators.userId, user.id),
            });
        }

        const options = await generateRegistrationOptions({
            rpName: env.RP_NAME,
            rpID: env.RP_ID,
            userID: new TextEncoder().encode(userId),
            userName: user ? user.username : username,
            userDisplayName: user ? user.displayName : username,
            attestationType: "none",
            excludeCredentials: userAuthenticators.map((auth) => ({
                id: auth.credentialID,
                type: "public-key",
            })),
            authenticatorSelection: {
                residentKey: "required", // Force resident key for usernameless login support
                userVerification: "preferred",
                // authenticatorAttachment: "platform", // Allow both platform (TouchID) and cross-platform (YubiKey)
            },
            timeout: 60000, // Reduced to 60s to avoid hanging hardware states
        });

        // 3. Return options and context (Do NOT save to DB yet)
        // Challenge and UserID should be stored in session/cookie by the controller
        return Result.ok({ options, userId, username });
    }

    /**
     * Step 2: Verify Registration Response
     */
    /**
     * Step 2: Verify Registration Response
     */
    async verifyRegistration(response: any, expectedChallenge: string, expectedUserId: string, expectedUsername: string) {
        if (!expectedChallenge || !expectedUserId) {
            throw new AppError("Invalid session context", "AUTH_ERROR", 400);
        }

        const verification = await verifyRegistrationResponse({
            response,
            expectedChallenge: expectedChallenge,
            expectedOrigin: env.RP_ORIGIN,
            expectedRPID: env.RP_ID,
        });

        if (verification.verified && verification.registrationInfo) {
            const info = verification.registrationInfo as any;
            const credentialData = info.credential || info;
            const credentialID = credentialData.id || info.credentialID;
            const credentialPublicKey = credentialData.publicKey || info.credentialPublicKey;
            const counter = credentialData.counter || info.counter || 0;

            if (!credentialPublicKey) {
                throw new AppError("Missing public key in verification result", "AUTH_ERROR", 500);
            }

            // Transactional User Creation + Authenticator Link
            await db.transaction(async (tx) => {
                // 1. Check if user exists (Double check inside transaction)
                let user = await tx.query.users.findFirst({
                    where: eq(users.id, expectedUserId), // Use ID from cookie to match intent
                });

                if (!user) {
                    // Try by username just in case ID was ephemeral
                    user = await tx.query.users.findFirst({
                        where: eq(users.username, expectedUsername),
                    });
                }

                if (!user) {
                    // Create User (Lazy Creation)
                    await tx.insert(users).values({
                        id: expectedUserId,
                        username: expectedUsername,
                        displayName: expectedUsername,
                        currentChallenge: null, // Clear challenge
                    });
                    user = { id: expectedUserId, username: expectedUsername } as any;
                } else {
                    // Ensure challenge is cleared for existing user too
                    await tx.update(users).set({ currentChallenge: null }).where(eq(users.id, user.id));
                }

                // 2. Save authenticator
                await tx.insert(authenticators).values({
                    id: uuidv4(),
                    userId: user!.id,
                    credentialID: credentialID,
                    credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64'),
                    counter: counter,
                    transports: response.response.transports?.join(",") || "",
                });
            });

            return Result.ok({ verified: true, userId: expectedUserId });
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
            timeout: 60000, // 60 seconds
        });

        // We need to store the challenge somewhere. 
        // Usually in a session or a temporary cookie because we might not know the user ID yet (if usernameless).
        // EXCEPT: For simplicity in this non-redis setup, we might need the username to store it in the user row.
        // OR we use a signed cookie to store the challenge sent to the client.
        // Let's assume for now we store it in the user row IF username is provided.
        // If usernameless, we rely on signed cookie strategy (will implement in controller).

        if (user) {
            // No need to store challenge in DB anymore
            // await db.update(users).set({ currentChallenge: options.challenge }).where(eq(users.id, user.id));
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

        // Determine expected challenge: Strictly from Cookie (Stateless)
        // We previously fell back to DB, but that is prone to race conditions and inconsistencies
        const expectedChallenge = challengeFromCookie;

        if (!expectedChallenge) {
            throw new AppError("Challenge not found or expired", "AUTH_ERROR", 400);
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
