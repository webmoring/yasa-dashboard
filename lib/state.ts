// Server-side state persistence using Vercel's /tmp filesystem
// This persists across requests within the same serverless instance
// For production: consider Vercel KV or Upstash Redis

import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const STATE_DIR = '/tmp/yasa-state'

async function ensureDir() {
  try {
    await mkdir(STATE_DIR, { recursive: true })
  } catch {}
}

function getPath(batchId: string): string {
  return join(STATE_DIR, `${batchId}.json`)
}

export async function saveState(batchId: string, data: any): Promise<void> {
  await ensureDir()
  await writeFile(getPath(batchId), JSON.stringify(data, null, 2), 'utf-8')
}

export async function loadState(batchId: string): Promise<any | null> {
  try {
    const raw = await readFile(getPath(batchId), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// List all available batch states (for restore on page load)
export async function listStates(): Promise<string[]> {
  await ensureDir()
  try {
    const { readdir } = await import('fs/promises')
    const files = await readdir(STATE_DIR)
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort()
      .reverse() // newest first
  } catch {
    return []
  }
}
