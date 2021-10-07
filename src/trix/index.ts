import { TRIX } from '@mt-inc/indicators';
import { SMA } from '@mt-inc/indicators';
import { Cross } from '@mt-inc/utils';
import Positions from '@mt-inc/bot';
import { constants } from '@mt-inc/utils';
import type { HistoryType } from '../..';

const { SELL, BUY } = constants;

type BaseSettings = {
  trixPeriod: number;
  smaPeriod: number;
  upper: number;
  lower: number;
  type: 'trix';
  history: HistoryType;
};
export type TRIXStartegyType = 'trix';
export type TRIXStrategySettings = BaseSettings;
export class TrixBot {
  private history: HistoryType;
  private trix: TRIX | null;
  private sma: SMA | null;
  private cross: Cross | null;
  private upper: number;
  private lower: number;
  private useBinance: boolean;
  constructor(settings: TRIXStrategySettings, useBinance = false) {
    this.history = settings.history;
    this.trix = new TRIX(settings.trixPeriod);
    this.sma = new SMA(settings.smaPeriod);
    this.cross = new Cross(0);
    this.useBinance = useBinance;
    this.upper = settings.upper;
    this.lower = settings.lower;
  }
  work(data: number[], now: number, positions?: Positions | null, useBuffer = false) {
    if (this.trix && this.sma && this.cross && positions && now !== 0 && !useBuffer) {
      const c = data[1];
      const tr = this.trix.nextValue(c);
      if (tr) {
        this.sma.nextValue(tr);
      }
      let prevTrix = this.trix.previous;
      let prevSma = this.sma.previous;
      if (this.history === '3c') {
        const histTrix = this.trix.history;
        const histSma = this.sma.history;
        if (histTrix && histSma && histTrix.length > 3 && histSma.length > 3) {
          prevTrix = histTrix[histTrix.length - 3];
          prevSma = histSma[histSma.length - 3];
        }
      }
      const crossed = this.cross.isCrossed(prevTrix, prevSma, this.trix.value, this.sma.value);
      let sell = crossed === SELL;
      let buy = crossed === BUY;
      if (this.trix.value && (this.trix.value < this.lower || this.trix.value > this.upper)) {
        if (sell) {
          if (positions.active && positions.type === BUY) {
            if (this.useBinance) {
              return positions.closePosition(now, true);
            }
            positions.closePosition(now);
            positions.openPosition(now, SELL);
          } else if (!positions.active) {
            positions.openPosition(now, SELL);
          }
        }
        if (buy) {
          if (positions.active && positions.type === SELL) {
            if (this.useBinance) {
              return positions.closePosition(now, true);
            }
            positions.closePosition(now);
            positions.openPosition(now, BUY);
          } else if (!positions.active) {
            positions.openPosition(now, BUY);
          }
        }
      }
    } else if (useBuffer && this.trix && this.sma) {
      const c = data[1];
      const tr = this.trix.nextValue(c);
      if (tr) {
        this.sma.nextValue(tr);
      }
    }
  }
  stop() {
    this.trix = null;
    this.sma = null;
    this.cross = null;
  }
  /** Get history */
  get historyTechData() {
    return { trix: this.trix?.history, sma: this.sma?.history };
  }
}
