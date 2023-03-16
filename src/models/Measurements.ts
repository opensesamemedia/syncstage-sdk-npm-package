import { IMeasurements } from "./IMeasurements";

export default class Measurements implements IMeasurements {
    constructor(
      public networkDelayMs: number,
      public networkJitterMs: number,
      public quality: number,
    ) {}
  }