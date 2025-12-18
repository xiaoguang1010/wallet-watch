import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { registerStart, registerVerify, loginStart, loginVerify } from './auth.actions';
import { toast } from "sonner";
import { useRouter } from '@/i18n/routing';

export function useAuth() {
    const router = useRouter();

    const signUp = async (username: string) => {
        try {
            // 1. Get options from server
            const optionsRes = await registerStart(username);
            if (!optionsRes.success || !optionsRes.data) {
                throw new Error(optionsRes.error?.message || "Failed to start registration");
            }

            // 2. Browser native passkey creation
            const attResp = await startRegistration(optionsRes.data);

            // 3. Verify with server
            const verifyRes = await registerVerify(optionsRes.data.user.id, attResp);

            if (verifyRes.success) {
                toast.success("Account created successfully!");
                router.push('/dashboard');
            } else {
                throw new Error(verifyRes.error?.message || "Verification failed");
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Something went wrong during sign up");
        }
    };

    const signIn = async (username?: string) => {
        try {
            // 1. Get options from server
            const optionsRes = await loginStart(username);
            if (!optionsRes.success || !optionsRes.data) {
                throw new Error(optionsRes.error?.message || "Failed to start login");
            }

            // 2. Browser native passkey assertion
            const asseResp = await startAuthentication(optionsRes.data);

            // 3. Verify with server
            const verifyRes = await loginVerify(asseResp);

            if (verifyRes.success) {
                toast.success("Logged in successfully!");
                router.push('/dashboard');
            } else {
                throw new Error(verifyRes.error?.message || "Verification failed");
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Login failed");
        }
    };

    return { signUp, signIn };
}
