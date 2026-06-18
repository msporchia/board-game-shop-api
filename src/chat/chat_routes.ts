import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { errorResponseSchema } from '../core/error_response.js';
import { customerHeadersSchema, customerIdFromHeaders } from '../customers/customer_headers.js';
import { chatRequestSchema, chatResponseSchema } from './chat.js';
import type { ChatService } from './chat_service.js';

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
      (request) => this.service.reply(customerIdFromHeaders(request.headers), request.body),
    );
  }
}
