import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getStoryCardSchema, PARSING_PROMPT } from '@/lib/schemas'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function stripMarkdownFences(text: string): string {
  let t = text.trim()
  if (t.startsWith('```json')) t = t.slice(7)
  else if (t.startsWith('```')) t = t.slice(3)
  if (t.endsWith('```')) t = t.slice(0, -3)
  return t.trim()
}

export async function POST(req: NextRequest) {
  try {
    const { count = 10, batch_id } = await req.json()

    const schema = getStoryCardSchema()
    const prompt = PARSING_PROMPT
      .replace('{count}', String(count))
      .replace('{schema}', schema)

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      thinking: { type: 'enabled', budget_tokens: 5000 },
      messages: [{ role: 'user', content: prompt }],
    })

    // Extract text block (skip ThinkingBlock)
    let responseText = ''
    for (const block of response.content) {
      if ('text' in block) {
        responseText = block.text
        break
      }
    }

    if (!responseText) {
      return NextResponse.json({ error: 'No text block in Claude response' }, { status: 500 })
    }

    const cleaned = stripMarkdownFences(responseText)
    const stories = JSON.parse(cleaned)

    if (!Array.isArray(stories)) {
      return NextResponse.json({ error: 'Response is not a JSON array' }, { status: 500 })
    }

    // Assign UUIDs
    for (const story of stories) {
      if (!story.id) {
        story.id = crypto.randomUUID()
      }
    }

    // Validate required fields
    const required = [
      'id', 'title', 'source', 'category', 'summary',
      'sajaseongeo', 'korean_lesson_word', 'korean_lesson_meaning',
    ]
    const valid = stories.filter((s: any) =>
      required.every(f => s[f] !== undefined && s[f] !== null && s[f] !== '')
    )

    return NextResponse.json({
      stories: valid,
      batch_id: batch_id || new Date().toISOString().slice(2, 10).replace(/-/g, ''),
      parsed_count: stories.length,
      valid_count: valid.length,
    })
  } catch (e: any) {
    console.error('Parse error:', e)
    return NextResponse.json({ error: e.message || 'Parse failed' }, { status: 500 })
  }
}
