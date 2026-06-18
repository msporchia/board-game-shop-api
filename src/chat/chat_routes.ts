import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { errorResponseSchema } from '../core/error_response.js';
import { customerHeadersSchema, customerIdFromHeaders } from '../customers/customer_headers.js';
import { chatRequestSchema, chatResponseSchema } from './chat.js';
import { ChatUpstreamError, type ChatService } from './chat_service.js';

/**
 * /chat route. This is the browser-facing contract for the RAG seller: the web
 * never calls the Python service directly.
 */
export class ChatRoutes {
  constructor(private readonly service: ChatService) {}

  register(app: FastifyInstance): void {
    const typed = app.withTypeProvider<ZodTypeProvider>();

    typed.post(
      '/chat',
      {
        schema: {
          tags: ['chat'],
          summary: 'Conversational advisor turn with buyable recommendations',
          headers: customerHeadersSchema,
          body: chatRequestSchema,
          response: { 200: chatResponseSchema, 502: errorResponseSchema },
        },
      },
      async (request, reply) => {
        try {
          return await this.service.reply(customerIdFromHeaders(request.headers), request.body);
        } catch (error) {
          if (error instanceof ChatUpstreamError) {
            return reply.code(502).send({
              error: 'seller_unavailable',
              message: 'the AI seller did not return a usable chat response',
            });
          }
          throw error;
        }
      },
    );
  }
}
