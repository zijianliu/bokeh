import {expect} from "#framework/assertions"

import {AdaptiveTicker} from "@bokehjs/models/tickers/adaptive_ticker"
import {CompositeTicker} from "@bokehjs/models/tickers/composite_ticker"
import {MonthsTicker} from "@bokehjs/models/tickers/months_ticker"
import {DatetimeTicker} from "@bokehjs/models/tickers/datetime_ticker"

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

  describe("CompositeTicker with single sub-ticker", () => {

    it("should return the only ticker when CompositeTicker has a single MonthsTicker", () => {
      const months_ticker = new MonthsTicker({months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]})
      const ticker = new CompositeTicker({tickers: [months_ticker]})

      const best_ticker = ticker.get_best_ticker(Date.UTC(2000, 0, 1), Date.UTC(2001, 0, 1), 5)
      expect(best_ticker).to.be.instanceof(MonthsTicker)
    })

    it("should return ticks when CompositeTicker has a single MonthsTicker", () => {
      const months_ticker = new MonthsTicker({months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]})
      const ticker = new CompositeTicker({tickers: [months_ticker]})

      const ticks = ticker.get_ticks_no_defaults(Date.UTC(2000, 0, 1), Date.UTC(2001, 0, 1), NaN, 5)
      expect(ticks.major.length).to.be.above(0)
      expect(ticks.minor).to.be.equal([])
    })

    it("should return the only ticker when DatetimeTicker has a single MonthsTicker", () => {
      const months_ticker = new MonthsTicker({months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]})
      const ticker = new DatetimeTicker({tickers: [months_ticker]})

      const best_ticker = ticker.get_best_ticker(Date.UTC(2000, 0, 1), Date.UTC(2001, 0, 1), 5)
      expect(best_ticker).to.be.instanceof(MonthsTicker)
    })

    it("should return ticks when DatetimeTicker has a single MonthsTicker", () => {
      const months_ticker = new MonthsTicker({months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]})
      const ticker = new DatetimeTicker({tickers: [months_ticker]})

      const ticks = ticker.get_ticks_no_defaults(Date.UTC(2000, 0, 1), Date.UTC(2001, 0, 1), NaN, 5)
      expect(ticks.major.length).to.be.above(0)
      expect(ticks.minor).to.be.equal([])
    })
  })
})
