import { Math } from '@mt-inc/utils';

declare global {
  interface ObjectConstructor {
    keys<T>(o: T): Array<keyof T>;
  }
}

export type HistoryType = '2c' | '3c';
export type sett = { from: number; to: number; step: number; int: boolean };
export type geneticSettings = {
  population: number;
  crossoverPerc: number;
  bestPerc: number;
  mutationPerc: number;
  mutations: number;
};
export type defSett = {
  id: string;
  history: HistoryType;
  from: 'rand' | 'crossover' | 'mutation';
  sl: number;
  tp: number;
  tsl: number;
  candle: number;
};
export type defResult = {
  positions: number;
  net: number;
  probProfit: number;
  probLoss: number;
  avgProfit: number;
  avgLoss: number;
  expectation: number;
  candle: number;
  id: string;
  ap: number;
  history: HistoryType;
  sl: number;
  tp: number;
  tsl: number;
  from: string;
  fall: string;
  fallToProfit: number;
};

export class Simulate {
  public math: Math;
  constructor() {
    this.math = new Math();
  }
}

export { MAbot } from './src/ma';
export { MASimulation } from './src/ma/simulation';
export { TrixBot } from './src/trix';
export { TRIXSimulation } from './src/trix/simulation';
