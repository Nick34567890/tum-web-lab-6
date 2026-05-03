import { Router } from 'express';
import { authenticate, requirePermission } from '../auth.js';
import { listAll, findOne, insert, update, remove } from '../store.js';

function parseInt32(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseAppid(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function validateBody(body, { requireName = true } = {}) {
  if (!body || typeof body !== 'object') return 'Request body must be a JSON object.';
  const appid = Number(body.appid);
  if (!Number.isFinite(appid) || appid <= 0) return 'Field "appid" must be a positive number.';
  if (requireName && (!body.name || typeof body.name !== 'string')) {
    return 'Field "name" is required and must be a string.';
  }
  return null;
}

export function createCollectionRouter(name) {
  const router = Router();

  router.use(authenticate);

  router.get('/', requirePermission('READ'), async (req, res, next) => {
    try {
      const limit = parseInt32(req.query.limit, 50);
      const offset = parseInt32(req.query.offset, 0);
      if (limit < 0 || offset < 0) {
        return res.status(400).json({ error: 'limit and offset must be >= 0.' });
      }
      const sort = req.query.sort === 'addedAt' ? 'addedAt' : null;
      const result = await listAll(name, { limit, offset, sort });
      res.status(200).json({
        collection: name,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        count: result.items.length,
        items: result.items,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:appid', requirePermission('READ'), async (req, res, next) => {
    try {
      const appid = parseAppid(req.params.appid);
      if (!appid) return res.status(400).json({ error: 'appid must be a positive integer.' });
      const entry = await findOne(name, appid);
      if (!entry) return res.status(404).json({ error: `${name} entry ${appid} not found.` });
      res.status(200).json(entry);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', requirePermission('WRITE'), async (req, res, next) => {
    try {
      const validation = validateBody(req.body);
      if (validation) return res.status(400).json({ error: validation });
      const appid = Number(req.body.appid);
      const entry = {
        appid,
        name: String(req.body.name),
        developer: req.body.developer ?? '',
        addedAt: Number.isFinite(Number(req.body.addedAt)) ? Number(req.body.addedAt) : Date.now(),
        notificationDateTime: req.body.notificationDateTime ?? null,
        wantToBuy: Boolean(req.body.wantToBuy),
        completedDate: req.body.completedDate ?? null,
        playedAt: req.body.playedAt ?? null,
        durationMinutes: Number.isFinite(Number(req.body.durationMinutes))
          ? Number(req.body.durationMinutes)
          : null,
      };
      const result = await insert(name, entry);
      if (!result.ok && result.reason === 'conflict') {
        return res.status(409).json({ error: `${name} already contains appid ${appid}.` });
      }
      res
        .status(201)
        .location(`/api/${name}/${appid}`)
        .json(result.entry);
    } catch (err) {
      next(err);
    }
  });

  router.put('/:appid', requirePermission('WRITE'), async (req, res, next) => {
    try {
      const appid = parseAppid(req.params.appid);
      if (!appid) return res.status(400).json({ error: 'appid must be a positive integer.' });
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Request body must be a JSON object.' });
      }
      const patch = { ...req.body };
      delete patch.appid;
      const result = await update(name, appid, patch);
      if (!result.ok) return res.status(404).json({ error: `${name} entry ${appid} not found.` });
      res.status(200).json(result.entry);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:appid', requirePermission('DELETE'), async (req, res, next) => {
    try {
      const appid = parseAppid(req.params.appid);
      if (!appid) return res.status(400).json({ error: 'appid must be a positive integer.' });
      const result = await remove(name, appid);
      if (!result.ok) return res.status(404).json({ error: `${name} entry ${appid} not found.` });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
