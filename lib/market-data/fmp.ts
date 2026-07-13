/**
 * Financial Modeling Prep (FMP) market data client.
 * Docs: https://financialmodelingprep.com/developer/docs
 *
 * Free tier: ~250 requests/day — more than enough for a nightly batch job.
 * Batch endpoint: /api/v3/quote/AAPL,MSFT,VXUS — one request for all tickers.
 */

export interface FMPQuote {
  symbol:            string
  name:              string
  price:             number
  changesPercentage: number
  change:            number
  dayLow:            number
  dayHigh:           number
  yearHigh:          number
  yearLow:           number
  marketCap:         number | null
  volume:            number
  avgVolume:         number
  exchange:          string
  eps:               number | null
  pe:                number | null
  timestamp:         number
}

export interface QuoteResult {
  ticker:  string
  price:   number   // validated price per share > 0
}

/**
 * Fetch quotes for multiple tickers in a single API call.
 * Returns only tickers with valid prices (price > 0).
 * Tickers not found or returned with invalid prices are silently omitted
 * so the caller can add them to failed_symbols.
 */
export async function fetchBatchQuotes(
  tickers: string[],
  apiKey:  string,
): Promise<QuoteResult[]> {
  if (tickers.length === 0) return []

  const symbols = tickers.map(t => t.toUpperCase()).join(',')
  const url = `https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${apiKey}`

  const res = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    throw new Error(`FMP API error: ${res.status} ${res.statusText}`)
  }

  const data: unknown = await res.json()

  // FMP returns an error object (not array) when the key is invalid or rate-limited
  if (!Array.isArray(data)) {
    const msg = (data as { 'Error Message'?: string })?.['Error Message']
    throw new Error(msg ?? 'FMP returned unexpected response format')
  }

  return (data as FMPQuote[])
    .filter(q => q.symbol && typeof q.price === 'number' && q.price > 0)
    .map(q => ({ ticker: q.symbol.toUpperCase(), price: q.price }))
}
