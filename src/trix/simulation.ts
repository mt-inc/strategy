import { Simulate } from '../..';
import type { TRIXStartegyType } from './';
import type { HistoryType, sett, geneticSettings, defSett, defResult } from '../..';

type TRIXSimulationSettings = 'trix' | 'sma' | 'upper' | 'lower' | 'candle' | 'sl' | 'tp' | 'tsl';

export type SettTRIX = defSett & {
  opts: { [x in Exclude<TRIXSimulationSettings, 'candle' | 'tp' | 'sl' | 'tsl'>]: number };
  type: TRIXStartegyType;
};

export type trixSettings = {
  [x in TRIXSimulationSettings]: sett;
} & {
  type: TRIXStartegyType;
  history: HistoryType;
};

export type TRIXResult = defResult & {
  trix: number;
  sma: number;
  upper: number;
  lower: number;
  type: TRIXStartegyType;
};

export class TRIXSimulation extends Simulate {
  private settings: trixSettings;
  private genetic: geneticSettings;
  constructor(options?: Partial<trixSettings>, geneticSettings?: Partial<geneticSettings>) {
    super();
    const def = {
      trix: { from: 1, to: 30, step: 1, int: true },
      sma: { from: 1, to: 30, step: 1, int: true },
      upper: { from: 0.001, to: 0.5, step: 0.001, int: false },
      lower: { from: 0.001, to: 0.5, step: 0.001, int: false },
      candle: { from: 1, to: 900, step: 5, int: true },
      sl: { from: 0, to: 100, step: 5, int: true },
      tp: { from: 0, to: 100, step: 5, int: true },
      tsl: { from: 0, to: 100, step: 5, int: true },
      type: 'trix' as TRIXStartegyType,
      history: '3c' as HistoryType,
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
  fill(count = 1, fromSettings?: { [x in TRIXSimulationSettings]: number[] }): SettTRIX[] {
    const res: SettTRIX[] = [];
    const def: SettTRIX = {
      opts: {
        trix: 0,
        sma: 0,
        upper: 0,
        lower: 0,
      },
      candle: 0,
      id: '',
      type: 'trix',
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
          if (key === 'trix' || key === 'sma' || key === 'lower' || key === 'upper') {
            rand.opts[key] = item[itemRand] || 0;
          } else {
            rand[key] = item[itemRand] || 0;
          }
        });
        rand.history = Math.random() > 0.5 ? '2c' : '3c';
        rand.from = 'crossover';
      } else {
        keys.map((key) => {
          if (key !== 'type' && key !== 'history') {
            const randNum = this.math.getRandom(
              this.settings[key].from,
              this.settings[key].to,
              this.settings[key].int,
              this.settings[key].step,
            );
            if (key === 'trix' || key === 'sma' || key === 'lower' || key === 'upper') {
              rand.opts[key] = randNum;
            } else {
              rand[key] = randNum;
            }
          } else {
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
      if (rand.candle === 0) {
        i--;
        continue;
      }
      rand.id = hash;
      res.push(rand);
    }
    return res;
  }
  crossover(popRes: TRIXResult[]) {
    let crossover: SettTRIX[] = [];
    const { population, bestPerc, crossoverPerc } = this.genetic;
    const bestRes = popRes
      .filter((item) => item.positions > 0)
      .sort((a, b) => (b.net || 0) - (a.net || 0))
      .slice(0, parseInt(`${(population * bestPerc) / 100}`))
      .map((item) => ({
        trix: item.trix,
        sma: item.sma,
        candle: item.candle,
        upper: item.upper,
        lower: item.lower,
        sl: item.sl,
        tp: item.tp,
        tsl: item.tsl,
      }));
    if (bestRes.length > 2) {
      const bestSettings: { [x in TRIXSimulationSettings]: number[] } = {
        trix: [],
        sma: [],
        candle: [],
        upper: [],
        lower: [],
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
  mutation(popRes: TRIXResult[]): SettTRIX[] {
    const { population, mutationPerc, mutations } = this.genetic;
    return [...popRes].slice(0, parseInt(`${(population * mutationPerc) / 100}`)).map((res) => {
      const toReturn = {
        trix: res.trix,
        sma: res.sma,
        upper: res.upper,
        lower: res.lower,
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
        if (set === 'trix' || set === 'sma' || set === 'lower' || set === 'upper') {
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
      const from = 'mutation';
      const { type, history } = res;
      return {
        opts: {
          trix: toReturn.trix,
          sma: toReturn.sma,
          upper: toReturn.upper,
          lower: toReturn.lower,
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
          .join('|')}|${from}|${type}|${history}`,
      };
    });
  }
  formatResult(res: TRIXResult) {
    return {
      trix: res.trix,
      sma: res.sma,
      upper: res.upper,
      lower: -res.lower,
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
}
