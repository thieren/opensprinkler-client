import EventEmitter from 'events';
import { InvalidConversionError, InvalidEndpointError, NotSupportedbyFirmwareVersionError } from '../types/errors';
import {
  AllProperties,
  Endpoint,
  OsApiVersion,
  PropertyKey,
  PropertyMetaData,
  PropertyOwnerType,
  PropertyValue,
  ReadEndpoint,
  WriteEndpoint,
} from '../types/types';
import { Logging } from '../util.ts/Logger';
import { OpensprinklerApi } from './api';

export abstract class PropertyOwner extends EventEmitter {
  protected log = Logging.getLoggerInstance();

  protected api?: OpensprinklerApi;

  protected properties: { [index: string]: PropertyValue } = {};
  private type: PropertyOwnerType;

  private writeLocked = false;

  constructor(type: PropertyOwnerType, api: OpensprinklerApi | undefined = undefined) {
    super();

    this.api = api;
    this.type = type;
  }

  public setAPI(api: OpensprinklerApi) {
    this.api = api;
  }

  public lockWrites(value = true) {
    this.writeLocked = value;
    if (!value) {
      this.emit('unlocked');
    }
  }

  protected async waitForUnlock(): Promise<void> {
    if (!this.writeLocked) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const unlockTimeout = setTimeout(() => {
        this.log.warn('Write lock for property refresh was not resolved correctly!');
        this.lockWrites(false);
        resolve();
      }, 7500);

      this.once('unlocked', () => {
        if (unlockTimeout) {
          clearTimeout(unlockTimeout);
        }
        resolve();
      });
    });
  }

  public async refreshProperties(endpointResponses: Map<Endpoint, object> = new Map<Endpoint, object>()): Promise<Map<Endpoint, object>> {
    try {
      if (!this.api) {
        throw new Error('no api specified for request');
      }

      const neededEndpoints = this.neededEndpointsForFullUpdate();

      for (const endpoint of neededEndpoints) {
        let response = endpointResponses.get(endpoint);
        if (response === undefined) {
          response = await this.api.getEndpointResponse(endpoint);
          endpointResponses.set(endpoint, response);
        }
        await this.updateProperties(response);
      }

      return Promise.resolve(endpointResponses);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  public async refreshProperty(key: PropertyKey): Promise<PropertyValue> {
    try {
      if (!this.api) {
        throw new Error('no api specified for request');
      }

      const endpoint = this.getPropertyReadEndpoint(key);
      const response = await this.api.getEndpointResponse(endpoint);
      await this.updateProperties(response);
      const value = this.getPropertyValue(key);
      if (value === undefined) {
        return Promise.reject('no property value found');
      }
      return Promise.resolve(value);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  private neededEndpointsForFullUpdate(): ReadEndpoint[] {
    const ep: ReadEndpoint[] = [];
    for (const key in AllProperties[this.type]) {
      if (AllProperties[this.type][key].readEndpoint && !ep.includes(AllProperties[this.type][key].readEndpoint!)) {
        ep.push(AllProperties[this.type][key].readEndpoint!);
      }
    }
    return ep;
  }

  public async updateProperty(key: string, value: PropertyValue) {
    if (AllProperties[this.type][key] !== undefined) {
      let assignableValue;
      switch (AllProperties[this.type][key].type) {
        case 'number':
          if (typeof value !== 'number') {
            throw new InvalidConversionError(
              `Value ${value} with type ${typeof value} could not be assigned to property ${key}`,
            );
          }
          assignableValue = value as number;
          break;

        case 'number[]':
          if (!Array.isArray(value) || (value.length > 0 && typeof value[0] !== 'number')) {
            throw new InvalidConversionError(
              `Value ${value} could not be assigned to property ${key} since it is no array of numbers`,
            );
          }
          assignableValue = value as number[];
          break;

        case 'number[][]':
          if (!Array.isArray(value) || (value.length > 0 && !Array.isArray(value[0])) ||
              (Array.isArray(value[0]) && value[0].length > 0 && typeof value[0][0] !== 'number')) {
            throw new InvalidConversionError(
              `Value ${value} could not be assigned to property ${key} since it is no array of array of numbers`,
            );
          }
          assignableValue = value as number[][];
          break;
        
        case 'string[]':
          if (!Array.isArray(value) || (value.length > 0 && typeof value[0] !== 'string')) {
            throw new InvalidConversionError(
              `Value ${value} could not be assigned to property ${key} since it is no array of strings`,
            );
          }
          assignableValue = value as string[];
          break;
      }

      if (AllProperties[this.type][key].validValues && AllProperties[this.type][key].validValues!.indexOf(assignableValue) === -1) {
        this.log.error(`Value ${value} could not be assigned to property ${key}, since it is not listed as valid value.`);
        return;
      }

      if (this.properties[key] !== assignableValue) {
        this.properties[key] = assignableValue;
      }
    }
  }

  protected async updateProperties(source: object) {
    try {
      for (const key of Object.keys(source)) {
        await this.updateProperty(key, source[key]);
      }
    } catch (err) {
      throw err as Error;
    }
  }

  public async writeProperty(key: PropertyKey, value: PropertyValue): Promise<void> {
    try {
      if (!this.api) {
        throw new Error('no api specified for request');
      }

      if (!this.isSupportedByFirmwareVersion(key)) {
        throw new NotSupportedbyFirmwareVersionError();
      }

      await this.waitForUnlock();

      const endpoint = this.getPropertyWriteEndpoint(key);

      const apiVersion = this.api.getPropertyValue(PropertyKey.FIRMWARE_VERSION);
      if (endpoint === WriteEndpoint.OPTIONS && apiVersion && apiVersion < OsApiVersion.Firmware_2_1_9) {
        throw new Error('old way of setting options is not implemented yet');
      }

      await this.api.writePropertyValue(endpoint, key, value);
      await this.updateProperty(key, value);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  private isSupportedByFirmwareVersion(key: PropertyKey): boolean {
    if (!this.api) {
      return false;
    }

    const metadata = this.getPropertyMetaData(key);
    const apiVersion = this.api.getPropertyValue(PropertyKey.FIRMWARE_VERSION);
    const maxFw = ((metadata && metadata.maximumFw) ? metadata.maximumFw : apiVersion) as OsApiVersion;
    if (metadata && apiVersion && apiVersion >= metadata.minimumFw && apiVersion <= maxFw) {
      return true;
    } else {
      return false;
    }
  }

  public getPropertyValue(key: PropertyKey): PropertyValue | undefined {
    return this.properties[key];
  }

  private getPropertyMetaData(key: PropertyKey): PropertyMetaData | undefined {
    for (const properties of Object.values(AllProperties)) {
      if (properties[key]) {
        return properties[key];
      }
    }
    return undefined;
  }

  private getPropertyReadEndpoint(key: PropertyKey): ReadEndpoint {
    if (AllProperties[this.type][key] && AllProperties[this.type][key].readEndpoint) {
      return AllProperties[this.type][key].readEndpoint!;
    } else {
      throw new InvalidEndpointError(`Could not resolve read endpoint for key ${PropertyKey[key]}`);
    }
  }

  private getPropertyWriteEndpoint(key: PropertyKey): WriteEndpoint {
    if (AllProperties[this.type][key] && AllProperties[this.type][key].writeEndpoint) {
      return AllProperties[this.type][key].writeEndpoint!;
    } else {
      throw new InvalidEndpointError(`Could not resolve write endpoint for key ${PropertyKey[key]}`);
    }
  }
}
