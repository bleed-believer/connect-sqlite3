import 'express-session';

declare module 'express-session' {
    interface SessionData {
        sid: string;
        json: Record<string, any>;
    }
}