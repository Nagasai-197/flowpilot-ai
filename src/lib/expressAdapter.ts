import { Readable } from 'stream';
import { EventEmitter } from 'events';
import app from '../../backend/src/app.js';

/**
 * Micro-gateway Request/Response Adapter.
 * Translates Web API Request objects to Node.js http.IncomingMessage mock streams,
 * runs the Express application in-memory, collects http.ServerResponse output chunks,
 * and compiles them back into standard Web API Response objects.
 *
 * This adapter must faithfully mock both http.IncomingMessage and http.ServerResponse
 * because Express internals plus middleware (Morgan, on-headers, on-finished,
 * express-rate-limit, helmet, cors, proxy-addr, forwarded) all reach into Node.js
 * HTTP plumbing that doesn't exist in a serverless/edge environment.
 */
export async function handleExpressRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  return new Promise(async (resolve, reject) => {
    const resHeaders: Record<string, string[]> = {};
    let statusCode = 200;
    const bodyChunks: Buffer[] = [];
    let resolved = false;

    // ─── 1. Mock http.ServerResponse ───────────────────────────────────────────
    // Must be an EventEmitter so `on-finished` can attach 'finish'/'end' listeners.
    const res: any = new EventEmitter();

    res.headersSent = false;
    res._header = null; // Morgan's headersSent check uses this as fallback
    res.finished = false;

    res.setHeader = function setHeader(name: string, value: any) {
      resHeaders[name.toLowerCase()] = Array.isArray(value) ? value : [String(value)];
      return this;
    };
    res.getHeader = function getHeader(name: string) {
      return resHeaders[name.toLowerCase()]?.[0];
    };
    res.getHeaders = function getHeaders() {
      return resHeaders;
    };
    res.hasHeader = function hasHeader(name: string) {
      return name.toLowerCase() in resHeaders;
    };
    res.removeHeader = function removeHeader(name: string) {
      delete resHeaders[name.toLowerCase()];
    };

    // writeHead is required by `on-headers` (Morgan hooks into this).
    res.writeHead = function writeHead(code: number, ...args: any[]) {
      statusCode = code;
      res.statusCode = code;
      // Process optional headers argument
      const headerArg = args.find((a) => a && typeof a === 'object');
      if (headerArg) {
        if (Array.isArray(headerArg)) {
          for (let i = 0; i < headerArg.length; i += 2) {
            res.setHeader(headerArg[i], headerArg[i + 1]);
          }
        } else {
          for (const [k, v] of Object.entries(headerArg)) {
            res.setHeader(k, v as string);
          }
        }
      }
      res.headersSent = true;
      res._header = true;
      return this;
    };

    res.write = function write(chunk: any) {
      if (chunk) {
        bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return true;
    };

    res.end = function end(chunk: any) {
      if (resolved) return;
      if (chunk) {
        bodyChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      res.headersSent = true;
      res._header = true;
      res.finished = true;

      // Emit 'finish' so on-finished / Morgan logRequest fires
      res.emit('finish');

      // Build standard Web Response
      const webHeaders = new Headers();
      for (const [name, values] of Object.entries(resHeaders)) {
        (values as string[]).forEach((v) => webHeaders.append(name, v));
      }

      const responseBody = Buffer.concat(bodyChunks);
      const webResponse = new Response(responseBody, {
        status: statusCode,
        headers: webHeaders,
      });

      resolved = true;
      resolve(webResponse);
    };

    // Express's res.json / res.send call res.status().json() chain
    res.status = function status(code: number) {
      statusCode = code;
      res.statusCode = code;
      return res;
    };

    res.json = function json(body: any) {
      const str = JSON.stringify(body);
      res.setHeader('content-type', 'application/json');
      res.end(str);
    };

    res.send = function send(body: any) {
      if (typeof body === 'object' && body !== null && !Buffer.isBuffer(body)) {
        return res.json(body);
      }
      res.end(body);
    };

    // Object.defineProperty to support res.statusCode assignment
    Object.defineProperty(res, 'statusCode', {
      get() {
        return statusCode;
      },
      set(val) {
        statusCode = val;
      },
      configurable: true,
      enumerable: true,
    });

    // ─── 2. Mock http.IncomingMessage from Web Request ─────────────────────────
    let requestBodyText = '';
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
      try {
        requestBodyText = await request.text();
      } catch (err) {
        console.error('Failed to read Web request body text:', err);
      }
    }

    const req: any = new Readable();
    req._read = () => {};
    req.push(Buffer.from(requestBodyText));
    req.push(null);

    req.method = request.method;
    req.url = url.pathname + url.search;
    req.originalUrl = url.pathname + url.search;
    req.headers = {};
    request.headers.forEach((val, key) => {
      req.headers[key.toLowerCase()] = val;
    });

    // Ensure content-type header is set for body parsers
    if (!req.headers['content-type'] && request.method !== 'GET' && request.method !== 'HEAD') {
      req.headers['content-type'] = 'application/json';
    }

    // Mock httpVersion for Morgan's :http-version token
    req.httpVersionMajor = 1;
    req.httpVersionMinor = 1;
    req.httpVersion = '1.1';

    // Mock network socket properties to support rate-limit, logger, and Express internals.
    // Express's req.ip, req.protocol, req.host getters, the `forwarded` module, and Morgan
    // all access req.socket.remoteAddress or req.connection.remoteAddress.
    // Readable.from() streams have a prototype .socket property (null/undefined) that
    // shadows simple assignments, so we use Object.defineProperty to guarantee our mock wins.
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const mockSocket: any = new EventEmitter();
    mockSocket.remoteAddress = clientIp;
    mockSocket.encrypted = false;
    mockSocket.writable = true;
    mockSocket.readable = true;
    mockSocket.destroy = () => {};

    Object.defineProperty(req, 'socket', {
      value: mockSocket,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(req, 'connection', {
      value: mockSocket,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    req.ip = clientIp;

    // Attach the mock socket to the response as well (on-finished checks res.socket)
    res.socket = mockSocket;
    res.connection = mockSocket;

    // ─── 3. Delegate to Express app ───────────────────────────────────────────
    try {
      app(req, res);
    } catch (err) {
      console.error('Express in-memory request execution crashed:', err);
      if (!resolved) {
        resolved = true;
        reject(err);
      }
    }
  });
}
