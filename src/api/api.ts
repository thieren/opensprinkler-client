import md5 from 'md5';

import { OpensprinklerConfig } from '../types/config';
import { NotConnectedError } from '../types/errors';
import { OsApiVersion, Properties, PropertyKey, PropertyOwnerType, PropertyValue, ReadEndpoint, WriteEndpoint } from '../types/types';
import { PropertyOwner } from './propertyowner';
import { ApiRequest } from './request';

export class OpensprinklerApi extends PropertyOwner {

  private config: OpensprinklerConfig;
  private connected = false;

  constructor(config: OpensprinklerConfig) {
    super(PropertyOwnerType.API);
    this.config = config;

    this.setAPI(this);
  }

  public async connect(): Promise<void> {
    if (!this.config.password) {
      this.log.error('No password was supplied. Abort...');
      throw new Error('No Password supplied!');
    }

    if (this.config.isPlain) {
      this.config.password = md5(this.config.password); // convert to md5 hash
    }

    try {
      const request = new ApiRequest(this.config, { endpoint: ReadEndpoint.OPTIONS });
      const json = await request.execute();
      this.updateProperties(json);
      const apiVersion = this.getPropertyValue(PropertyKey.FIRMWARE_VERSION);
      if (apiVersion) {
        this.log.info(`Connected to controller with firmware: ${OsApiVersion[apiVersion]}`);
        if (apiVersion >= OsApiVersion.Firmware_2_1_9) {
          this.log.warn(
            'Your Controller uses a newer firmware than 2.1.9. This might result in issues.' + 
            'Please look if there is already an update available to this client.',
          );
        }
      } else {
        throw new NotConnectedError();
      }
      this.connected = true;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  public async getEndpointResponse(endpoint: ReadEndpoint): Promise<object> {
    try {
      if (!this.connected) {
        throw new NotConnectedError();
      }
      const request = new ApiRequest(this.config, { endpoint: endpoint });
      return request.execute();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  public async writePropertyValue(endpoint: WriteEndpoint, key: string, value: string | number): Promise<void> {
    const properties: Properties = {};
    properties[key] = value;
    return this.writePropertyValues(endpoint, properties);
  }

  public async writePropertyValues(endpoint: WriteEndpoint, properties: Properties): Promise<void> {
    try {
      if (!this.connected) {
        throw new NotConnectedError();
      }
      const request = new ApiRequest(this.config, { endpoint: endpoint, properties: properties });
      await request.execute();
    } catch (err) {
      return Promise.reject(err);
    }
  }
}
