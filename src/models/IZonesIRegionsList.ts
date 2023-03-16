export interface IRegionZone {
  zoneId: string;
  zoneName: string;
  providerType: string;
}

export interface IRegion {
  regionId: string;
  regionName: string;
  zones: Array<IRegionZone>;
}

export type IZonesInRegionsList = Array<IRegion>;
