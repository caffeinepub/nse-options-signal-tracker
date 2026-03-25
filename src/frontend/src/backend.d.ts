import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Signal {
    id: SignalId;
    status: Status;
    strategy: Strategy;
    targetPrice: bigint;
    strikePrice: bigint;
    optionType: OptionType;
    stopLoss: bigint;
    timestamp: Time;
    entryPrice: bigint;
    expiry: string;
    confidence: bigint;
    symbol: string;
}
export type SignalId = bigint;
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export type Time = bigint;
export interface FetchResult {
    body: string;
    isLive: boolean;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export enum OptionType {
    CE = "CE",
    PE = "PE"
}
export enum Status {
    ProfitBooked = "ProfitBooked",
    Active = "Active",
    Expired = "Expired"
}
export enum Strategy {
    OI = "OI",
    PCR = "PCR",
    RSI = "RSI",
    MACD = "MACD",
    News = "News",
    Volume = "Volume",
    Bollinger = "Bollinger"
}
export interface backendInterface {
    addSignal(signal: Signal): Promise<SignalId>;
    clearOldSignals(days: bigint): Promise<void>;
    fetchLiveOHLCV(symbol: string, interval: string): Promise<FetchResult>;
    fetchLiveQuotes(): Promise<{
        body: string;
        isLive: boolean;
    }>;
    getAllSignals(): Promise<Array<Signal>>;
    getBySymbol(symbol: string): Promise<Array<Signal>>;
    removeProfitBookedSignals(): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateSignalStatus(id: SignalId, status: Status): Promise<void>;
}
