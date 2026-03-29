import { NextRequest, NextResponse } from 'next/server'
import { loadState, listStates, saveState } from '@/lib/state'

// GET: Restore state (latest or by batch_id)
export async function GET(req: NextRequest) {
  const batchId = req.nextUrl.searchParams.get('batch_id')

  if (batchId) {
    const state = await loadState(batchId)
    if (!state) {
      return NextResponse.json({ found: false })
    }
    return NextResponse.json({ found: true, state })
  }

  // No batch_id: return the latest available state
  const batches = await listStates()
  if (batches.length === 0) {
    return NextResponse.json({ found: false })
  }

  const latestState = await loadState(batches[0])
  return NextResponse.json({ found: true, state: latestState })
}

// POST: Save selection (selected story IDs)
export async function POST(req: NextRequest) {
  try {
    const { batch_id, selectedIds, step } = await req.json()
    if (!batch_id) {
      return NextResponse.json({ error: 'batch_id required' }, { status: 400 })
    }

    const state = await loadState(batch_id)
    if (!state) {
      return NextResponse.json({ error: 'State not found' }, { status: 404 })
    }

    if (selectedIds) state.selectedIds = selectedIds
    if (step) state.step = step
    state.updated_at = new Date().toISOString()

    await saveState(batch_id, state)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
