// StoryCard schema for Claude parsing prompt
// 파싱 결과는 한국어로 출력, 스크립트 생성 시 영어로 변환
export function getStoryCardSchema(): string {
  return JSON.stringify({
    type: 'object',
    properties: {
      id: { type: 'string', description: 'UUID v4' },
      title: { type: 'string', description: '한국어 스토리 제목 (예: "선비의 귀신 사랑")' },
      title_en: { type: 'string', description: 'English title for reference' },
      source: { type: 'string', description: '출전 (어우야담, 청구야담 등)' },
      source_hanja: { type: 'string', description: '출전 한자 (於于野談 등)' },
      category: {
        type: 'string',
        enum: ['supernatural', 'political', 'romance', 'wisdom', 'tragedy', 'adventure'],
      },
      summary: { type: 'string', description: '한국어 스토리 요약 (200자 이내, 기승전결 구조)' },
      characters: { type: 'array', items: { type: 'string' }, description: '등장인물 (한국어)' },
      setting: { type: 'string', description: '시대/배경 (예: "조선 중기, 한양")' },
      wow_factor: { type: 'string', description: '한국어로 이 이야기의 놀라운 포인트' },
      sajaseongeo: { type: 'string', description: '관련 사자성어 (한글, 예: 생사화복)' },
      sajaseongeo_hanja: { type: 'string', description: '사자성어 한자 (예: 生死禍福)' },
      sajaseongeo_meaning: { type: 'string', description: '사자성어 뜻풀이 (한국어)' },
      korean_lesson_word: { type: 'string', description: '핵심 한국어 단어 (한글)' },
      korean_lesson_hanja: { type: 'string', description: '한자 (해당 시)' },
      korean_lesson_meaning: { type: 'string', description: '단어 뜻풀이 (한국어)' },
      korean_lesson_example: { type: 'string', description: '예문 (한국어)' },
      cultural_significance: { type: 'string', description: '문화적 의의 (한국어)' },
      western_appeal: { type: 'string', description: '서양 관객에게 매력적인 포인트 (한국어)' },
      estimated_duration_seconds: { type: 'integer' },
    },
    required: [
      'id', 'title', 'title_en', 'source', 'source_hanja', 'category', 'summary',
      'characters', 'setting', 'wow_factor', 'sajaseongeo', 'sajaseongeo_hanja',
      'sajaseongeo_meaning', 'korean_lesson_word', 'korean_lesson_meaning',
      'korean_lesson_example', 'cultural_significance', 'western_appeal',
    ],
  }, null, 2)
}

// Parsing prompt template — 한국어 출력
export const PARSING_PROMPT = `# 한국 야사 스토리 파싱

당신은 한국 고전 문학과 역사 서사의 전문가입니다. 아래 출전에서 흥미로운 야사(野史) 이야기를 발굴하세요.

## 출전 목록
- 어우야담 (於于野談)
- 청구야담 (靑丘野談)
- 용재총화 (慵齋叢話)
- 필원잡기 (筆苑雜記)
- 대동야승 (大東野乘)
- 연려실기술 (燃藜室記述)
- 계서야담 (溪西野談)
- 천예록 (天倪錄)
- 학산한언 (鶴山閒言)

## 과제

위 출전에서 서양 관객들이 흥미를 느낄 만한, 잘 알려지지 않은 야사 {count}개를 찾아주세요.

### 콘텐츠 요건
1. **서사 구조**: 기승전결이 명확할 것
2. **분량**: 요약 200자 이내
3. **반전/임팩트**: 놀라움, 감동, 반전이 있을 것
4. **사자성어 연결**: 각 이야기에 맞는 사자성어(四字成語)를 반드시 포함

### 카테고리 균형
- supernatural(초자연/신비) 최소 2개
- political(정치) 최소 2개
- romance(로맨스) 최소 2개
- 나머지는 자유 선택

### 한국어 단어 학습
각 이야기에 하나의 핵심 한국어 단어를 포함하세요:
- 문화적·역사적으로 의미 있는 단어
- 한글 + 한자(해당 시)

### ⚠️ 중요: 출력 언어
- **모든 텍스트 필드는 한국어로 작성하세요** (title, summary, wow_factor, characters, setting, cultural_significance, western_appeal 등)
- **title_en 필드만 영어로** 작성하세요 (참조용 영문 제목)
- category 필드는 영어 enum 값 그대로 사용 (supernatural, political, romance, wisdom, tragedy, adventure)

### 출력 형식

아래 스키마와 정확히 일치하는 JSON 배열만 출력하세요:

{schema}

마크다운 포맷, 설명, 코드 펜스 없이 순수 JSON 배열만 반환하세요.`
