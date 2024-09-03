interface ISessionSettings {
  inputDevices: Array<{
    identifier: number;
    name: string;
    selected: boolean;
  }>;
  outputDevices: Array<{
    identifier: number;
    name: string;
    selected: boolean;
  }>;
  latencyOptimizationLevel: number;
  noiseCancellationEnabled: boolean;
  disableGain: boolean;
  directMonitorEnabled: boolean;
}

export default ISessionSettings;
