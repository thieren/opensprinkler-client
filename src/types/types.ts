export enum OsApiVersion {
  Firmware_2_1_0 = 210,
  Firmware_2_1_1 = 211,
  Firmware_2_1_2 = 212,
  Firmware_2_1_3 = 213,
  Firmware_2_1_4 = 214,
  Firmware_2_1_5 = 215,
  Firmware_2_1_6 = 216,
  Firmware_2_1_7 = 217,
  Firmware_2_1_8 = 218,
  Firmware_2_1_9 = 219,
}

export enum PropertyOwnerType {
  API = 'api',
  CONTROLLER = 'controller',
  STATION = 'station',
  ZONE = 'station', //synonym
}

export enum ResultCode {
  SUCCESS = 1,
  UNAUTHORIZED = 2,
  MISMATCH = 3,
  DATA_MISSING = 16,
  OUT_OF_RANGE = 17,
  DATA_FORMAT_ERROR = 18,
  RF_CODE_ERROR = 19,
  PAGE_NOT_FOUND = 32,
  NOT_PERMITTED = 48,
}

export declare type Endpoint = WriteEndpoint | ReadEndpoint;

export enum ReadEndpoint {
  CONTROLLER_VARIABLES = 'jc',
  OPTIONS = 'jo',
  STATION_NAMES_AND_ATTRIBUTES = 'jn',
}

export enum WriteEndpoint {
  CONTROLLER_VARIABLES = 'cv',
  OPTIONS = 'co',
  STATION_NAMES_AND_ATTRIBUTES = 'cs',
}

export enum PropertyKey {
  DEVICE_TIME = 'devt',
  NUMBER_OF_BOARDS = 'nbrd',
  OPERATION_ENABLE = 'en',
  STATION_STATUS_BITS = 'sbits',
  PROGRAM_STATUS_DATA = 'ps',
  FIRMWARE_VERSION = 'fwv',
  RAIN_DELAY = 'rd',
  STATION_NAMES = 'snames',
  STATION_DISABLED = 'stn_dis',
}

export declare type PropertyMetaData = {
  key: PropertyKey;
  readEndpoint?: ReadEndpoint;
  writeEndpoint?: WriteEndpoint;
  minimumFw: OsApiVersion;
  maximumFw?: OsApiVersion;
  type: string;
  validValues?: unknown[];
};

// api

export const FirmwareProperty: PropertyMetaData = {
  key: PropertyKey.FIRMWARE_VERSION,
  readEndpoint: ReadEndpoint.OPTIONS,
  minimumFw: OsApiVersion.Firmware_2_1_0,
  type: 'number',
};

// controller
export const DeviceTimeProperty: PropertyMetaData = {
  key: PropertyKey.DEVICE_TIME,
  readEndpoint: ReadEndpoint.CONTROLLER_VARIABLES,
  minimumFw: OsApiVersion.Firmware_2_1_0,
  type: 'number',
};

export const NumberOfBoardsProperty: PropertyMetaData = {
  key: PropertyKey.NUMBER_OF_BOARDS,
  readEndpoint: ReadEndpoint.CONTROLLER_VARIABLES,
  minimumFw: OsApiVersion.Firmware_2_1_0,
  type: 'number',
};

export const OperationActiveProperty: PropertyMetaData = {
  key: PropertyKey.OPERATION_ENABLE,
  readEndpoint: ReadEndpoint.CONTROLLER_VARIABLES,
  writeEndpoint: WriteEndpoint.CONTROLLER_VARIABLES,
  minimumFw: OsApiVersion.Firmware_2_1_0,
  type: 'number',
  validValues: [0, 1],
};

export const StationStatusProperty: PropertyMetaData = {
  key: PropertyKey.STATION_STATUS_BITS,
  readEndpoint: ReadEndpoint.CONTROLLER_VARIABLES,
  minimumFw: OsApiVersion.Firmware_2_1_0,
  type: 'number[]',
};

export const RainDelayActiveProperty: PropertyMetaData = {
  key: PropertyKey.RAIN_DELAY,
  readEndpoint: ReadEndpoint.CONTROLLER_VARIABLES,
  writeEndpoint: WriteEndpoint.CONTROLLER_VARIABLES,
  minimumFw: OsApiVersion.Firmware_2_1_0,
  type: 'number',
};

// station
export const StationNamesProperty: PropertyMetaData = {
  key: PropertyKey.STATION_NAMES,
  readEndpoint: ReadEndpoint.STATION_NAMES_AND_ATTRIBUTES,
  minimumFw: OsApiVersion.Firmware_2_1_0,
  type: 'string[]',
};

export const ProgramStatusDataProperty: PropertyMetaData = {
  key: PropertyKey.PROGRAM_STATUS_DATA,
  readEndpoint: ReadEndpoint.CONTROLLER_VARIABLES,
  minimumFw: OsApiVersion.Firmware_2_1_0,
  type: 'number[][]',
};

export const StationDisabledProperty: PropertyMetaData = {
  key: PropertyKey.STATION_DISABLED,
  readEndpoint: ReadEndpoint.STATION_NAMES_AND_ATTRIBUTES,
  writeEndpoint: WriteEndpoint.STATION_NAMES_AND_ATTRIBUTES,
  minimumFw: OsApiVersion.Firmware_2_1_0,
  type: 'number[]',
};

export declare type PropertyValue = string | string[] | number | number[] | number[][];

export interface Properties {
  [index: string]: PropertyValue;
}

export interface IndexedProperty {
  [index: string]: PropertyMetaData;
}

interface IndexedPropertyOwner {
  [index: string]: IndexedProperty;
}

export const AllProperties: IndexedPropertyOwner = {
  [PropertyOwnerType.API]: {
    [PropertyKey.FIRMWARE_VERSION]: FirmwareProperty,
  },

  [PropertyOwnerType.CONTROLLER]: {
    [PropertyKey.DEVICE_TIME]: DeviceTimeProperty,
    [PropertyKey.NUMBER_OF_BOARDS]: NumberOfBoardsProperty,
    [PropertyKey.OPERATION_ENABLE]: OperationActiveProperty,
    [PropertyKey.STATION_STATUS_BITS]: StationStatusProperty,
    [PropertyKey.RAIN_DELAY]: RainDelayActiveProperty,
  },

  [PropertyOwnerType.STATION]: {
    [PropertyKey.DEVICE_TIME]: DeviceTimeProperty,
    [PropertyKey.STATION_NAMES]: StationNamesProperty,
    [PropertyKey.STATION_DISABLED]: StationDisabledProperty,
    [PropertyKey.STATION_STATUS_BITS]: StationStatusProperty,
    [PropertyKey.PROGRAM_STATUS_DATA]: ProgramStatusDataProperty,
  },
};