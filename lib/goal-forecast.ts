import { FireSettings } from '@/types'

const MAX_MONTHS = 600 // 50yr cap, mirrors FireClient's 50-iteration cap

export type GoalForecast = { name: string; expected: string; likely: string; aggressive: string }

function monthsToTarget(current: number, target: number, annualContribution: number, annualReturn: number): number | null {
  if (current >= target) return 0
  const monthlyRate = Math.pow(1 + annualReturn, 1 / 12) - 1
  const monthlyContribution = annualContribution / 12
  let v = current, months = 0
  while (v < target && months < MAX_MONTHS) {
    v = v * (1 + monthlyRate) + monthlyContribution
    months++
  }
  return v >= target ? months : null
}

function monthsToLabel(months: number): string {
  const d = new Date()
  d.setDate(1) // pin to day 1 so setMonth never rolls unexpectedly
  d.setMonth(d.getMonth() + months)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function forecastOne(current: number, target: number, contribution: number, rate: number): string {
  const months = monthsToTarget(current, target, contribution, rate)
  return months === null ? 'Beyond forecast range' : monthsToLabel(months)
}

export function computeGoalForecasts(totalInvested: number, netWorth: number, fire: FireSettings | null): GoalForecast[] {
  const contribution = fire?.annual_contribution ?? 41000
  const expectedReturn = fire?.expected_return ?? 0.07
  const likelyReturn = expectedReturn - 0.015          // conservative buffer — real returns often underperform
  const aggressiveContribution = contribution * 1.25
  const aggressiveReturn = expectedReturn + 0.015

  const targets = [
    { name: '$300k invested', current: totalInvested, target: 300_000 },
    { name: '$500k invested', current: totalInvested, target: 500_000 },
    { name: '$1M net worth',  current: netWorth,      target: 1_000_000 },
  ]
  return targets.map(t => ({
    name: t.name,
    expected:   forecastOne(t.current, t.target, contribution, expectedReturn),
    likely:     forecastOne(t.current, t.target, contribution, likelyReturn),
    aggressive: forecastOne(t.current, t.target, aggressiveContribution, aggressiveReturn),
  }))
}
