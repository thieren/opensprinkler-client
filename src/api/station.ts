import { StationAlreadyRunningError } from '../types/errors';
import { PropertyKey, PropertyOwnerType, PropertyValue, WriteEndpoint } from '../types/types';
import { EpochTimeNow } from '../util.ts/utils';
import { OpensprinklerApi } from './api';
import { PropertyOwner } from './propertyowner';

export declare type Zone = Station;

export class Station extends PropertyOwner {

  private index: number;

  private timedifference = 0;
  private wateringEndTime?: number | undefined = undefined;

  constructor(index: number, api: OpensprinklerApi) {
    super(PropertyOwnerType.STATION, api);

    this.index = index;
  }

  public override async updateProperty(key: string, value: PropertyValue) {
    if (this.wateringEndTime !== undefined && this.wateringEndTime < EpochTimeNow()) {
      this.wateringEndTime = undefined;
    }

    const newValue = value;
    if (key === PropertyKey.DEVICE_TIME) {
      this.timedifference = EpochTimeNow() - (value as number);
    } else if (key === PropertyKey.PROGRAM_STATUS_DATA) {
      const psd = value as number[][];
      if (psd.length > this.index && psd[this.index].length === 3) {
        const rem = psd[this.index][1];
        const start = psd[this.index][2];
        if (rem !== 0 && start !== 0) {
          this.wateringEndTime = start + rem + this.timedifference;
        }
      }
    }
    await super.updateProperty(key, newValue);
  }

  public getIndex(): number {
    return this.index;
  }

  public getName(): string | undefined {
    const names = this.getPropertyValue(PropertyKey.STATION_NAMES) as string[] | undefined;
    if (names && names.length > this.index) {
      return names[this.index];
    }
    return undefined;
  }

  public async manualStart(duration: number, stop = false): Promise<void> {
    try {
      if (!this.api) {
        throw new Error('no api specified for request');
      }

      if (duration <= 0 && !stop) {
        throw new Error(`invalid duration value to run station: ${duration}`);
      }

      await this.refreshProperty(PropertyKey.STATION_STATUS_BITS);
      if (this.isInUse() && !stop) {
        throw new StationAlreadyRunningError();
      }

      await this.api.writePropertyValues(WriteEndpoint.MANUAL_STATION_RUN, {
        'sid': this.index,
        'en': (stop) ? 0 : 1,
        't': (stop) ? 0 : duration,
      });

      // update raw properties
      let boardIndex = 0;
      let tmpIndex = this.index;
      while (tmpIndex > 7) {
        boardIndex++;
        tmpIndex -= 8;
      }
      const newsbits = this.getPropertyValue(PropertyKey.STATION_STATUS_BITS);
      const newps = this.getPropertyValue(PropertyKey.PROGRAM_STATUS_DATA)
      if (newps === undefined || newsbits === undefined) {
        throw new Error('invalid property data');
      }
      newsbits[boardIndex] = stop ? 0 : newsbits[boardIndex] | (1 << tmpIndex);
      newps[this.index] = stop ? [0, 0, 0] : [99, duration, EpochTimeNow() - this.timedifference];
      await this.updateProperty(PropertyKey.STATION_STATUS_BITS, newsbits);
      await this.updateProperty(PropertyKey.PROGRAM_STATUS_DATA, newps);
      
    } catch (err) {
      return Promise.reject(err);
    }
  }

  public async stop(): Promise<void> {
    return this.manualStart(0, true);
  }

  public isDisabled(): boolean {
    const stnDis = this.getPropertyValue(PropertyKey.STATION_DISABLED) as number[] | undefined;
    let boardIndex = 0;
    let tmpIndex = this.index;
    while (tmpIndex > 7) {
      boardIndex++;
      tmpIndex -= 8;
    }
    const value = (stnDis !== undefined && (1 << tmpIndex & stnDis[boardIndex]) > 0);
    this.log.debug(`Getting station '${this.getName()}' (${this.index}) disabled flag: ${value}`);
    return value;
  }

  public async setDisabled(value = true): Promise<void> {
    try {
      if (!this.api) {
        throw new Error('no api specified for request');
      }

      let boardIndex = 0;
      let tmpIndex = this.index;
      while (tmpIndex > 7) {
        boardIndex++;
        tmpIndex -= 8;
      }
      const current = await this.refreshProperty(PropertyKey.STATION_DISABLED) as number[];

      if (current.length < boardIndex) {
        throw new Error('Invalid return value for disabled stations');
      }

      const isDisabled = ((current[boardIndex] & (1 << tmpIndex)) > 0);

      if (isDisabled !== value) {
        const newValue = (value)
          ? (current[boardIndex] | (1 << tmpIndex)) // set disabled
          : (current[boardIndex] & ((1 << tmpIndex) ^ 255)); // set disabled
        await this.api.writePropertyValue(WriteEndpoint.STATION_NAMES_AND_ATTRIBUTES, `d${boardIndex}`, newValue);

        // update raw property
        current[boardIndex] = newValue;
        await this.updateProperty(PropertyKey.STATION_DISABLED, current);
      }
    } catch (err) {
      return Promise.reject(err);
    }
  }

  public isInUse(): boolean {
    const sbits = this.getPropertyValue(PropertyKey.STATION_STATUS_BITS) as number[] | undefined;
    if (sbits === undefined) {
      return false;
    }
    let boardIndex = 0;
    let tmpIndex = this.index;
    while (tmpIndex > 7) {
      boardIndex++;
      tmpIndex -= 8;
    }
    const value = ((1 << tmpIndex & sbits[boardIndex]) > 0);
    this.log.debug(`Getting station '${this.getName()}' in use state: ${value} (sbits: ${sbits})`);
    return value;
  }

  public getRemainingWateringTime(): number {
    if (!this.isInUse() || this.wateringEndTime === undefined) {
      return 0;
    }
    const rem = this.wateringEndTime - EpochTimeNow();
    return (rem > 0) ? rem : 0;
  }

  public getWateringEndTime(): number {
    return (this.wateringEndTime !== undefined) ? this.wateringEndTime : 0;
  }
}