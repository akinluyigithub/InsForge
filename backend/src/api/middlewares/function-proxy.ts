import { Request, Response } from 'express';
import fetch from 'node-fetch';
import logger from '@/utils/logger.js';
import { FunctionService } from '@/services/functions/function.service.js';

/**
 * Middleware to proxy requests to edge functions (Deno runtime)
 */
export async function functionProxyHandler(req: Request, res: Response) {
    const { slug } = req.params;

    try {
        const functionService = FunctionService.getInstance();
        const localRuntime = process.env.DENO_RUNTIME_URL || 'http://localhost:7133';

        // Get target base URL: prefer Subhosting deployment, fallback to local runtime
        const baseUrl =
            (functionService.isSubhostingConfigured() && (await functionService.getDeploymentUrl())) ||
            localRuntime;

        // Build target URL with query string
        const targetUrl = new URL(`/${slug}`, baseUrl);
        const incomingUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        targetUrl.search = incomingUrl.search;

        // Build headers, filtering out non-string values and overriding host
        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') {
                headers[key] = value;
            }
        }
        headers.host = targetUrl.host;

        logger.debug('Proxying function request', { slug, targetUrl: targetUrl.toString() });

        const response = await fetch(targetUrl.toString(), {
            method: req.method,
            headers,
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
        });

        // Read response as raw bytes to preserve binary data
        const responseBody = Buffer.from(await response.arrayBuffer());

        // Forward response headers, excluding hop-by-hop and encoding headers
        const responseHeaders: Record<string, string> = {};
        for (const [key, value] of response.headers.entries()) {
            if (
                ['transfer-encoding', 'content-length', 'connection', 'content-encoding'].includes(key)
            ) {
                continue;
            }
            responseHeaders[key] = value;
        }

        res
            .status(response.status)
            .set(responseHeaders)
            .set('Access-Control-Allow-Origin', '*')
            .send(responseBody);
    } catch (error) {
        logger.error('Failed to proxy function', { slug, error: String(error) });
        res.status(502).json({
            error: 'GATEWAY_ERROR',
            message: 'Failed to reach edge function runtime',
            details: error instanceof Error ? error.message : String(error)
        });
    }
}
