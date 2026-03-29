// StoryCard schema for Claude parsing prompt
export function getStoryCardSchema(): string {
  return JSON.stringify({
    type: 'object',
    properties: {
      id: { type: 'string', description: 'UUID v4 for the story card' },
      title: { type: 'string', description: 'Compelling story title' },
      source: { type: 'string', description: 'Classical Korean source (어우야담, 청구야담, etc.)' },
      source_hanja: { type: 'string', description: 'Hanja characters of the source' },
      category: {
        type: 'string',
        enum: ['supernatural', 'political', 'romance', 'wisdom', 'tragedy', 'adventure'],
      },
      summary: { type: 'string', description: 'Story summary under 200 words' },
      characters: { type: 'array', items: { type: 'string' } },
      setting: { type: 'string', description: 'Historical period and location' },
      wow_factor: { type: 'string', description: 'What makes this story surprising' },
      sajaseongeo: { type: 'string', description: 'Related four-character idiom in Korean' },
      sajaseongeo_hanja: { type: 'string', description: 'Hanja representation' },
      sajaseongeo_meaning: { type: 'string', description: 'English translation' },
      korean_lesson_word: { type: 'string', description: 'Key Korean word (Hangul)' },
      korean_lesson_hanja: { type: 'string', description: 'Hanja for the lesson word' },
      korean_lesson_meaning: { type: 'string', description: 'English definition' },
      korean_lesson_example: { type: 'string', description: 'Example sentence' },
      cultural_significance: { type: 'string' },
      western_appeal: { type: 'string' },
      estimated_duration_seconds: { type: 'integer' },
    },
    required: [
      'id', 'title', 'source', 'source_hanja', 'category', 'summary',
      'characters', 'setting', 'wow_factor', 'sajaseongeo', 'sajaseongeo_hanja',
      'sajaseongeo_meaning', 'korean_lesson_word', 'korean_lesson_meaning',
      'korean_lesson_example', 'cultural_significance', 'western_appeal',
    ],
  }, null, 2)
}

// Parsing prompt template
export const PARSING_PROMPT = `# Korean Tales Story Parsing Prompt

You are an expert in Korean classical literature and historical narratives. Your task is to extract fascinating Korean yasa (야사, wild histories) stories from the following authoritative sources:

- 어우야담 (Eowu Yadan)
- 청구야담 (Cheonggu Yadan)
- 용재총화 (Yongjae Chonghwa)
- 필원잡기 (Pilwon Japgi)
- 대동야승 (Daedong Yaseung)
- 연려실기술 (Yeonryeo Silgi Sool)
- 계서야담 (Gyeseo Yadan)
- 천예록 (Cheonya Nok)
- 학산한언 (Haksan Haneon)

## Your Task

Find {count} fascinating, lesser-known stories from these sources that will captivate Western audiences. Each story must:

### Content Requirements
1. **Narrative Structure**: Clear beginning-middle-twist-end arc
2. **Length**: Under 200 words when summarized
3. **Wow Factor**: Contain surprising, memorable, or emotionally resonant moments
4. **Sajaseongeo Connection**: Each story must connect to a traditional Korean life philosophy (sajaseongeo 사자성어)

### Category Balance
Your selection MUST include:
- At least 2 supernatural/mystical stories
- At least 2 political intrigue stories
- At least 2 romance stories
- Remaining selections can be any category

### Korean Lesson Word Requirements
Each story must include:
- One key Korean word or concept for the "Korean Lesson" segment
- This word should be useful, cultural, or historically significant
- Include both Hangul and hanja (where applicable)

### Output Format

Output ONLY a valid JSON array. Each object MUST match this schema exactly:

{schema}

Do not include any markdown formatting, explanations, or code fences. Return only the raw JSON array.`
