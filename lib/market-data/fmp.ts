/**
 * Twelve Data market data client.
 * Docs: https://twelvedata.com/docs
 *
 * Free tier: 800 API credits/day — plenty for a nightly batch job.
 * Batch endpoint: /price?symbol=AAPL,MSFT,VXUS — one request for all tickers.
 *
 * Response format:
 *   Single ticker:   { "price": "189.30" }
 *   Multiple tickers: { "AAPL": { "price": "189.30" }, "MSFT": { "price": "378.91" } }
 */

export interface QuoteResult {
  ticker: string
  price:  number   // validated price per share > 0
}

/**
 * Fetch quotes for multiple tickers in a single API call.
 * Returns only tickers with valid prices (price > 0).
 * Tickers not found or returned with invalid prices are omitted
 * so the caller can add them to failed_symbols.
 */
export async function fetchBatchQuotes(
  tickers: string[],
  apiKey:  string,
): Promise<QuoteResult[]> {
  if (tickers.length === 0) return []

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
    // Single ticker response: { "price": "189.30" } or { "code": 400, "message": "..." }
    const single = data as { price?: string; code?: number; message?: string }
    if (single.code && single.code !== 200) {
      throw new Error(single.message ?? 'Twelve Data error')
    }
    const price = parseFloat(single.price ?? '')
    if (price > 0) results.push({ ticker: tickers[0].toUpperCase(), price })
  } else {
    // Multi-ticker response: { "AAPL": { "price": "189.30" }, ... }
    const multi = data as Record<string, { price?: string; code?: number; message?: string }>
    for (const [symbol, quote] of Object.entries(multi)) {
      if (quote.code && quote.code !== 200) continue  // ticker not found — skip
      const price = parseFloat(quote.price ?? '')
      if (price > 0) results.push({ ticker: symbol.toUpperCase(), price })
    }
  }

  return results
}
