// middleware/verifyToken.ts
import type { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { StatusCodes } from 'http-status-codes';

export const verifyToken = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(StatusCodes.FORBIDDEN).json({ message: 'No token provided.' });
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Unauthorized.' });
    }
};
