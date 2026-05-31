import { Readable } from 'stream';
import app from '../../backend/src/app.js';

/**
 * Micro-gateway Request/Response Adapter.
 * Translates Web API Request objects to Node.js http.IncomingMessage mock streams,
 * runs the Express application in-memory, collects http.ServerResponse output chunks,
 * and compiles them back into standard Web API Response objects.
 */
export async function handleExpressRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  return new Promise(async (resolve, reject) => {
    const headers: Record<string, string[]> = {};
    let statusCode = 200;
    const bodyChunks: Buffer[] = [];

    // 1. Mock Node.js http.ServerResponse stream
    const res: any = {
      headersSent: false,
      statusCode: 200,
      headers: {},
      setHeader(name: string, value: any) {
        headers[name.toLowerCase()] = Array.isArray(value) ? value : [String(value)];
        return this;
      },
      getHeader(name: string) {
        return headers[name.toLowerCase()]?.[0];
      },
      getHeaders() {
        return headers;
      },
      hasHeader(name: string) {
        return name.toLowerCase() in headers;
      },
      removeHeader(name: string) {
        delete headers[name.toLowerCase()];
      },
      write(chunk: any) {
        if (chunk) {
          bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return true;
      },
      end(chunk: any) {
        if (chunk) {
          bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }

        // Build standard Web Response
        const webHeaders = new Headers();
        for (const [name, values] of Object.entries(headers)) {
          values.forEach((v) => webHeaders.append(name, v));
        }

        const responseBody = Buffer.concat(bodyChunks);
        const webResponse = new Response(responseBody, {
          status: this.statusCode,
          headers: webHeaders,
        });

        resolve(webResponse);
      },
    };

    // Object.defineProperty to support res.statusCode assignment
    Object.defineProperty(res, 'statusCode', {
      get() {
        return statusCode;
      },
      set(val) {
        statusCode = val;
      },
    });

    // 2. Mock Node.js http.IncomingMessage stream from Web Request
    let requestBodyText = '';
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
      try {
        requestBodyText = await request.text();
      } catch (err) {
        console.error('Failed to read Web request body text:', err);
      }
    }

    const req: any = Readable.from(Buffer.from(requestBodyText));

    req.method = request.method;
    req.url = url.pathname + url.search;
    req.headers = {};
    request.headers.forEach((val, key) => {
      req.headers[key.toLowerCase()] = val;
    });

    // 3. Delegate to Express app request listener
    try {
      app(req, res);
    } catch (err) {
      console.error('Express in-memory request execution crashed:', err);
      reject(err);
    }
  });
}
