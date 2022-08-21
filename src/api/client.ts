import { OpensprinklerConfig } from '../types/config';
import { Endpoint, PropertyKey } from '../types/types';
import { OpensprinklerApi } from './api';
import { Controller } from './controller';

import { Logger } from 'ts-log';
import { Logging } from '../util.ts/Logger';

export class OpensprinklerClient {
  private config: OpensprinklerConfig;
  private api: OpensprinklerApi;
  private log: Logger;

  private controller: Controller;

  private refreshTimeout?: NodeJS.Timeout;

  constructor(config: OpensprinklerConfig, log: Logger | undefined = undefined) {
    
    if (log) {
      Logging.setLoggerInstance(log);
    }
    this.log = Logging.getLoggerInstance();

    this.config = config;
    this.config.pollingIntervalSeconds = config.pollingIntervalSeconds ??= 30;

    this.api = new OpensprinklerApi(this.config);
    this.controller = new Controller(this.api);
  }

  public async connect(): Promise<void> {
    try {
      this.log.info('Connecting...');
      await this.api.connect();
      await this.refreshAllData();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  public stopClient() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
  }

  private async refreshAllData() {
    try {
      this.log.debug('Start full data refresh.');
      let endpointResponses = new Map<Endpoint, object>();
      this.controller.lockWrites(true);
      endpointResponses = await this.controller.refreshProperties(endpointResponses);
    } catch(err) {
      this.log.error(`Data refresh could not continue due to error: ${err}`);
    } finally {
      this.log.debug('Full data refresh ended.');
      this.controller.lockWrites(false);
      this.scheduleRefreshAllData();
    }
  }

  private scheduleRefreshAllData() {
    this.log.debug(`Scheduling next data refresh in ${this.config.pollingIntervalSeconds} seconds`);
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    this.refreshTimeout = setTimeout(() => {
      this.refreshAllData();
    }, this.config.pollingIntervalSeconds! * 1000);
  }

  public getController(): Controller {
    return this.controller;
  }

  public isEnabled(): boolean {
    return this.controller.isEnabled();
  }

  public async setEnabled(value: boolean): Promise<void> {
    try {
      this.log.debug(`Setting controller enabled: ${value}`);
      const v = value ? 1 : 0;
      await this.controller.writeProperty(PropertyKey.OPERATION_ENABLE, v);
    } catch(err) {
      this.log.error(`Unable to set controller to ${value}, due to error: ${err}`);
      return Promise.reject(err);
    }
  }
}
