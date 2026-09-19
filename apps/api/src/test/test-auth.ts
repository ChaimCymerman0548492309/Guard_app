import type { Application } from 'express';
import request from 'supertest';

export async function loginAsAdmin(app: Application): Promise<string> {
  return login(app, 'admin@guardian.local', 'admin123');
}

export async function loginAsCustomer(app: Application): Promise<string> {
  return login(app, 'customer@example.com', 'customer123');
}

async function login(app: Application, email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status}`);
  }
  return res.body.data.token as string;
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
