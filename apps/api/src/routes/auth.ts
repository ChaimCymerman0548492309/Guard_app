import { Router } from 'express';
import { z } from 'zod';
import { UserRole } from '@guardian/shared';
import { authenticateUser, createUser, getUserById, listUsers, signAccessToken } from '../lib/auth.js';
import { sendError, sendSuccess } from '../lib/response.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const authRouter: Router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'VALIDATION_ERROR', parsed.error.message, req.requestId, 400);
    return;
  }

  const user = await authenticateUser(parsed.data.email, parsed.data.password);
  if (!user) {
    sendError(res, 'UNAUTHORIZED', 'Invalid email or password', req.requestId, 401);
    return;
  }

  const { token, expiresIn } = signAccessToken(user);
  sendSuccess(res, { token, user, expiresIn }, req.requestId);
});

authRouter.get('/me', authenticate(true), async (req, res) => {
  const user = await getUserById(req.user!.id);
  if (!user) {
    sendError(res, 'NOT_FOUND', 'User not found', req.requestId, 404);
    return;
  }
  sendSuccess(res, user, req.requestId);
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120).optional(),
  role: z.enum([UserRole.ADMIN, UserRole.CUSTOMER]).optional(),
});

authRouter.get('/users', authenticate(true), requireRole(UserRole.ADMIN), async (req, res) => {
  const users = await listUsers();
  sendSuccess(res, users, req.requestId);
});

authRouter.post(
  '/users',
  authenticate(true),
  requireRole(UserRole.ADMIN),
  async (req, res) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'VALIDATION_ERROR', parsed.error.message, req.requestId, 400);
      return;
    }

    try {
      const user = await createUser({
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.name,
        role: parsed.data.role ?? UserRole.CUSTOMER,
      });
      sendSuccess(res, user, req.requestId, 201);
    } catch (err) {
      if (err instanceof Error && err.message === 'USER_EXISTS') {
        sendError(res, 'CONFLICT', 'User with this email already exists', req.requestId, 409);
        return;
      }
      throw err;
    }
  },
);
