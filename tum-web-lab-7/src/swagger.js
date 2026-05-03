const collectionPath = (name) => ({
  get: {
    tags: [name],
    summary: `List ${name} entries (paginated)`,
    parameters: [
      { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 0, default: 50 } },
      { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } },
      { name: 'sort', in: 'query', schema: { type: 'string', enum: ['addedAt'] } },
    ],
    security: [{ bearerAuth: [] }],
    responses: {
      200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedEntries' } } } },
      401: { description: 'Missing or invalid JWT' },
      403: { description: 'Insufficient permissions (READ required)' },
    },
  },
  post: {
    tags: [name],
    summary: `Create a ${name} entry`,
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/EntryInput' } } },
    },
    responses: {
      201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Entry' } } } },
      400: { description: 'Validation error' },
      401: { description: 'Missing or invalid JWT' },
      403: { description: 'Insufficient permissions (WRITE required)' },
      409: { description: 'Entry already exists for this appid' },
    },
  },
});

const itemPath = (name) => ({
  get: {
    tags: [name],
    summary: `Get a single ${name} entry`,
    security: [{ bearerAuth: [] }],
    parameters: [{ name: 'appid', in: 'path', required: true, schema: { type: 'integer' } }],
    responses: {
      200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Entry' } } } },
      401: { description: 'Missing or invalid JWT' },
      403: { description: 'Insufficient permissions (READ required)' },
      404: { description: 'Not found' },
    },
  },
  put: {
    tags: [name],
    summary: `Update a ${name} entry`,
    security: [{ bearerAuth: [] }],
    parameters: [{ name: 'appid', in: 'path', required: true, schema: { type: 'integer' } }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { $ref: '#/components/schemas/EntryPatch' } } },
    },
    responses: {
      200: { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Entry' } } } },
      400: { description: 'Validation error' },
      401: { description: 'Missing or invalid JWT' },
      403: { description: 'Insufficient permissions (WRITE required)' },
      404: { description: 'Not found' },
    },
  },
  delete: {
    tags: [name],
    summary: `Delete a ${name} entry`,
    security: [{ bearerAuth: [] }],
    parameters: [{ name: 'appid', in: 'path', required: true, schema: { type: 'integer' } }],
    responses: {
      204: { description: 'Deleted' },
      401: { description: 'Missing or invalid JWT' },
      403: { description: 'Insufficient permissions (DELETE required)' },
      404: { description: 'Not found' },
    },
  },
});

const collections = ['library', 'planner', 'wishlist', 'history'];

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Game Activity Tracker API',
    version: '1.0.0',
    description:
      'Lab 7 — REST API for the Game Activity Tracker (Lab 6).\n\n' +
      'All `/api/*` endpoints require a Bearer JWT obtained from `/token`.\n' +
      'Tokens expire after 1 minute (per lab requirement).\n\n' +
      'Roles map to permissions: ADMIN → READ+WRITE+DELETE, WRITER → READ+WRITE, VISITOR → READ.\n' +
      'You can also pass a `permissions` array directly.',
  },
  servers: [{ url: 'http://localhost:4000', description: 'Local dev' }],
  tags: collections.map((name) => ({ name, description: `${name} entries CRUD` })).concat([
    { name: 'auth', description: 'JWT issuance' },
  ]),
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      TokenRequest: {
        type: 'object',
        properties: {
          role: { type: 'string', enum: ['ADMIN', 'WRITER', 'VISITOR'] },
          permissions: { type: 'array', items: { type: 'string', enum: ['READ', 'WRITE', 'DELETE'] } },
          subject: { type: 'string' },
        },
      },
      TokenResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          tokenType: { type: 'string', example: 'Bearer' },
          expiresIn: { type: 'string', example: '60s' },
          expiresAt: { type: 'integer', description: 'Expiration timestamp in ms since epoch' },
          permissions: { type: 'array', items: { type: 'string' } },
          role: { type: 'string', nullable: true },
        },
      },
      Entry: {
        type: 'object',
        required: ['appid', 'name'],
        properties: {
          appid: { type: 'integer' },
          name: { type: 'string' },
          developer: { type: 'string' },
          addedAt: { type: 'integer', description: 'ms since epoch' },
          notificationDateTime: { type: 'string', nullable: true },
          wantToBuy: { type: 'boolean' },
          completedDate: { type: 'integer', nullable: true },
          playedAt: { type: 'integer', nullable: true },
          durationMinutes: { type: 'integer', nullable: true },
        },
      },
      EntryInput: {
        allOf: [{ $ref: '#/components/schemas/Entry' }],
      },
      EntryPatch: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          developer: { type: 'string' },
          notificationDateTime: { type: 'string', nullable: true },
          wantToBuy: { type: 'boolean' },
          completedDate: { type: 'integer', nullable: true },
          playedAt: { type: 'integer', nullable: true },
          durationMinutes: { type: 'integer', nullable: true },
        },
      },
      PaginatedEntries: {
        type: 'object',
        properties: {
          collection: { type: 'string' },
          total: { type: 'integer' },
          limit: { type: 'integer' },
          offset: { type: 'integer' },
          count: { type: 'integer' },
          items: { type: 'array', items: { $ref: '#/components/schemas/Entry' } },
        },
      },
    },
  },
  paths: {
    '/token': {
      post: {
        tags: ['auth'],
        summary: 'Issue a JWT (role/permissions in body)',
        requestBody: {
          required: false,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenRequest' } } },
        },
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenResponse' } } } },
        },
      },
      get: {
        tags: ['auth'],
        summary: 'Issue a JWT (role/permissions via query)',
        parameters: [
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['ADMIN', 'WRITER', 'VISITOR'] } },
          { name: 'permissions', in: 'query', schema: { type: 'string', description: 'Comma-separated, e.g. READ,WRITE' } },
          { name: 'subject', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenResponse' } } } },
        },
      },
    },
    ...Object.fromEntries(
      collections.flatMap((name) => [
        [`/api/${name}`, collectionPath(name)],
        [`/api/${name}/{appid}`, itemPath(name)],
      ])
    ),
  },
};
