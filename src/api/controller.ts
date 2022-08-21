import { PropertyKey, PropertyOwnerType, PropertyValue } from '../types/types';
import { OpensprinklerApi } from './api';
import { PropertyOwner } from './propertyowner';

export class Controller extends PropertyOwner {

  private timedifference = 0;

  constructor(api: OpensprinklerApi) {
    super(PropertyOwnerType.CONTROLLER, api);
  }

  public override updateProperty(key: string, value: unknown): void {
    let newValue = value;
    if (key === PropertyKey.DEVICE_TIME) {
      this.timedifference = Date.now() - (value as number);
    } else if (key === PropertyKey.RAIN_DELAY) {
      newValue = (value as number >= 1) ? 1 : 0;
    }
    super.updateProperty(key, newValue);
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