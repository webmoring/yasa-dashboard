import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SCRIPT_PROMPT } from '@/lib/prompts'

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
    const { stories, batch_id } = await req.json()

    if (!stories || !Array.isArray(stories) || stories.length === 0) {
      return NextResponse.json({ error: 'No stories provided' }, { status: 400 })
    }

    const scripts = []

    for (let i = 0; i < stories.length; i++) {
      const story = stories[i]
      console.log(`[${i + 1}/${stories.length}] Generating script for: ${story.title}`)

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
        console.error(`No text block for story: ${story.title}`)
        continue
      }

      const cleaned = stripMarkdownFences(responseText)

      try {
        const episodeScript = JSON.parse(cleaned)

        // Assign episode ID
        const epNum = String(i + 1).padStart(2, '0')
        episodeScript.ep_id = `EP_${batch_id}_${epNum}`
        episodeScript.story_id = story.id

        // Validate critical nested fields
        if (episodeScript.script && episodeScript.visual_prompts && episodeScript.content_metadata) {
          scripts.push(episodeScript)
          console.log(`  ✅ ${episodeScript.ep_id}: ${episodeScript.title}`)
        } else {
          console.error(`  ❌ Missing required sections for: ${story.title}`)
        }
      } catch (parseErr) {
        console.error(`  ❌ JSON parse error for: ${story.title}`, parseErr)
      }
    }

    return NextResponse.json({
      scripts,
      generated_count: scripts.length,
      total_requested: stories.length,
      batch_id,
    })
  } catch (e: any) {
    console.error('Script generation error:', e)
    return NextResponse.json({ error: e.message || 'Script generation failed' }, { status: 500 })
  }
}
