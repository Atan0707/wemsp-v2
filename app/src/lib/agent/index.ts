import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'
import { AGENT_SYSTEM_PROMPT } from './system-prompt'
import { buildAgentTools } from './tools'

type HistoryMessage = {
  role: 'user' | 'assistant'
  content: string
}

type RunAgentTurnInput = {
  userId: string
  message: string
  history?: HistoryMessage[]
}

function contentToText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map((c) => JSON.stringify(c)).join('\n')
  return JSON.stringify(content)
}

export async function runAgentTurn(input: RunAgentTurnInput) {
  const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.2,
  })

  const tools = buildAgentTools({ userId: input.userId })
  const toolMap = new Map(tools.map((t) => [t.name, t]))

  const historyMessages = (input.history || []).slice(-10).map((m) => {
    if (m.role === 'assistant') return new AIMessage(m.content)
    return new HumanMessage(m.content)
  })

  const baseMessages = [
    new SystemMessage(AGENT_SYSTEM_PROMPT),
    ...historyMessages,
    new HumanMessage(input.message),
  ]

  const first = await model.bindTools(tools).invoke(baseMessages)

  const toolMessages: ToolMessage[] = []

  for (const call of first.tool_calls ?? []) {
    const matchedTool = toolMap.get(call.name)

    if (!matchedTool) {
      toolMessages.push(
        new ToolMessage({
          content: `Tool not found: ${call.name}`,
          tool_call_id: call.id ?? call.name,
        })
      )
      continue
    }

    try {
      const result = await matchedTool.invoke(call.args)
      toolMessages.push(
        new ToolMessage({
          content: contentToText(result),
          tool_call_id: call.id ?? matchedTool.name,
        })
      )
    } catch (error) {
      toolMessages.push(
        new ToolMessage({
          content: `Tool error (${matchedTool.name}): ${error instanceof Error ? error.message : 'Unknown error'}`,
          tool_call_id: call.id ?? matchedTool.name,
        })
      )
    }
  }

  const finalResponse =
    toolMessages.length > 0
      ? await model.bindTools(tools).invoke([...baseMessages, first, ...toolMessages])
      : first

  return {
    text: contentToText(finalResponse.content),
    toolCalls: (first.tool_calls ?? []).map((c) => ({ name: c.name })),
  }
}
