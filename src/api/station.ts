import { PropertyKey, PropertyOwnerType } from '../types/types';
import { OpensprinklerApi } from './api';
import { PropertyOwner } from './propertyowner';

export declare type Zone = Station;

export class Station extends PropertyOwner {

  private index: number;

  constructor(index: number, api: OpensprinklerApi) {
    super(PropertyOwnerType.STATION, api);

    this.index = index;
  }

  public getName(): string | undefined {
    const names = this.getPropertyValue(PropertyKey.STATION_NAMES) as string[] | undefined;
    if (names && names.length > this.index) {
      return names[this.index];
    }
    return undefined;
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
}