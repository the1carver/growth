import { IntegrationDefinitionProps, z } from '@botpress/sdk'

export const forceStopHitl = {
    input: {
        schema: z.object({
            conversationId: z.string().describe('Downstream conversation id'),
        })
    },
    output: { schema: z.object({}) },
}

export const actions = {
    forceStopHitl
} as const satisfies IntegrationDefinitionProps['actions']
