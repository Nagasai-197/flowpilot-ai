import { createFileRoute } from '@tanstack/react-router';
import { handleExpressRequest } from '../lib/expressAdapter';

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      GET: async ({ request }) => handleExpressRequest(request),
      POST: async ({ request }) => handleExpressRequest(request),
      PUT: async ({ request }) => handleExpressRequest(request),
      DELETE: async ({ request }) => handleExpressRequest(request),
      PATCH: async ({ request }) => handleExpressRequest(request),
      OPTIONS: async ({ request }) => handleExpressRequest(request),
    },
  },
});
