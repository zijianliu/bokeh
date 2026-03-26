import type {TickSpec} from "./ticker"
import {ContinuousTicker} from "./continuous_ticker"
import type * as p from "core/properties"
import {argmin, sorted_index, is_empty} from "core/util/array"
import {clamp} from "core/util/math"

// This Ticker takes a collection of Tickers and picks the one most appropriate
// for a given range.

export namespace CompositeTicker {
  export type Attrs = p.AttrsOf<Props>

  export type Props = ContinuousTicker.Props & {
    tickers: p.Property<ContinuousTicker[]>
  }
}

export interface CompositeTicker extends CompositeTicker.Attrs {}

export class CompositeTicker extends ContinuousTicker {
  declare properties: CompositeTicker.Props

  constructor(attrs?: Partial<CompositeTicker.Attrs>) {
    super(attrs)
  }

  static {
    this.define<CompositeTicker.Props>(({NonEmptyList, Ref}) => ({
      tickers: [ NonEmptyList(Ref(ContinuousTicker)) ],
    }))
  }

  // The tickers should be in order of increasing interval size; specifically,
  // if S comes before T, then it should be the case that
  // S.get_max_interval() < T.get_min_interval().
  // FIXME Enforce this automatically.

  get min_intervals(): number[] {
    return this.tickers.map((ticker) => ticker.get_min_interval())
  }

  get max_intervals(): number[] {
    return this.tickers.map((ticker) => ticker.get_max_interval())
  }

  get_min_interval(): number {
    return this.min_intervals[0]
  }

  get_max_interval(): number {
    return this.max_intervals[0]
  }

  get_best_ticker(data_low: number, data_high: number, desired_n_ticks: number): ContinuousTicker {
    const data_range = data_high - data_low
    console.log("get_best_ticker called:", {data_low, data_high, desired_n_ticks, data_range})
    console.log("this.tickers:", this.tickers)
    console.log("this.tickers.length:", this.tickers?.length)
    
    if (data_range == 0) {
      return this.tickers[0]
    }

    const ideal_interval = this.get_ideal_interval(data_low, data_high, desired_n_ticks)
    console.log("ideal_interval:", ideal_interval)
    
    console.log("this.min_intervals:", this.min_intervals)
    console.log("this.max_intervals:", this.max_intervals)
    
    const n_tickers = this.tickers.length
    const ticker_ndxs = [
      clamp(sorted_index(this.min_intervals, ideal_interval) - 1, 0, n_tickers - 1),
      clamp(sorted_index(this.max_intervals, ideal_interval), 0, n_tickers - 1),
    ]
    console.log("ticker_ndxs:", ticker_ndxs)
    
    const intervals = [
      this.min_intervals[ticker_ndxs[0]],
      this.max_intervals[ticker_ndxs[1]],
    ]
    console.log("intervals:", intervals)
    
    const errors = intervals.map((interval) => {
      return Math.abs(desired_n_ticks - (data_range / interval))
    })
    console.log("errors:", errors)

    let best_ticker

    if (is_empty(errors.filter((e) => !isNaN(e)))) {
      // this can happen if the data isn't loaded yet, we just default to the first scale
      console.log("All errors are NaN, defaulting to first ticker")
      best_ticker = this.tickers[0]
    } else {
      const best_index = argmin(errors)
      console.log("best_index:", best_index)
      const best_ticker_ndx = ticker_ndxs[best_index]
      console.log("best_ticker_ndx:", best_ticker_ndx)
      best_ticker = this.tickers[best_ticker_ndx]
      console.log("best_ticker:", best_ticker)
    }

    return best_ticker
  }

  get_interval(data_low: number, data_high: number, desired_n_ticks: number): number {
    const best_ticker = this.get_best_ticker(data_low, data_high, desired_n_ticks)
    return best_ticker.get_interval(data_low, data_high, desired_n_ticks)
  }

  override get_ticks_no_defaults(data_low: number, data_high: number, cross_loc: number, desired_n_ticks: number): TickSpec<number> {
    const best_ticker = this.get_best_ticker(data_low, data_high, desired_n_ticks)
    return best_ticker.get_ticks_no_defaults(data_low, data_high, cross_loc, desired_n_ticks)
  }
}
