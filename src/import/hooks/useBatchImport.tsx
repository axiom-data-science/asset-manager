import { useCallback, useEffect, useRef, useState } from ***REMOVED***react***REMOVED***

type BatchProgress = {
  total: number
  done: number
  failed: number
}

type UseBatchImportOptions<T> = {
  enabled: boolean
  items: T[]
  isSelected: (item: T) => boolean
  isAlreadyImported?: (item: T) => boolean
  importItem: (item: T, ctx: { signal: AbortSignal }) => Promise<void>
  batchSize: number
  delayMsBetweenBatches?: number
  onBatchStart?: (batch: T[]) => void
  onBatchComplete?: (batch: T[], results: PromiseSettledResult<void>[]) => void
  onDone?: (summary: BatchProgress) => void
}

export function useBatchImport<T>({
  enabled,
  items,
  isSelected,
  isAlreadyImported = () => false,
  importItem,
  batchSize,
  delayMsBetweenBatches = 0,
  onBatchStart,
  onBatchComplete,
  onDone,
}: UseBatchImportOptions<T>) {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<BatchProgress>({ total: 0, done: 0, failed: 0 })
  const [runError, setRunError] = useState<Error | null>(null)

  const runIdRef = useRef(0)
  const importItemRef = useRef(importItem)
  const callbacksRef = useRef({ onBatchStart, onBatchComplete, onDone })

  useEffect(() => {
    importItemRef.current = importItem
  }, [importItem])

  // Keep callback refs up-to-date but don***REMOVED***t include in dependency array
  useEffect(() => {
    callbacksRef.current = { onBatchStart, onBatchComplete, onDone }
  }, [onBatchStart, onBatchComplete, onDone])

  const cancel = useCallback(() => {
    runIdRef.current += 1
    setIsRunning(false)
  }, [])

  useEffect(() => {
    if (!enabled) return

    const runId = ++runIdRef.current
    const controller = new AbortController()
    let cancelled = false

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    const chunk = <U,>(arr: U[], size: number): U[][] => {
      const safe = Math.max(1, size)
      const out: U[][] = []
      for (let i = 0; i < arr.length; i += safe) out.push(arr.slice(i, i + safe))
      return out
    }

    // Capture predicates and items once when enabled flips true.
    const capturedItems = items
    const capturedIsSelected = isSelected
    const capturedIsAlreadyImported = isAlreadyImported
    const capturedImportItem = importItemRef.current

    const run = async () => {
      setRunError(null)
      setIsRunning(true)

      const selected = capturedItems.filter(
        (i) => capturedIsSelected(i) && !capturedIsAlreadyImported(i)
      )
      const totalCount = selected.length
      setProgress({ total: totalCount, done: 0, failed: 0 })

      const batches = chunk(selected, batchSize)
      let doneCount = 0
      let failedCount = 0

      for (const batch of batches) {
        if (cancelled || runId !== runIdRef.current) break

        callbacksRef.current.onBatchStart?.(batch)

        const results = await Promise.allSettled(
          batch.map((item) => capturedImportItem(item, { signal: controller.signal }))
        )

        callbacksRef.current.onBatchComplete?.(batch, results)

        for (const r of results) {
          if (r.status === ***REMOVED***fulfilled***REMOVED***) doneCount += 1
          else failedCount += 1
        }

        setProgress({ total: totalCount, done: doneCount, failed: failedCount })

        if (delayMsBetweenBatches > 0) {
          await sleep(delayMsBetweenBatches)
        }
      }

      const finalSummary = {
        total: totalCount,
        done: doneCount,
        failed: failedCount,
      }

      if (!cancelled && runId === runIdRef.current) {
        setIsRunning(false)
        callbacksRef.current.onDone?.(finalSummary)
      }
    }

    run().catch((e) => {
      if (!cancelled && runId === runIdRef.current) {
        setRunError(e as Error)
        setIsRunning(false)
      }
    })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [enabled, batchSize, delayMsBetweenBatches])

  return {
    isRunning,
    progress,
    runError,
    cancel,
  }
}
