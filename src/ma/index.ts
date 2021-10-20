import { EMA } from '@mt-inc/indicators';
import { SMA } from '@mt-inc/indicators';
import { Cross } from '@mt-inc/utils';
import Positions from '@mt-inc/bot';
import { constants } from '@mt-inc/utils';
import { RSI } from '@mt-inc/indicators';
import type { HistoryType } from '../..';

const { SELL, BUY } = constants;

export type EMAStrategy = 'ema';
export type EMARSIStartegy = 'ema+rsi';
export type SMAStrategy = 'sma';
export type SMARSIStartegy = 'sma+rsi';
type BaseSettings = {
  maLow: number;
  maHigh: number;
  trs: number;
  history: HistoryType;
  ampTrs?: number;
};
type RSIBase = {
  rsi: number;
  upper?: number;
  lower?: number;
};
export type EMAStrategySettings = BaseSettings & {
  type: EMAStrategy;
};
export type RSIEMAStrategySettings = BaseSettings &
  RSIBase & {
    type: EMARSIStartegy;
  };
export type SMAStrategySettings = BaseSettings & {
  type: SMAStrategy;
};
export type RSISMAStrategySettings = BaseSettings &
  RSIBase & {
    type: SMARSIStartegy;
  };
export class MAbot {
  private history: HistoryType;
  private maLow: EMA | SMA | null;
  private maHigh: EMA | SMA | null;
  private cross: Cross | null;
  private rsi?: RSI;
  private useRsi: boolean;
  private upper?: number;
  private lower?: number;
  private ampTrs: number;
  private useBinance: boolean;
  constructor(
    settings: EMAStrategySettings | RSIEMAStrategySettings | SMAStrategySettings | RSISMAStrategySettings,
    useBinance = false,
  ) {
    this.history = settings.history;
    this.maLow = new EMA(settings.maLow);
    this.maHigh = new EMA(settings.maHigh);
    if (settings.type === 'sma' || settings.type === 'sma+rsi') {
      this.maLow = new SMA(settings.maLow);
      this.maHigh = new SMA(settings.maHigh);
    }
    this.cross = new Cross(settings.trs, true);
    this.ampTrs = settings.ampTrs || 0;
    this.useRsi = ['ema+rsi', 'sma+rsi'].includes(settings.type);
    if (settings.type === 'ema+rsi' || settings.type === 'sma+rsi') {
      this.rsi = new RSI(settings.rsi);
      this.ampTrs = settings.ampTrs || 0;
      this.lower = settings.lower || 50;
      this.upper = settings.upper || 50;
    }
    this.useBinance = useBinance;
  }
  work(data: number[], now: number, positions?: Positions | null, useBuffer = false, time?: number) {
    if (this.maLow && this.maHigh && this.cross && positions && now !== 0 && !useBuffer) {
      const c = data[1];
      const l = data[2];
      const h = data[3];
      const color = data[7] ? 'green' : 'red';
      const amp = ((h - l) / l) * 100;
      this.maLow.nextValue(c);
      this.maHigh.nextValue(c);
      let prevLow = this.maLow.previous;
      let prevHigh = this.maHigh.previous;
      if (this.history === '3c') {
        const histLow = this.maLow.history;
        const histHigh = this.maHigh.history;
        if (histLow && histHigh && histLow.length >= 3 && histHigh.length >= 3) {
          prevLow = histLow[histLow.length - 3];
          prevHigh = histHigh[histHigh.length - 3];
        }
      }
      const crossed = this.cross.isCrossed(prevLow, prevHigh, this.maLow.value, this.maHigh.value);
      let sell = crossed === SELL;
      let buy = crossed === BUY;
      const ampDown =
        positions.active && positions.type === BUY && this.ampTrs > 0 && amp >= this.ampTrs && color === 'red';
      const ampUp =
        positions.active && positions.type === SELL && this.ampTrs > 0 && amp >= this.ampTrs && color === 'green';
      if (this.useRsi && this.rsi && this.upper && this.lower) {
        this.rsi.nextValue(c);
        sell = sell && this.rsi.value > this.upper;
        buy = buy && this.rsi.value < this.lower;
      }
      if (sell || ampDown) {
        if (positions.active && positions.type === BUY) {
          if (this.useBinance) {
            return positions.closePosition(now, true);
          }
          positions.closePosition(now, false, undefined, undefined, undefined, time);
          positions.openPosition(now, SELL, time);
        } else if (!positions.active) {
          positions.openPosition(now, SELL, time);
        }
      }
      if (buy || ampUp) {
        if (positions.active && positions.type === SELL) {
          if (this.useBinance) {
            return positions.closePosition(now, true);
          }
          positions.closePosition(now, false, undefined, undefined, undefined, time);
          positions.openPosition(now, BUY, time);
        } else if (!positions.active) {
          positions.openPosition(now, BUY, time);
        }
      }
    } else if (useBuffer && this.maHigh && this.maLow) {
      const c = data[1];
      this.maLow.nextValue(c);
      this.maHigh.nextValue(c);
      if (this.useRsi && this.rsi && this.upper && this.lower) {
        this.rsi.nextValue(c);
      }
    }
  }
  stop() {
    this.maHigh = null;
    this.maLow = null;
    this.cross = null;
    this.rsi = undefined;
  }
  /** Get history */
  get historyTechData() {
    return { low: this.maLow?.history, high: this.maHigh?.history, rsi: this.rsi?.history };
  }
}
