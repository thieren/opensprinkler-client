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
}