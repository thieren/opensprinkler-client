export type OpensprinklerConfig = {
  password: string;
  isPlain?: boolean;
  ip: string;
  port?: number;
  pollingIntervalSeconds?: number;
};