import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { UpstreamError } from './upstream_error.js';

interface ValidationIssue {
  instancePath: string;
  message: string;
}

/** Renders zod field issues into one flat, browser-safe message. */
function describeValidation(validation: readonly ValidationIssue[]): string {
  return validation
    .map((issue) => {
      const field = issue.instancePath.replace(/^\//, '').replace(/\//g, '.');
      return field ? `${field}: ${issue.message}` : issue.message;
    })
    .join('; ');
}

/**
 * Single error handler for the whole app, so every non-2xx body matches
 * `errorResponseSchema` (`{ error, message }`) instead of Fastify's default
 * `{ statusCode, error, message }`. Three cases:
 *
 * - request validation (zod) → `400 bad_request` with the field issues;
 * - {@link UpstreamError} from a BFF service → its carried `502` body;
 * - anything else → an opaque `500`, with the real error kept in the logs.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const message = describeValidation(error.validation);
      return reply.code(400).send({ error: 'bad_request', message });
    }

    if (error instanceof UpstreamError) {
      return reply.code(error.statusCode).send({
        error: error.publicError,
        message: error.publicMessage,
      });
    }

    request.log.error(error, 'unhandled error');
    return reply
      .code(500)
      .send({ error: 'internal_error', message: 'an unexpected error occurred' });
  });
}
