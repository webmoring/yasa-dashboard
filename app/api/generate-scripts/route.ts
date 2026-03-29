import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SCRIPT_PROMPT } from '@/lib/prompts'
import { saveState, loadState } from '@/lib/state'

export const maxDuration = 60 // Pro plan: 60s timeout

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function stripMarkdownFences(text: string): string {
  let t = text.trim()
  if (t.startsWith('```json')) t = t.slice(7)
  else if (t.startsWith('```')) t = t.slice(3)
  if (t.endsWith('```')) t = t.slice(0, -3)
  return t.trim()
}

// Generate script for a SINGLE story (called once per story from frontend)
export async function POST(req: NextRequest) {
  try {
    const { story, batch_id, index, total } = await req.json()

    if (!story) {
      return NextResponse.json({ error: 'No story provided' }, { status: 400 })
    }

    console.log(`[${index + 1}/${total}] Generating script for: ${story.title}`)

    const prompt = SCRIPT_PROMPT.replace(
      '{story_card_json}',
      JSON.stringify(story, null, 2)
    )

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 12000,
      thinking: { type: 'enabled', budget_tokens: 8000 },
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
      return NextResponse.json({ error: `No text block for: ${story.title}` }, { status: 500 })
    }

    const cleaned = stripMarkdownFences(responseText)

    try {
      const episodeScript = JSON.parse(cleaned)

      // Assign episode ID
      const epNum = String(index + 1).padStart(2, '0')
      episodeScript.ep_id = `EP_${batch_id}_${epNum}`
      episodeScript.story_id = story.id

      // Validate critical nested fields
      if (!episodeScript.script || !episodeScript.visual_prompts || !episodeScript.content_metadata) {
        return NextResponse.json({
          error: `Missing required sections for: ${story.title}`,
        }, { status: 500 })
      }

      // Save accumulated scripts to server state
      const state = await loadState(batch_id)
      const existingScripts = state?.scripts || []
      existingScripts.push(episodeScript)
      await saveState(batch_id, {
        ...state,
        step: index + 1 >= total ? 'reviewing' : 'generating',
        scripts: existingScripts,
        updated_at: new Date().toISOString(),
      })

      console.log(`  ✅ ${episodeScript.ep_id}: ${episodeScript.title}`)

      return NextResponse.json({
        script: episodeScript,
        progress: { current: index + 1, total },
      })
    } catch (parseErr: any) {
      return NextResponse.json({
        error: `JSON parse error for: ${story.title} — ${parseErr.message}`,
      }, { status: 500 })
    }
  } catch (e: any) {
    console.error('Script generation error:', e)
    return NextResponse.json({ error: e.message || 'Script generation failed' }, { status: 500 })
  }
}
