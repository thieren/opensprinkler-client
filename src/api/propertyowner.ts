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

  private api?: OpensprinklerApi;

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

  private async waitForUnlock(): Promise<void> {
    if (!this.writeLocked) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const unlockTimeout = setTimeout(() => {
        this.lockWrites(false);
        resolve();
      }, 5000);

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
        this.updateProperties(response);
      }

      return Promise.resolve(endpointResponses);
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

  public updateProperty(key: string, value: unknown) {
    if (AllProperties[this.type][key] !== undefined) {
      let assignableValue;
      switch (AllProperties[this.type][key].type) {
        case 'number':
          if (typeof value !== 'number') {
            throw new InvalidConversionError(`Value ${value} with type ${typeof value} could be assigned to property ${PropertyKey[key]}`);
          }
          assignableValue = value as number;
          break;
      }

      if (AllProperties[this.type][key].validValues && AllProperties[this.type][key].validValues!.indexOf(assignableValue) === -1) {
        return;
      }

      if (this.properties[key] !== assignableValue) {
        this.properties[key] = assignableValue;
      }
    }
  }

  protected updateProperties(source: object) {
    Object.keys(source).forEach((key) => {
      this.updateProperty(key, source[key]);
    });
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
      this.updateProperty(key, value);
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
