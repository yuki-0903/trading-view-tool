export interface GmoApiResponse<T> {
  status: number,
  responsetime: string,
  data: T
}

export interface KLineData {
  openTime: string,
  open: string,
  high: string,
  low: string,
  close: string
}

export interface TickerData {
  symbol: string,
  ask: string,
  bid: string,
  timestamp: string,
  status: string
}

export interface StatusData {
  status: string
}

export type KLineResponse = GmoApiResponse<KLineData[]>;
export type TickerResponse = GmoApiResponse<TickerData[]>;
export type StatusResponse = GmoApiResponse<StatusData>;