declare namespace Express {
  interface Request {
    requestId: string;
    user?: import('@guardian/shared').AuthUser;
  }
}
