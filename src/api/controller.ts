import { PropertyKey, PropertyOwnerType, PropertyValue } from '../types/types';
import { OpensprinklerApi } from './api';
import { PropertyOwner } from './propertyowner';
import { Station } from './station';

export class Controller extends PropertyOwner {

  private timedifference = 0;

  private stations: Station[] = [];

  constructor(api: OpensprinklerApi) {
    super(PropertyOwnerType.CONTROLLER, api);
  }

  public override updateProperty(key: string, value: PropertyValue): void {
    let newValue = value;
    if (key === PropertyKey.DEVICE_TIME) {
      this.timedifference = Date.now() - (value as number);
    } else if (key === PropertyKey.NUMBER_OF_BOARDS && (value as number)*8 !== this.stations.length) {
      this.log.info(`Found ${(value as number)} station boards. Updating station data...`);
      // update station data
      const expectedNumberOfStations = (value as number) * 8;
      while (this.stations.length < expectedNumberOfStations && this.api) {
        this.log.debug(`Adding new station with index: ${this.stations.length}`);
        const station = new Station(this.stations.length, this.api);
        this.stations.push(station);
      }
    } else if (key === PropertyKey.RAIN_DELAY) {
      newValue = (value as number >= 1) ? 1 : 0;
    }
    super.updateProperty(key, newValue);
  }

  public getStations(): Station[] {
    return this.stations;
  }

  public getStationByName(name: string): Station | undefined {
    return this.stations.find(s => s.getName() === name);
  }

  public getStationByIndex(index: number): Station | undefined {
    if (this.stations.length > index && index >= 0) {
      return this.stations[index];
    }
    return undefined;
  }

  public getControllerTime(): number {
    const value = Date.now() - this.timedifference;
    this.log.debug('Getting controller time:', value);
    return value;
  }

  public isEnabled(): boolean {
    const value = this.getPropertyValue(PropertyKey.OPERATION_ENABLE);
    this.log.debug('Getting controller \'enabled\' state: ', value);
    return value === 1;
  }

  public isRainDelayActive(): boolean {
    const value = this.getPropertyValue(PropertyKey.RAIN_DELAY);
    this.log.debug('Getting controller \'rainDelay\' state: ', value);
    return value === 1;
  }

  public async setRainDelay(hours: number): Promise<void> {
    return this.writeProperty(PropertyKey.RAIN_DELAY, hours);
  }
}