import { Simulate } from '../..';
import type { EMAStrategy, EMARSIStartegy, SMAStrategy, SMARSIStartegy } from './';
import type { HistoryType, sett, geneticSettings, defSett, defResult } from '../..';

type MASimulationSettings =
  | 'maLow'
  | 'maHigh'
  | 'trs'
  | 'rsi'
  | 'rsiUpper'
  | 'rsiLower'
  | 'ampTrs'
  | 'candle'
  | 'sl'
  | 'tp'
  | 'tsl';

export type SettMA = defSett & {
  opts: { [x in Exclude<MASimulationSettings, 'candle' | 'tp' | 'sl' | 'tsl'>]: number };
  type: SMAStrategy | SMARSIStartegy | EMAStrategy | EMARSIStartegy;
};

export type maSettings = {
  [x in MASimulationSettings]: sett;
} & {
  type: SMAStrategy | SMARSIStartegy | EMAStrategy | EMARSIStartegy;
  history: HistoryType;
  useSMA: boolean;
};

export type MAResult = defResult & {
  maLow: number;
  maHigh: number;
  trs: number;
  rsi: number;
  rsiUpper: number;
  rsiLower: number;
  ampTrs: number;
  type: SMAStrategy | SMARSIStartegy | EMAStrategy | EMARSIStartegy;
};

export class MASimulation extends Simulate {
  private settings: maSettings;
  private genetic: geneticSettings;
  constructor(options?: Partial<maSettings>, geneticSettings?: Partial<geneticSettings>) {
    super();
    const def = {
      maLow: { from: 3, to: 20, step: 1, int: true },
      maHigh: { from: 15, to: 40, step: 1, int: true },
      trs: { from: 0, to: 1, step: 0.001, int: false },
      rsi: { from: 5, to: 10, step: 1, int: true },
      rsiUpper: { from: 30, to: 75, step: 5, int: true },
      rsiLower: { from: 25, to: 70, step: 5, int: true },
      ampTrs: { from: 0, to: 4, step: 0.1, int: false },
      candle: { from: 1, to: 900, step: 5, int: true },
      sl: { from: 0, to: 100, step: 5, int: true },
      tp: { from: 0, to: 100, step: 5, int: true },
      tsl: { from: 0, to: 100, step: 5, int: true },
      type: 'sma+rsi' as SMARSIStartegy,
      history: '3c' as HistoryType,
      useSMA: true,
    };
    const defGenetic = {
      population: 100,
      crossoverPerc: 20,
      bestPerc: 10,
      mutationPerc: 20,
      mutations: 3,
    };
    this.genetic = { ...defGenetic, ...geneticSettings };
    this.settings = { ...def, ...options };
  }
  fill(count = 1, fromSettings?: { [x in MASimulationSettings]: number[] }): SettMA[] {
    const res: SettMA[] = [];
    const def: SettMA = {
      opts: {
        maLow: 0,
        maHigh: 0,
        trs: 0,
        rsi: 0,
        rsiUpper: 0,
        rsiLower: 0,
        ampTrs: 0,
      },
      candle: 0,
      id: '',
      type: this.settings.useSMA ? 'sma' : 'ema',
      history: '2c',
      sl: 0,
      tp: 0,
      tsl: 0,
      from: 'rand',
    };
    const keys = Object.keys(this.settings);
    for (let i = 1; i <= count; i++) {
      const rand = {
        ...def,
        opts: { ...def.opts },
      };
      if (fromSettings) {
        Object.keys(fromSettings).map((key) => {
          const item = fromSettings[key];
          const itemRand = this.math.getRandom(-1, item.length);
          if (
            key === 'maLow' ||
            key === 'maHigh' ||
            key === 'trs' ||
            key === 'rsi' ||
            key === 'rsiUpper' ||
            key === 'rsiLower' ||
            key === 'ampTrs'
          ) {
            rand.opts[key] = item[itemRand] || 0;
          } else {
            rand[key] = item[itemRand] || 0;
          }
        });
        rand.type =
          Math.random() > 0.5 ? (this.settings.useSMA ? 'sma' : 'ema') : this.settings.useSMA ? 'sma+rsi' : 'ema+rsi';
        if (rand.type === 'ema+rsi' || rand.type === 'sma+rsi') {
          if (!rand.opts.rsi) {
            rand.opts.rsi = 7;
          }
          if (!rand.opts.rsiUpper) {
            rand.opts.rsiUpper = 50;
          }
          if (!rand.opts.rsiLower) {
            rand.opts.rsiLower = 50;
          }
        }
        rand.history = Math.random() > 0.5 ? '2c' : '3c';
        rand.from = 'crossover';
      } else {
        keys.map((key) => {
          if (key !== 'type' && key !== 'history' && key !== 'useSMA') {
            const randNum = this.math.getRandom(
              this.settings[key].from,
              this.settings[key].to,
              this.settings[key].int,
              this.settings[key].step,
            );
            if (
              key === 'maLow' ||
              key === 'maHigh' ||
              key === 'trs' ||
              key === 'rsi' ||
              key === 'rsiUpper' ||
              key === 'rsiLower' ||
              key === 'ampTrs'
            ) {
              rand.opts[key] = randNum;
            } else {
              rand[key] = randNum;
            }
          } else {
            if (key === 'type') {
              rand.type =
                Math.random() > 0.5
                  ? this.settings.useSMA
                    ? 'sma'
                    : 'ema'
                  : this.settings.useSMA
                  ? 'sma+rsi'
                  : 'ema+rsi';
            }
            if (key === 'history') {
              rand.history = Math.random() > 0.5 ? '2c' : '3c';
            }
          }
        });
      }
      const hash = `${Object.keys(rand)
        .map((key) => {
          if (typeof rand[key] === 'object') {
            return Object.keys(rand[key])
              .map((k) => rand[key][k])
              .join('|');
          }
          return rand[key];
        })
        .filter((item) => item !== '')
        .join('|')}`;
      if (rand.opts.maLow > rand.opts.maHigh || rand.candle === 0) {
        i--;
        continue;
      }
      rand.id = hash;
      res.push(rand);
    }
    return res;
  }
  crossover(popRes: MAResult[]) {
    let crossover: SettMA[] = [];
    const { population, bestPerc, crossoverPerc } = this.genetic;
    const bestRes = popRes
      .filter((item) => item.positions > 0)
      .sort((a, b) => (b.net || 0) - (a.net || 0))
      .slice(0, parseInt(`${(population * bestPerc) / 100}`))
      .map((item) => ({
        maLow: item.maLow,
        maHigh: item.maHigh,
        trs: item.trs,
        candle: item.candle,
        rsi: item.rsi,
        rsiUpper: item.rsiUpper,
        rsiLower: item.rsiLower,
        ampTrs: item.ampTrs,
        sl: item.sl,
        tp: item.tp,
        tsl: item.tsl,
      }));
    if (bestRes.length > 2) {
      const bestSettings: { [x in MASimulationSettings]: number[] } = {
        maLow: [],
        maHigh: [],
        trs: [],
        candle: [],
        rsi: [],
        rsiUpper: [],
        rsiLower: [],
        ampTrs: [],
        sl: [],
        tp: [],
        tsl: [],
      };
      bestRes.map((item) => {
        if (item) {
          Object.keys(item).map((key) => {
            bestSettings[key].push(item[key]);
          });
        }
      });
      crossover = this.fill(parseInt(`${(population * crossoverPerc) / 100}`), bestSettings);
    }
    return crossover;
  }
  mutation(popRes: MAResult[]): SettMA[] {
    const { population, mutationPerc, mutations } = this.genetic;
    return [...popRes]
      .slice(0, parseInt(`${(population * mutationPerc) / 100}`))
      .map((res) => {
        const toReturn = {
          maLow: res.maLow,
          maHigh: res.maHigh,
          trs: res.trs,
          rsi: res.rsi,
          rsiUpper: res.rsiUpper,
          rsiLower: res.rsiLower,
          ampTrs: res.ampTrs,
          candle: res.candle,
          tp: res.tp,
          sl: res.sl,
          tsl: res.tsl,
        };
        const tmp = this.fill(1)[0];
        for (let m = 1; m <= mutations; m++) {
          const keys = Object.keys(toReturn);
          const ind = this.math.getRandom(0, keys.length);
          const set = keys[ind];
          if (
            set === 'maLow' ||
            set === 'maHigh' ||
            set === 'trs' ||
            set === 'rsi' ||
            set === 'rsiUpper' ||
            set === 'rsiLower' ||
            set === 'ampTrs'
          ) {
            if (tmp.opts[set]) {
              toReturn[set] = tmp.opts[set];
            } else {
              m--;
            }
          } else {
            if (tmp[set]) {
              toReturn[set] = tmp[set];
            } else {
              m--;
            }
          }
        }
        const from = 'mutation' as 'mutation';
        const { type, history } = res;
        return {
          opts: {
            maLow: toReturn.maLow,
            maHigh: toReturn.maHigh,
            rsi: toReturn.rsi,
            rsiUpper: toReturn.rsiUpper,
            rsiLower: toReturn.rsiLower,
            ampTrs: toReturn.ampTrs,
            trs: toReturn.trs,
          },
          candle: toReturn.candle,
          sl: toReturn.sl,
          tp: toReturn.tp,
          tsl: toReturn.tsl,
          from,
          type,
          history,
          id: `${Object.keys(toReturn)
            .map((key) => toReturn[key])
            .join('|')}|mutation|${type}|${history}`,
        };
      })
      .filter((res) => {
        if (res.type === 'sma+rsi' || res.type === 'ema+rsi') {
          if (!res.opts.rsi) {
            res.opts.rsi = 7;
          }
          if (!res.opts.rsiLower) {
            res.opts.rsiLower = 50;
          }
          if (!res.opts.rsiUpper) {
            res.opts.rsiUpper = 50;
          }
        }
        if (res.opts.maLow > res.opts.maHigh) {
          const l = res.opts.maLow;
          res.opts.maLow = res.opts.maHigh;
          res.opts.maHigh = l;
        }
        return true;
      });
  }
  formatResult(res: MAResult) {
    if (res.type === 'ema+rsi' || res.type === 'sma+rsi') {
      return {
        maLow: res.maLow,
        maHigh: res.maHigh,
        trs: res.trs,
        rsi: res.rsi,
        rsiUpper: res.rsiUpper,
        rsiLower: res.rsiLower,
        ampTrs: res.ampTrs,
        sl: res.sl,
        tp: res.tsl ? 0 : res.tp,
        tsl: res.tsl,
        candle: res.candle,
        type: res.type,
        history: res.history,
        positions: res.positions,
        profit: res.net,
        ap: res.ap,
        expectation: res.expectation,
        probProfit: res.probProfit,
        probLoss: res.probLoss,
        avgProfit: res.avgProfit,
        avgLoss: res.avgLoss,
        id: res.id,
        fall: res.fall,
        fallToProfit: res.fallToProfit,
      };
    }
    if (res.type === 'ema' || res.type === 'sma') {
      return {
        maLow: res.maLow,
        maHigh: res.maHigh,
        trs: res.trs,
        ampTrs: res.ampTrs,
        sl: res.sl,
        tp: res.tsl ? 0 : res.tp,
        tsl: res.tsl,
        candle: res.candle,
        type: res.type,
        history: res.history,
        positions: res.positions,
        profit: res.net,
        ap: res.ap,
        expectation: res.expectation,
        probProfit: res.probProfit,
        probLoss: res.probLoss,
        avgProfit: res.avgProfit,
        avgLoss: res.avgLoss,
        id: res.id,
        fall: res.fall,
        fallToProfit: res.fallToProfit,
      };
    }
    return res;
  }
}
