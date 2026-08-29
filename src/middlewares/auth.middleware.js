import { verifyAccessToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/errors.js';
import prisma from '../config/database.js';

export const authenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ') && !authHeader?.startsWith('JWT ')) {
      throw new UnauthorizedError('Authentication required');
    }

    const token = authHeader.replace(/^(Bearer|JWT)\s+/i, '');
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findFirst({
      where: { id: decoded.userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        tenantId: true,
        emailVerified: true,
      },
    });

    if (!user || user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
      throw new UnauthorizedError('Account is not active');
    }

    req.user = user;
    req.tokenPayload = decoded;
    next();
  } catch (err) {
    next(err instanceof UnauthorizedError ? err : new UnauthorizedError('Invalid or expired token'));
  }
};

export const optionalAuth = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  try {
    await authenticate(req, _res, next);
  } catch {
    next();
  }
};
