export type Result<T = void> = {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
};

export const Result = {
    ok: <T>(data: T): Result<T> => ({ success: true, data }),
    fail: (message: string, code: string = "ERROR"): Result<void> => ({
        success: false,
        error: { code, message },
    }),
};
