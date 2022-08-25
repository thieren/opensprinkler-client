import got from 'got';
import { OpensprinklerConfig } from '../types/config.js';
import { InvalidRequestError } from '../types/errors.js';

import { Endpoint, Properties, ResultCode } from '../types/types.js';
import { Logging } from '../util.ts/Logger.js';

export type RequestParameters = {
  endpoint: Endpoint;
  properties?: Properties;
};

export class ApiRequest {
  private log = Logging.getLoggerInstance();

  private config: OpensprinklerConfig;
  private paramters: RequestParameters;

  constructor(config: OpensprinklerConfig, parameters: RequestParameters) {
    this.config = config;
    this.paramters = parameters;
  }

  public async execute(): Promise<object> {
    const url = this.buildRequestString();

    const searchParams = new URLSearchParams();
    searchParams.set('pw', this.config.password);

    if (this.paramters.properties) {
      Object.entries(this.paramters.properties).forEach(([key, value]) => {
        const v = (typeof value === 'string') ? value : String(value);
        searchParams.set(key, v);
      });
      // for (const [key, value] of this.paramters.properties) {
      //   const v = (typeof value === 'string') ? value : String(value);
      //   searchParams.set(key, v);
      // }
    }

    if (this.paramters.properties && Object.keys(this.paramters.properties).length > 0) {
      this.log.debug(`Request: endpoint is ${this.paramters.endpoint}, parameters are`, JSON.stringify(this.paramters.properties));
    } else {
      this.log.debug(`Request: endpoint is ${this.paramters.endpoint}`);
    }

    try {
      const response = await got(url, {
        method: 'GET',
        searchParams: searchParams,
        timeout: {
          lookup: 100,
          connect: 2500,
          secureConnect: 500,
          socket: 1000,
          send: 10000,
          response: 30000,
        },
      });

      if (response.statusCode < 200 || response.statusCode > 299) {
        throw new Error(`Request could not be executed. Response code: ${response.statusCode}`);
      }

      const json = JSON.parse(response.body);
      this.log.debug('Got response:', json);

      if (json.result && json.result !== ResultCode.SUCCESS) {
        throw new InvalidRequestError(json.result);
      }

      return Promise.resolve(json);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  private buildRequestString(): string {
    return `http://${this.config.ip}/${this.paramters.endpoint}`;
  }
}
