import { Router } from 'express';
import { issueToken } from '../auth.js';

const router = Router();

function parsePermissionsParam(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

router.post('/', (req, res) => {
  const { role, permissions, subject } = req.body ?? {};
  const result = issueToken({ role, permissions, subject });
  res.status(200).json(result);
});

router.get('/', (req, res) => {
  const role = req.query.role;
  const permissions = parsePermissionsParam(req.query.permissions);
  const subject = req.query.subject;
  const result = issueToken({ role, permissions, subject });
  res.status(200).json(result);
});

export default router;
