import { getSupportedCodeFixes } from 'typescript';
import { ResultCode } from './types';

export class NotConnectedError extends Error {
  constructor() {
    super('Client is not connected!');
  }
}

export class NotSupportedbyFirmwareVersionError extends Error {
  constructor() {
    super('This action is not supported by the firmware of your controller');
  }
}

export class InvalidRequestError extends Error {
  constructor(resultCode: ResultCode) {
    super(`Request came back with result code: ${ResultCode[resultCode]} (${resultCode})`);
  }
}

export class InvalidEndpointError extends Error { }

export class InvalidConversionError extends Error { }

export class StationAlreadyRunningError extends Error {
  constructor() {
    super('Station already running');
  }
}