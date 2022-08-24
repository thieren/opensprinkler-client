import { PropertyKey, PropertyOwnerType, PropertyValue } from '../types/types';
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

  public override updateProperty(key: string, value: PropertyValue): void {
    if (this.wateringEndTime !== undefined && this.wateringEndTime < Date.now()) {
      this.wateringEndTime = undefined;
    }

    const newValue = value;
    if (key === PropertyKey.DEVICE_TIME) {
      this.timedifference = Date.now() - (value as number);
    } else if (key === PropertyKey.PROGRAM_STATUS_DATA) {
      const psd = value as number[][];
      if (psd.length > this.index && psd[this.index].length === 3) {
        const rem = psd[this.index][1];
        this.wateringEndTime = Date.now() + rem;
      }
    }
    super.updateProperty(key, newValue);
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

  public getRemainingWateringTime(): number {
    if (this.wateringEndTime !== undefined) {
      const rem = this.wateringEndTime - Date.now();
      return (rem > 0) ? rem : 0;
    }
    return 0;
  }
}