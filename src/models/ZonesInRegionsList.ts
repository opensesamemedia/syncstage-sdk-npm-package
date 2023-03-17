import { IRegionZone, IRegion } from './IZonesIRegionsList';

export class RegionZone implements IRegionZone {
  zoneId: string;
  zoneName: string;
  providerType: string;

  constructor(zoneId: string, zoneName: string, providerType: string) {
    this.zoneId = zoneId;
    this.zoneName = zoneName;
    this.providerType = providerType;
  }
}

export class Region implements IRegion {
  regionId: string;
  regionName: string;
  zones: Array<RegionZone>;

  constructor(regionId: string, regionName: string, zones: Array<RegionZone>) {
    this.regionId = regionId;
    this.regionName = regionName;
    this.zones = zones;
  }
}
