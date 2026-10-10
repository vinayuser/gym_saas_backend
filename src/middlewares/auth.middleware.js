import { verifyAccessToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/errors.js';
import { User } from '../schemas/index.js';
import { asDoc } from '../helpers/document.js';
import { notDeleted } from '../helpers/query.js';

export const authenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ') && !authHeader?.startsWith('JWT ')) {
      throw new UnauthorizedError('Authentication required');
    }

    const token = authHeader.replace(/^(Bearer|JWT)\s+/i, '');
    const decoded = verifyAccessToken(token);

    const user = asDoc(
      await User.findOne({ _id: decoded.userId, ...notDeleted }).select(
        'email firstName lastName role status tenantId emailVerified'
      )
    );

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
