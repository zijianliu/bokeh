import {expect} from "#framework/assertions"

import {AdaptiveTicker} from "@bokehjs/models/tickers/adaptive_ticker"
import {CompositeTicker} from "@bokehjs/models/tickers/composite_ticker"
import {MonthsTicker} from "@bokehjs/models/tickers/months_ticker"
import {DaysTicker} from "@bokehjs/models/tickers/days_ticker"
import {ONE_MONTH, ONE_DAY} from "@bokehjs/models/tickers/util"

describe("CompositeTicker Model", () => {

  describe("CompositeTicker get_best_ticker method", () => {

    const composite_ticker = () => {
      return new CompositeTicker({tickers: [
        new AdaptiveTicker({base: 10, min_interval: 0, max_interval: 5e2}),
        new AdaptiveTicker({base: 60, min_interval: 1e3, max_interval: 3e4}),
        new AdaptiveTicker({base: 24, min_interval: 3.6e6, max_interval: 4.32e7}),
      ]})
    }

    it("should return the first ticker", () => {
      const ticker = composite_ticker()
      const best_ticker = ticker.get_best_ticker(0, 1e2, 5) // 100ms range
      expect(best_ticker).to.be.instanceof(AdaptiveTicker)
      expect((best_ticker as AdaptiveTicker).base).to.be.equal(10)
    })

    it("should return the second ticker", () => {
      const ticker = composite_ticker()
      const best_ticker = ticker.get_best_ticker(1, 1e4, 5) // ten second range
      expect(best_ticker).to.be.instanceof(AdaptiveTicker)
      expect((best_ticker as AdaptiveTicker).base).to.be.equal(60)
    })

    it("should return the third ticker", () => {
      const ticker = composite_ticker()
      const best_ticker = ticker.get_best_ticker(1, 6e5, 5) // ten minute range
      expect(best_ticker).to.be.instanceof(AdaptiveTicker)
      expect((best_ticker as AdaptiveTicker).base).to.be.equal(24)
    })

    it("should return the first ticker if start/end are NaNs", () => {
      const ticker = composite_ticker()
      const best_ticker = ticker.get_best_ticker(NaN, NaN, 5)
      expect(best_ticker).to.be.instanceof(AdaptiveTicker)
      expect((best_ticker as AdaptiveTicker).base).to.be.equal(10)
    })
  })

  describe("CompositeTicker with MonthsTicker", () => {
    it("should work with MonthsTicker in tickers array", () => {
      const ticker = new CompositeTicker({tickers: [
        new AdaptiveTicker({base: 10, min_interval: 0, max_interval: 5e2}),
        new MonthsTicker({months: [0, 3, 6, 9]}),
      ]})
      const best_ticker = ticker.get_best_ticker(Date.UTC(2000, 0, 1), Date.UTC(2000, 11, 31), 5)
      expect(best_ticker).to.be.instanceof(MonthsTicker)
      expect((best_ticker as MonthsTicker).interval).to.be.equal(3*ONE_MONTH)
    })

    it("should compute correct interval for MonthsTicker with single month", () => {
      const ticker = new CompositeTicker({tickers: [
        new MonthsTicker({months: [6]}),
      ]})
      const best_ticker = ticker.get_best_ticker(Date.UTC(2000, 0, 1), Date.UTC(2005, 0, 1), 5)
      expect(best_ticker).to.be.instanceof(MonthsTicker)
      expect((best_ticker as MonthsTicker).interval).to.be.equal(12*ONE_MONTH)
    })

    it("should get correct ticks from CompositeTicker with MonthsTicker", () => {
      const ticker = new CompositeTicker({tickers: [
        new MonthsTicker({months: [6]}),
      ]})
      const ticks = ticker.get_ticks_no_defaults(Date.UTC(2000, 0, 1), Date.UTC(2005, 0, 1), NaN, 5)
      const expected_major = [2000, 2001, 2002, 2003, 2004].map((year) => Date.UTC(year, 6, 1))
      expect(ticks.major).to.be.equal(expected_major)
      expect(ticks.minor).to.be.equal([])
    })
  })

  describe("CompositeTicker with DaysTicker", () => {
    it("should work with DaysTicker in tickers array", () => {
      const ticker = new CompositeTicker({tickers: [
        new AdaptiveTicker({base: 10, min_interval: 0, max_interval: 5e2}),
        new DaysTicker({days: [1, 15]}),
      ]})
      const best_ticker = ticker.get_best_ticker(Date.UTC(2000, 0, 1), Date.UTC(2000, 0, 31), 5)
      expect(best_ticker).to.be.instanceof(DaysTicker)
      expect((best_ticker as DaysTicker).interval).to.be.equal(14*ONE_DAY)
    })

    it("should compute correct interval for DaysTicker with single day", () => {
      const days_ticker = new DaysTicker({days: [6]})
      // Verify the interval is computed correctly
      expect(days_ticker.interval).to.be.equal(31*ONE_DAY)
      // Verify get_min_interval and get_max_interval work correctly
      expect(days_ticker.get_min_interval()).to.be.equal(31*ONE_DAY)
      expect(days_ticker.get_max_interval()).to.be.equal(31*ONE_DAY)
    })
  })
})
