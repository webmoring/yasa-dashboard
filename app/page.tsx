'use client'

import { useState, useCallback, useEffect } from 'react'

// ── Types ──
interface StoryCard {
  id: string
  title: string
  source: string
  source_hanja: string
  category: string
  summary: string
  characters: string[]
  setting: string
  wow_factor: string
  sajaseongeo: string
  sajaseongeo_hanja: string
  sajaseongeo_meaning: string
  korean_lesson_word: string
  korean_lesson_meaning: string
  cultural_significance: string
  western_appeal: string
  title_en?: string
}

interface EpisodeScript {
  ep_id: string
  story_id: string
  title: string
  youtube_title: string
  script: {
    hook: string
    ki_rise: string
    seung_build: string
    jeon_twist: string
    gyeol_moral: string
    korean_lesson: string
    estimated_duration_seconds: number
  }
  visual_prompts: {
    thumbnail_prompt: string
    punch_prompts: string[]
    scene_prompts: string[]
  }
  content_metadata: {
    hashtags: string[]
    sajaseongeo: {
      korean: string
      hanja: string
      english_translation: string
    }
    korean_lesson: {
      word: string
      romanization: string
      meaning: string
    }
  }
  audio: { bgm_mood: string }
}

type Step = 'idle' | 'parsing' | 'selecting' | 'generating' | 'reviewing' | 'automating' | 'complete'

const CATEGORY_COLORS: Record<string, string> = {
  supernatural: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  political: 'bg-red-500/20 text-red-300 border-red-500/30',
  romance: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  wisdom: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  tragedy: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  adventure: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
}

const CATEGORY_LABELS: Record<string, string> = {
  supernatural: '초자연',
  political: '정치',
  romance: '로맨스',
  wisdom: '지혜',
  tragedy: '비극',
  adventure: '모험',
}

// ── Main Page ──
export default function Dashboard() {
  const [step, setStep] = useState<Step>('idle')
  const [stories, setStories] = useState<StoryCard[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [scripts, setScripts] = useState<EpisodeScript[]>([])
  const [log, setLog] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' })
  const [batchId, setBatchId] = useState(new Date().toISOString().slice(2, 10).replace(/-/g, ''))
  const [isRestoring, setIsRestoring] = useState(true)

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString('ko-KR')}] ${msg}`])
  }, [])

  // ── Restore state on page load ──
  useEffect(() => {
    async function restoreState() {
      try {
        const res = await fetch('/api/state')
        const data = await res.json()
        if (data.found && data.state) {
          const s = data.state
          setBatchId(s.batch_id)

          if (s.stories && s.stories.length > 0) {
            setStories(s.stories)
          }
          if (s.selectedIds && s.selectedIds.length > 0) {
            setSelectedIds(new Set(s.selectedIds))
          }
          if (s.scripts && s.scripts.length > 0) {
            setScripts(s.scripts)
          }

          // Restore to appropriate step
          if (s.step === 'reviewing' || (s.scripts && s.scripts.length > 0)) {
            setStep('reviewing')
            addLog('이전 세션 복원: 스크립트 검토 단계')
          } else if (s.step === 'selecting' || (s.stories && s.stories.length > 0)) {
            setStep('selecting')
            addLog('이전 세션 복원: 스토리 선택 단계')
          }
        }
      } catch (e) {
        console.log('No previous state to restore')
      } finally {
        setIsRestoring(false)
      }
    }
    restoreState()
  }, [addLog])

  // ── Step 1: Parse Stories ──
  const handleParse = async () => {
    setStep('parsing')
    setError(null)
    setLog([])
    setScripts([])
    setSelectedIds(new Set())
    const newBatchId = new Date().toISOString().slice(2, 10).replace(/-/g, '')
    setBatchId(newBatchId)
    addLog('파싱 시작...')
    setProgress({ current: 0, total: 1, label: 'Claude API로 야사 스토리 파싱 중...' })

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 10, batch_id: newBatchId }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Parse failed')
      }

      const data = await res.json()
      setStories(data.stories)
      addLog(`파싱 완료: ${data.stories.length}개 스토리`)
      setStep('selecting')
    } catch (e: any) {
      setError(e.message)
      addLog(`오류: ${e.message}`)
      setStep('idle')
    }
  }

  // ── Step 2: Toggle story selection ──
  const toggleStory = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < 6) {
        next.add(id)
      }
      return next
    })
  }

  // ── Step 3: Generate Scripts (one at a time) ──
  const handleGenerateScripts = async () => {
    setStep('generating')
    setError(null)
    const selected = stories.filter(s => selectedIds.has(s.id))
    addLog(`${selected.length}개 스토리 선택 → 스크립트 생성 시작...`)
    setProgress({ current: 0, total: selected.length, label: '스크립트 생성 중...' })

    // Save selection to server
    await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_id: batchId, selectedIds: Array.from(selectedIds), step: 'generating' }),
    })

    const generatedScripts: EpisodeScript[] = []

    for (let i = 0; i < selected.length; i++) {
      const story = selected[i]
      addLog(`[${i + 1}/${selected.length}] "${story.title}" 스크립트 생성 중...`)
      setProgress({ current: i, total: selected.length, label: `스크립트 ${i + 1}/${selected.length} 생성 중...` })

      try {
        const res = await fetch('/api/generate-scripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ story, batch_id: batchId, index: i, total: selected.length }),
        })

        if (!res.ok) {
          const err = await res.json()
          addLog(`  ❌ 오류: ${err.error}`)
          continue
        }

        const data = await res.json()
        generatedScripts.push(data.script)
        setScripts([...generatedScripts]) // Update UI after each one
        addLog(`  ✅ ${data.script.ep_id}: 완료`)
      } catch (e: any) {
        addLog(`  ❌ 네트워크 오류: ${e.message}`)
      }
    }

    setScripts(generatedScripts)
    setProgress({ current: selected.length, total: selected.length, label: '스크립트 생성 완료' })

    if (generatedScripts.length > 0) {
      addLog(`스크립트 생성 완료: ${generatedScripts.length}/${selected.length}개`)
      setStep('reviewing')
    } else {
      setError('스크립트를 생성하지 못했습니다.')
      setStep('selecting')
    }
  }

  // ── Step 4: Start Automation (Phase 3~5) ──
  const handleStartAutomation = async () => {
    setStep('automating')
    setError(null)
    addLog('자동화 시작: 에셋 생성 → 영상 조립 → 업로드...')
    setProgress({ current: 0, total: 4, label: 'Phase 3: 에셋 생성 중...' })

    try {
      const res = await fetch('/api/start-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scripts, batch_id: batchId }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Automation failed')
      }

      const data = await res.json()
      addLog('전체 자동화 완료!')

      if (data.email_sent) {
        addLog('완료 알림 이메일 발송됨')
      }

      setProgress({ current: 4, total: 4, label: '완료!' })
      setStep('complete')
    } catch (e: any) {
      setError(e.message)
      addLog(`오류: ${e.message}`)
    }
  }

  // ── Step Indicator ──
  const allSteps = [
    { key: 'idle', label: '대기', icon: '🎬' },
    { key: 'parsing', label: '파싱', icon: '📖' },
    { key: 'selecting', label: '선택', icon: '✋' },
    { key: 'generating', label: '스크립트', icon: '📝' },
    { key: 'reviewing', label: '검토', icon: '👀' },
    { key: 'automating', label: '자동화', icon: '⚡' },
    { key: 'complete', label: '완료', icon: '✅' },
  ]

  const stepIndex = allSteps.findIndex(s => s.key === step)

  // Loading state
  if (isRestoring) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <div className="text-4xl mb-4 animate-pulse">🎬</div>
        <p className="text-gray-400">상태 복원 중...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="text-center mb-8">
        <div className="inline-block bg-gradient-to-r from-joseon-dark to-joseon-navy px-8 py-4 rounded-2xl border border-gray-700/50">
          <h1 className="text-2xl font-bold text-white tracking-wide">
            YASA : Joseon
          </h1>
          <p className="text-gray-400 text-sm mt-1">YouTube Shorts Automation Pipeline</p>
          <p className="text-gray-500 text-xs mt-1">Batch: {batchId}</p>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-1 mb-8 overflow-x-auto pb-2">
        {allSteps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
              ${i < stepIndex ? 'bg-green-500/20 text-green-400 border border-green-500/30' : ''}
              ${i === stepIndex ? 'bg-joseon-accent/20 text-joseon-accent border border-joseon-accent/50 pulse-active' : ''}
              ${i > stepIndex ? 'bg-gray-800/50 text-gray-600 border border-gray-700/30' : ''}
            `}>
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </div>
            {i < allSteps.length - 1 && (
              <div className={`w-6 h-px mx-1 ${i < stepIndex ? 'bg-green-500/50' : 'bg-gray-700/30'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-6 text-red-300 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-200">닫기</button>
        </div>
      )}

      {/* Progress Bar */}
      {(step === 'parsing' || step === 'generating' || step === 'automating') && (
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{progress.label}</span>
            {progress.total > 0 && <span>{progress.current}/{progress.total}</span>}
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-joseon-accent to-joseon-gold rounded-full transition-all duration-500"
              style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '100%' }}
            />
          </div>
        </div>
      )}

      {/* ── Step: Idle → Parse Button ── */}
      {step === 'idle' && (
        <div className="text-center py-20">
          <div className="text-6xl mb-6">📖</div>
          <h2 className="text-xl font-semibold text-white mb-3">야사 스토리 파싱</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Claude AI가 한국 고전 문헌에서 흥미로운 야사 10개를 발굴합니다.
          </p>
          <button
            onClick={handleParse}
            className="bg-joseon-accent hover:bg-joseon-accent/80 text-white px-8 py-3 rounded-xl font-semibold text-lg transition-all hover:scale-105 active:scale-95"
          >
            파싱 시작
          </button>
        </div>
      )}

      {/* ── Step: Parsing (Loading) ── */}
      {step === 'parsing' && (
        <div className="text-center py-20">
          <div className="text-6xl mb-6 animate-bounce">📖</div>
          <h2 className="text-xl font-semibold text-white mb-3">파싱 중...</h2>
          <p className="text-gray-400">Claude API가 야사 스토리를 분석하고 있습니다. 약 30-60초 소요됩니다.</p>
        </div>
      )}

      {/* ── Step: Select Stories ── */}
      {step === 'selecting' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">
              에피소드로 만들 스토리 6개를 선택하세요
            </h2>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-mono ${selectedIds.size === 6 ? 'text-green-400' : 'text-gray-400'}`}>
                {selectedIds.size}/6 선택됨
              </span>
              <button
                onClick={handleGenerateScripts}
                disabled={selectedIds.size !== 6}
                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all
                  ${selectedIds.size === 6
                    ? 'bg-joseon-accent hover:bg-joseon-accent/80 text-white hover:scale-105 active:scale-95'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
              >
                스크립트 생성 시작
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stories.map((story) => (
              <div
                key={story.id}
                onClick={() => toggleStory(story.id)}
                className={`story-card cursor-pointer p-5 rounded-xl border transition-all
                  ${selectedIds.has(story.id)
                    ? 'selected border-joseon-accent/60'
                    : 'border-gray-700/50 hover:border-gray-600'
                  } bg-gray-900/50`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white font-semibold text-sm leading-tight pr-3">
                    {story.title}
                    {story.title_en && (
                      <span className="block text-gray-500 text-xs font-normal mt-0.5">{story.title_en}</span>
                    )}
                  </h3>
                  <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium border ${CATEGORY_COLORS[story.category] || 'bg-gray-700 text-gray-300'}`}>
                    {CATEGORY_LABELS[story.category] || story.category}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mb-3 line-clamp-3">{story.summary}</p>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                    {story.source} ({story.source_hanja})
                  </span>
                  <span className="bg-joseon-gold/10 text-joseon-gold px-2 py-0.5 rounded">
                    {story.sajaseongeo} {story.sajaseongeo_hanja}
                  </span>
                  <span className="bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded">
                    {story.korean_lesson_word}
                  </span>
                </div>
                {selectedIds.has(story.id) && (
                  <div className="mt-3 flex items-center gap-1.5 text-joseon-accent text-xs font-medium">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    선택됨
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step: Generating Scripts ── */}
      {step === 'generating' && (
        <div className="text-center py-12">
          <div className="text-6xl mb-6 animate-pulse">📝</div>
          <h2 className="text-xl font-semibold text-white mb-3">스크립트 생성 중...</h2>
          <p className="text-gray-400">1건씩 순차적으로 생성합니다. 각 스크립트당 약 30-50초 소요됩니다.</p>
          <p className="text-joseon-accent font-mono text-lg mt-4">
            {progress.current} / {progress.total}
          </p>

          {/* Show scripts as they come in */}
          {scripts.length > 0 && (
            <div className="mt-8 max-w-2xl mx-auto text-left space-y-2">
              {scripts.map((ep) => (
                <div key={ep.ep_id} className="bg-gray-900/50 border border-green-500/30 rounded-lg p-3 flex items-center gap-3">
                  <span className="text-green-400">✅</span>
                  <span className="text-xs font-mono text-gray-500">{ep.ep_id}</span>
                  <span className="text-white text-sm">{ep.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Step: Review Scripts ── */}
      {step === 'reviewing' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">
              스크립트 검토
            </h2>
            <button
              onClick={handleStartAutomation}
              className="bg-joseon-accent hover:bg-joseon-accent/80 text-white px-6 py-2 rounded-lg font-semibold text-sm transition-all hover:scale-105 active:scale-95"
            >
              자동화 시작
            </button>
          </div>

          <div className="space-y-4">
            {scripts.map((ep) => (
              <details key={ep.ep_id} className="group bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/30">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                      {ep.ep_id}
                    </span>
                    <span className="text-white font-medium text-sm">{ep.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{ep.script.estimated_duration_seconds}s</span>
                    <span className="bg-joseon-gold/10 text-joseon-gold px-2 py-0.5 rounded">
                      {ep.content_metadata?.sajaseongeo?.korean}
                    </span>
                  </div>
                </summary>
                <div className="px-4 pb-4 space-y-3 border-t border-gray-700/30 pt-3">
                  {[
                    { label: 'Hook', text: ep.script.hook, time: '0-3s' },
                    { label: 'Ki/Rise', text: ep.script.ki_rise, time: '3-12s' },
                    { label: 'Seung/Build', text: ep.script.seung_build, time: '12-22s' },
                    { label: 'Jeon/Twist', text: ep.script.jeon_twist, time: '22-30s' },
                    { label: 'Gyeol/Moral', text: ep.script.gyeol_moral, time: '30-35s' },
                    { label: 'Korean Lesson', text: ep.script.korean_lesson, time: '35-50s' },
                  ].map(section => (
                    <div key={section.label} className="bg-gray-800/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-joseon-gold">{section.label}</span>
                        <span className="text-[10px] text-gray-500">{section.time}</span>
                      </div>
                      <p className="text-gray-300 text-xs leading-relaxed">{section.text}</p>
                    </div>
                  ))}
                  <div className="bg-gray-800/30 rounded-lg p-3">
                    <span className="text-xs font-semibold text-joseon-gold mb-1 block">YouTube Title</span>
                    <p className="text-gray-300 text-xs">{ep.youtube_title}</p>
                  </div>
                  <div className="bg-gray-800/30 rounded-lg p-3">
                    <span className="text-xs font-semibold text-joseon-gold mb-1 block">Scene Prompts ({ep.visual_prompts?.scene_prompts?.length || 0})</span>
                    <ul className="text-gray-400 text-xs space-y-1">
                      {ep.visual_prompts?.scene_prompts?.map((p: string, i: number) => (
                        <li key={i} className="truncate">• {p}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* ── Step: Automating ── */}
      {step === 'automating' && (
        <div className="text-center py-20">
          <div className="text-6xl mb-6 animate-spin">⚡</div>
          <h2 className="text-xl font-semibold text-white mb-3">자동화 진행 중...</h2>
          <p className="text-gray-400">TTS → 이미지 → BGM → 영상 조립 → 업로드</p>
          <p className="text-gray-500 text-sm mt-2">전체 프로세스에 수분이 소요됩니다.</p>
        </div>
      )}

      {/* ── Step: Complete ── */}
      {step === 'complete' && (
        <div className="text-center py-16">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-xl font-semibold text-white mb-3">파이프라인 완료!</h2>
          <p className="text-gray-400 mb-6">모든 에피소드가 생성되었습니다. 이메일을 확인하세요.</p>
          <button
            onClick={() => {
              setStep('idle')
              setStories([])
              setSelectedIds(new Set())
              setScripts([])
              setLog([])
              setProgress({ current: 0, total: 0, label: '' })
            }}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium text-sm transition-all"
          >
            새 배치 시작
          </button>
        </div>
      )}

      {/* ── Log Panel ── */}
      {log.length > 0 && (
        <div className="mt-8 bg-gray-900/50 border border-gray-700/50 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Activity Log</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto font-mono text-xs text-gray-400">
            {log.map((entry, i) => (
              <div key={i}>{entry}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
