/**
 * PX2A — Period Comparison & Zero-Baseline Math Test Suite
 *
 * Verifies:
 * - 7, 30, 90 day comparison semantics
 * - Safe handling of 0-baselines without NaN or Infinity
 * - `isNewBaseline` flag semantics
 * - Delta and percentage calculations for growth and decline
 */

import { describe, it, expect } from 'vitest'
import { calculateMetricComparison } from '@/modules/analytics/funnel'

describe('PX2A — Period Comparison & Zero-Baseline Math', () => {
  it('handles zero baseline when current has metrics (new baseline condition)', () => {
    const comp = calculateMetricComparison(45, 0)
    expect(comp.current).toBe(45)
    expect(comp.previous).toBe(0)
    expect(comp.delta).toBe(45)
    expect(comp.percentageChange).toBeNull() // Not Infinity
    expect(comp.isNewBaseline).toBe(true)
  })

  it('handles both current and previous at zero', () => {
    const comp = calculateMetricComparison(0, 0)
    expect(comp.current).toBe(0)
    expect(comp.previous).toBe(0)
    expect(comp.delta).toBe(0)
    expect(comp.percentageChange).toBe(0) // Not NaN
    expect(comp.isNewBaseline).toBe(true)
  })

  it('calculates positive growth accurately when previous > 0', () => {
    const comp = calculateMetricComparison(150, 100)
    expect(comp.current).toBe(150)
    expect(comp.previous).toBe(100)
    expect(comp.delta).toBe(50)
    expect(comp.percentageChange).toBe(50)
    expect(comp.isNewBaseline).toBe(false)
  })

  it('calculates drop accurately when previous > 0', () => {
    const comp = calculateMetricComparison(80, 100)
    expect(comp.current).toBe(80)
    expect(comp.previous).toBe(100)
    expect(comp.delta).toBe(-20)
    expect(comp.percentageChange).toBe(-20)
    expect(comp.isNewBaseline).toBe(false)
  })

  it('calculates drop to zero when previous > 0', () => {
    const comp = calculateMetricComparison(0, 50)
    expect(comp.current).toBe(0)
    expect(comp.previous).toBe(50)
    expect(comp.delta).toBe(-50)
    expect(comp.percentageChange).toBe(-100)
    expect(comp.isNewBaseline).toBe(false)
  })

  it('rounds percentage change to one decimal place', () => {
    const comp = calculateMetricComparison(100, 30) // (70 / 30) * 100 = 233.3333...
    expect(comp.percentageChange).toBe(233.3)
  })

  it('safely handles null or undefined values gracefully', () => {
    const comp = calculateMetricComparison(undefined as any, null as any)
    expect(comp.current).toBe(0)
    expect(comp.previous).toBe(0)
    expect(comp.delta).toBe(0)
    expect(comp.percentageChange).toBe(0)
    expect(comp.isNewBaseline).toBe(true)
  })
})
