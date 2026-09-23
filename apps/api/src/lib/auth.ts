import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { AuthUser, UserRole } from '@guardian/shared';
import { UserRole as UserRoleEnum } from '@guardian/shared';
import { prisma } from './prisma.js';
import { shouldUseSimulatorDatastore } from './runtime-mode.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-insecure-change-me';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

interface SimulatorUserRecord {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  role: UserRole;
}

const SIMULATOR_USERS = new Map<string, SimulatorUserRecord>();

let simulatorUsersInitialized = false;

function ensureSimulatorUsers(): void {
  if (simulatorUsersInitialized) return;
  simulatorUsersInitialized = true;

  const adminHash = bcrypt.hashSync('admin123', BCRYPT_ROUNDS);
  const customerHash = bcrypt.hashSync('customer123', BCRYPT_ROUNDS);

  SIMULATOR_USERS.set('admin@guardian.local', {
    id: '00000000-0000-4000-8000-000000000010',
    email: 'admin@guardian.local',
    name: 'Platform Admin',
    passwordHash: adminHash,
    role: UserRoleEnum.ADMIN,
  });

  SIMULATOR_USERS.set('customer@example.com', {
    id: '00000000-0000-4000-8000-000000000011',
    email: 'customer@example.com',
    name: 'Demo Customer',
    passwordHash: customerHash,
    role: UserRoleEnum.CUSTOMER,
  });
}

export function toAuthUser(user: {
  id: string;
  email: string;
  name: string | null;
  role: string;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function signAccessToken(user: AuthUser): { token: string; expiresIn: string } {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, options);
  return { token, expiresIn: JWT_EXPIRES_IN };
}

export function verifyAccessToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') return null;
    const role = payload.role === UserRoleEnum.ADMIN ? UserRoleEnum.ADMIN : UserRoleEnum.CUSTOMER;
    return {
      id: payload.sub,
      email: payload.email,
      role,
      name: typeof payload.name === 'string' ? payload.name : null,
    };
  } catch {
    return null;
  }
}

async function findUserByEmail(email: string): Promise<SimulatorUserRecord | null> {
  const normalized = email.trim().toLowerCase();

  if (await shouldUseSimulatorDatastore()) {
    ensureSimulatorUsers();
    return SIMULATOR_USERS.get(normalized) ?? null;
  }

  const row = await prisma.user.findUnique({ where: { email: normalized } });
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.passwordHash,
    role: row.role as UserRole,
  };
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const user = await findUserByEmail(email);
  if (!user || !user.passwordHash) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  return toAuthUser(user);
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  if (await shouldUseSimulatorDatastore()) {
    ensureSimulatorUsers();
    for (const user of SIMULATOR_USERS.values()) {
      if (user.id === id) return toAuthUser(user);
    }
    return null;
  }

  const row = await prisma.user.findUnique({ where: { id } });
  return row ? toAuthUser(row) : null;
}

export async function createUser(input: {
  email: string;
  password: string;
  name?: string;
  role?: UserRole;
}): Promise<AuthUser> {
  const email = input.email.trim().toLowerCase();
  const role = input.role ?? UserRoleEnum.CUSTOMER;
  const passwordHash = await hashPassword(input.password);

  if (await shouldUseSimulatorDatastore()) {
    ensureSimulatorUsers();
    if (SIMULATOR_USERS.has(email)) {
      throw new Error('USER_EXISTS');
    }
    const id = randomUUID();
    const record: SimulatorUserRecord = {
      id,
      email,
      name: input.name ?? null,
      passwordHash,
      role,
    };
    SIMULATOR_USERS.set(email, record);
    return toAuthUser(record);
  }

  const created = await prisma.user.create({
    data: {
      email,
      name: input.name ?? null,
      passwordHash,
      role,
    },
  });
  return toAuthUser(created);
}

export async function listUsers(): Promise<AuthUser[]> {
  if (await shouldUseSimulatorDatastore()) {
    ensureSimulatorUsers();
    return [...SIMULATOR_USERS.values()].map(toAuthUser);
  }

  const rows = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(toAuthUser);
}

export function getSimulatorAdminUserId(): string {
  ensureSimulatorUsers();
  return SIMULATOR_USERS.get('admin@guardian.local')!.id;
}

export function getSimulatorCustomerUserId(): string {
  ensureSimulatorUsers();
  return SIMULATOR_USERS.get('customer@example.com')!.id;
}
