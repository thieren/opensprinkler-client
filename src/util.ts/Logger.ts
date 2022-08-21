import { Logger, dummyLogger } from 'ts-log';

export class Logging {

  private static logInstance: Logger = dummyLogger;

  private constructor() {
    // not instantiable
  }

  public static getLoggerInstance(): Logger {
    return Logging.logInstance;
  }

  public static setLoggerInstance(log: Logger) {
    Logging.logInstance = log;
  }
}