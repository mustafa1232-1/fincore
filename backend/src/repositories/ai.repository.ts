import { query } from "../database/pool";

export const aiRepository = {
  async logInteraction(input: {
    tenantId: string;
    userId: string;
    prompt: string;
    response: string;
    model: string;
    metadata?: unknown;
  }): Promise<void> {
    await query(
      `
      INSERT INTO ai_logs (tenant_id, user_id, prompt, response, model, metadata)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [input.tenantId, input.userId, input.prompt, input.response, input.model, JSON.stringify(input.metadata ?? {})]
    );
  }
};
