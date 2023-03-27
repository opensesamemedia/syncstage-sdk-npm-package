import { IMeasurements } from './models/IMeasurements';
import { ISession, ISessionIdentifier } from './models/ISession';
import { IZonesList } from './models/IZonesList';
import Measurements from './models/Measurements';
import { Connection, Session, SessionIdentifier } from './models/Session';

export const MOCK_RECEIVER_VOLUME: number = 90;
export const MOCK_INTERNAL_MIC_ENABLED: boolean = false;
export const MOCK_IS_MICROPHONE_MUTED: boolean = false;

export const MOCK_RECEIVER_MEASUREMENTS: IMeasurements = new Measurements(10, 2, 99);
export const MOCK_TRANSMITTER_MEASUREMENTS: IMeasurements = new Measurements(15, 3, 87);

export const MOCK_ZONES_IN_REGION_LIST: IZonesList = [
  {
    zoneId: 'co5Sck8Ef8DzHqAgXnY0x5qXzs',
    zoneName: 'Warsaw',
  },
];

export const MOCK_SESSION: ISession = new Session(
  'cqmrmgdtqnR9WAWBW5k32GmNFE',
  '2023-03-17T12:50:25.531Z',
  '2023-03-17T12:50:25.743Z',
  new Connection(
    'cqmrmgdtqnqweqwe1',
    'test-user-id1',
    false,
    '2023-03-17T12:50:25.531Z',
    '2023-03-17T12:50:25.743Z',
    'Test user 1',
  ),
  [
    new Connection(
      'cqmrmgdtqnqweqwe2',
      'test-user-id2',
      false,
      '2023-03-17T12:50:25.531Z',
      '2023-03-17T12:50:25.743Z',
      'Test user 2',
    ),
    new Connection(
      'cqmrmgdtqnqweqwe3',
      'test-user-id3',
      false,
      '2023-03-17T12:50:25.531Z',
      '2023-03-17T12:50:25.743Z',
      'Test user 3',
    ),
  ],
);

export const MOCK_SESSION_IDENTIFIER: ISessionIdentifier = new SessionIdentifier(
  'cqmrmgdtqnR9WAWBW5k32GmNFE',
  'asq-1sd-qwe',
  '2023-03-17T12:50:25.531Z',
);
