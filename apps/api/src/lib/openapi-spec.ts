export const OPENAPI_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'Guardian API',
    version: '1.0.2',
    description:
      'Local-first security monitoring API. Risk assessments and alerts are derived from network metadata only — no packet payloads.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local development' }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        tags: ['System'],
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponseHealth' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        summary: 'Login with email and password',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'JWT access token and user profile' },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/api/v1/auth/me': {
      get: {
        summary: 'Current authenticated user',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'User profile' },
          '401': { description: 'Missing or invalid token' },
        },
      },
    },
    '/api/v1/auth/users': {
      get: {
        summary: 'List users (admin only)',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'All customer and admin accounts' },
          '403': { description: 'Requires ADMIN role' },
        },
      },
      post: {
        summary: 'Create user (admin only)',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  name: { type: 'string' },
                  role: { type: 'string', enum: ['ADMIN', 'CUSTOMER'] },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'User created' },
          '409': { description: 'Email already registered' },
        },
      },
    },
    '/api/v1/apps': {
      get: {
        summary: 'List apps with risk levels',
        tags: ['Apps'],
        responses: {
          '200': {
            description: 'List of monitored apps',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponseAppList' },
              },
            },
          },
        },
      },
    },
    '/api/v1/apps/{id}': {
      get: {
        summary: 'Get app details',
        tags: ['Apps'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'App details with assessment' },
          '404': { description: 'App not found' },
        },
      },
    },
    '/api/v1/apps/{id}/events': {
      get: {
        summary: 'List network events for an app',
        tags: ['Apps'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: {
          '200': { description: 'Network events for the app' },
          '404': { description: 'App not found' },
        },
      },
    },
    '/api/v1/apps/{id}/risk': {
      get: {
        summary: 'Get latest risk assessment for an app',
        tags: ['Apps'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Risk assessment' },
          '404': { description: 'App or assessment not found' },
        },
      },
    },
    '/api/v1/dashboard/summary': {
      get: {
        summary: 'Dashboard summary',
        tags: ['Dashboard'],
        responses: { '200': { description: 'Risk counts, device totals, and recent alerts' } },
      },
    },
    '/api/v1/devices': {
      get: {
        summary: 'List connected and virtual devices',
        tags: ['Devices'],
        responses: { '200': { description: 'List of devices with risk counts' } },
      },
    },
    '/api/v1/devices/register': {
      post: {
        summary: 'Register or update a device (lab / sync)',
        tags: ['Devices'],
        responses: {
          '201': { description: 'Registered device' },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/api/v1/devices/{id}': {
      get: {
        summary: 'Get device by ID',
        tags: ['Devices'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Device details' },
          '404': { description: 'Device not found' },
        },
      },
    },
    '/api/v1/devices/{id}/summary': {
      get: {
        summary: 'Device dashboard summary',
        tags: ['Devices'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Device summary with recent alerts' },
          '404': { description: 'Device not found' },
        },
      },
    },
    '/api/v1/devices/{id}/apps': {
      get: {
        summary: 'List apps monitored on a device',
        tags: ['Devices'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Apps with risk levels' },
          '404': { description: 'Device not found' },
        },
      },
    },
    '/api/v1/devices/{id}/alerts': {
      get: {
        summary: 'List alerts for a device',
        tags: ['Devices'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'acknowledged', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          '200': { description: 'Alerts for device' },
          '404': { description: 'Device not found' },
        },
      },
    },
    '/api/v1/devices/{id}/demo': {
      post: {
        summary: 'Run Photo Cleaner demo scenario for a device (simulator mode)',
        tags: ['Devices'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Demo triggered' },
          '404': { description: 'Device not found' },
        },
      },
    },
    '/api/v1/events': {
      get: {
        summary: 'List network events',
        tags: ['Events'],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'appId', in: 'query', schema: { type: 'string' } },
          { name: 'deviceId', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Paginated network events' } },
      },
    },
    '/api/v1/events/batch': {
      post: {
        summary: 'Ingest batched network events from mobile',
        tags: ['Events'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EventBatchInput' },
            },
          },
        },
        responses: {
          '200': { description: 'Accepted event count' },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/api/v1/alerts': {
      get: {
        summary: 'List alerts',
        tags: ['Alerts'],
        parameters: [
          {
            name: 'acknowledged',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Filter by acknowledgement status',
          },
        ],
        responses: { '200': { description: 'List of alerts' } },
      },
    },
    '/api/v1/alerts/{id}': {
      get: {
        summary: 'Get alert by ID',
        tags: ['Alerts'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Alert details' },
          '404': { description: 'Alert not found' },
        },
      },
    },
    '/api/v1/alerts/{id}/block': {
      post: {
        summary: 'Block the domain associated with an alert',
        tags: ['Alerts'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Alert updated with BLOCK action' },
          '404': { description: 'Alert not found' },
        },
      },
    },
    '/api/v1/alerts/{id}/allow': {
      post: {
        summary: 'Allow the connection and acknowledge the alert',
        tags: ['Alerts'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Alert updated with ALLOW action' },
          '404': { description: 'Alert not found' },
        },
      },
    },
    '/api/v1/alerts/{id}/ignore': {
      post: {
        summary: 'Dismiss the alert without blocking or allowing',
        tags: ['Alerts'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Alert updated with IGNORE action' },
          '404': { description: 'Alert not found' },
        },
      },
    },
    '/api/v1/domains/{domain}/reputation': {
      get: {
        summary: 'Look up domain reputation (tracker database)',
        tags: ['Domains'],
        parameters: [{ name: 'domain', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Domain reputation (tracker flag, category, score)' },
          '400': { description: 'Invalid domain name' },
        },
      },
    },
    '/api/v1/openapi': {
      get: {
        summary: 'OpenAPI specification',
        tags: ['System'],
        responses: { '200': { description: 'This specification document' } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ApiResponseHealth: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: { status: { type: 'string', example: 'ok' } },
          },
        },
      },
      ApiResponseAppList: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/components/schemas/AppWithRisk' } },
        },
      },
      AppWithRisk: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          packageName: { type: 'string' },
          displayName: { type: 'string' },
          riskLevel: { type: 'string', enum: ['SAFE', 'UNUSUAL', 'SUSPICIOUS'] },
          riskScore: { type: 'integer' },
        },
      },
      EventBatchInput: {
        type: 'object',
        required: ['deviceId', 'networkEvents'],
        properties: {
          deviceId: { type: 'string', format: 'uuid' },
          networkEvents: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                appPackageName: { type: 'string' },
                domain: { type: 'string' },
                bytesSent: { type: 'integer' },
                bytesReceived: { type: 'integer' },
                isNewDomain: { type: 'boolean' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
  },
};
