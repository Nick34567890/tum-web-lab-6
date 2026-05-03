export const PORT = Number(process.env.PORT ?? 4000);

export const JWT_SECRET =
  process.env.JWT_SECRET ?? 'lab7-dev-secret-change-me-in-production';

// 1 minute, as required by the lab spec for demo purposes.
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '60s';

// Comma-separated origins, e.g. "http://localhost:5173,http://localhost:4173"
const corsEnv = process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:4173';
export const CORS_ORIGINS = corsEnv.split(',').map((s) => s.trim()).filter(Boolean);

export const ROLES = {
  ADMIN: ['READ', 'WRITE', 'DELETE'],
  WRITER: ['READ', 'WRITE'],
  VISITOR: ['READ'],
};
