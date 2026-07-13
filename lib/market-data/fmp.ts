/**
 * Twelve Data market data client.
 * Docs: https://twelvedata.com/docs
 *
 * Free tier: 800 API credits/day, 8 credits/minute.
 * Each symbol in a batch counts as 1 credit against the per-minute limit.
 * Solution: send tickers in chunks of CHUNK_SIZE with a 65s pause between chunks.
 *
 * Response format:
 *   Single ticker:    { "price": "189.30" }
 *   Multiple tickers: { "AAPL": { "price": "189.30" }, "MSFT": { "price": "378.91" } }
 */

const CHUNK_SIZE = 7          // stay under the 8/min limit
const CHUNK_DELAY_MS = 65_000 // 65s pause between chunks (buffer over 60s)

export interface QuoteResult {
  ticker: string
  price:  number   // validated price per share > 0
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchChunk(tickers: string[], apiKey: string): Promise<QuoteResult[]> {
  const symbols = tickers.map(t => t.toUpperCase()).join(',')
  const url = `https://api.twelvedata.com/price?symbol=${symbols}&apikey=${apiKey}`

  const res = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    throw new Error(`Twelve Data API error: ${res.status} ${res.statusText}`)
  }

  const data: unknown = await res.json()

  if (!data || typeof data !== 'object') {
    throw new Error('Twelve Data returned unexpected response format')
  }

  const results: QuoteResult[] = []

  if (tickers.length === 1) {
    // Single ticker: { "price": "189.30" } or { "code": 400, "message": "..." }
    const single = data as { price?: string; code?: number; message?: string }
    if (single.code && single.code !== 200) return []  // ticker not found — skip
    const price = parseFloat(single.price ?? '')
    if (price > 0) results.push({ ticker: tickers[0].toUpperCase(), price })
  } else {
    // Multi-ticker: { "AAPL": { "price": "189.30" }, ... }
    const multi = data as Record<string, { price?: string; code?: number; message?: string }>
    for (const [symbol, quote] of Object.entries(multi)) {
      if (quote.code && quote.code !== 200) continue  // ticker not found — skip
      const price = parseFloat(quote.price ?? '')
      if (price > 0) results.push({ ticker: symbol.toUpperCase(), price })
    }
  }

  return results
}

/**
 * Fetch quotes for all tickers, chunked to respect Twelve Data's 8/min rate limit.
 * Adds a 65s pause between chunks. For ≤8 tickers (typical personal portfolio),
 * only one chunk is needed and no delay occurs.
 */
export async function fetchBatchQuotes(
  tickers: string[],
  apiKey:  string,
): Promise<QuoteResult[]> {
  if (tickers.length === 0) return []

  const results: QuoteResult[] = []

  for (let i = 0; i < tickers.length; i += CHUNK_SIZE) {
    if (i > 0) await sleep(CHUNK_DELAY_MS)  // pause between chunks
    const chunk = tickers.slice(i, i + CHUNK_SIZE)
    const chunkResults = await fetchChunk(chunk, apiKey)
    results.push(...chunkResults)
  }

  return results
}
