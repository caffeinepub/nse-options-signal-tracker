import Map "mo:core/Map";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import OutCall "http-outcalls/outcall";



actor {
  type SignalId = Nat;
  type Strategy = {
    #RSI;
    #MACD;
    #Bollinger;
    #Volume;
    #OI;
    #PCR;
    #News;
  };
  type OptionType = {
    #CE;
    #PE;
  };
  type Status = {
    #Active;
    #ProfitBooked;
    #Expired;
  };

  type Signal = {
    id : SignalId;
    timestamp : Time.Time;
    symbol : Text;
    strikePrice : Nat;
    optionType : OptionType;
    expiry : Text;
    strategy : Strategy;
    entryPrice : Nat;
    targetPrice : Nat;
    stopLoss : Nat;
    status : Status;
    confidence : Nat;
  };

  type Quote = {
    symbol : Text;
    price : Nat;
    change : Nat;
    timestamp : Time.Time;
  };

  module Quote {
    public func compareByTimestamp(q1 : Quote, q2 : Quote) : Order.Order {
      Int.compare(q1.timestamp, q2.timestamp);
    };

    public func compareBySymbol(q1 : Quote, q2 : Quote) : Order.Order {
      Text.compare(q1.symbol, q2.symbol);
    };
  };

  module Signal {
    public func compareById(s1 : Signal, s2 : Signal) : Order.Order {
      Nat.compare(s1.id, s2.id);
    };

    public func compareByTimestamp(s1 : Signal, s2 : Signal) : Order.Order {
      Int.compare(s1.timestamp, s2.timestamp);
    };
  };

  let signals = Map.empty<SignalId, Signal>();
  let quotes = Map.empty<Text, Quote>();
  var nextId = 0;

  type OHLCVData = {
    symbol : Text;
    interval : Text;
    open : Nat;
    high : Nat;
    low : Nat;
    close : Nat;
    volume : Nat;
    timestamp : Time.Time;
  };

  module OHLCVData {
    public func compareByTimestamp(o1 : OHLCVData, o2 : OHLCVData) : Order.Order {
      Int.compare(o1.timestamp, o2.timestamp);
    };

    public func compareBySymbol(o1 : OHLCVData, o2 : OHLCVData) : Order.Order {
      Text.compare(o1.symbol, o2.symbol);
    };
  };

  let ohlcvData = Map.empty<Symbol, OHLCVData>();

  type Symbol = Text;

  type FetchResult = {
    body : Text;
    isLive : Bool;
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  public shared ({ caller }) func addSignal(signal : Signal) : async SignalId {
    let id = nextId;
    let newSignal : Signal = {
      signal with
      id;
      timestamp = Time.now();
    };
    signals.add(id, newSignal);
    nextId += 1;
    id;
  };

  public query ({ caller }) func getAllSignals() : async [Signal] {
    signals.values().toArray().sort(Signal.compareByTimestamp);
  };

  public shared ({ caller }) func updateSignalStatus(id : SignalId, status : Status) : async () {
    switch (signals.get(id)) {
      case (null) { Runtime.trap("Signal not found") };
      case (?signal) {
        let updatedSignal : Signal = { signal with status };
        signals.add(id, updatedSignal);
      };
    };
  };

  public shared ({ caller }) func clearOldSignals(days : Nat) : async () {
    let currentTime = Time.now();
    let dayNanos = days * 24 * 60 * 60 * 1_000_000_000;
    for ((id, signal) in signals.entries()) {
      if (currentTime - signal.timestamp > dayNanos) {
        signals.remove(id);
      };
    };
  };

  public query ({ caller }) func getBySymbol(symbol : Text) : async [Signal] {
    signals.values().toArray().filter(func(s) { s.symbol == symbol });
  };

  public shared ({ caller }) func removeProfitBookedSignals() : async () {
    for ((id, signal) in signals.entries()) {
      switch (signal.status) {
        case (#ProfitBooked) { signals.remove(id) };
        case (_) {};
      };
    };
  };

  public shared ({ caller }) func fetchLiveOHLCV(symbol : Text, interval : Text) : async FetchResult {
    let url = "https://query1.finance.yahoo.com/v8/finance/chart/" # symbol # "?interval=" # interval # "&range=1d";
    try {
      let response = await OutCall.httpGetRequest(url, [{ name = "accept"; value = "application/json" }], transform);
      { body = response; isLive = true };
    } catch (_) { { body = ""; isLive = false } };
  };

  public shared ({ caller }) func fetchLiveQuotes() : async { body : Text; isLive : Bool } {
    let url = "https://query1.finance.yahoo.com/v8/finance/quote?symbols=%5ENSEI,%5ENSEBANK,NIFTY_IT.NS";
    try {
      let response = await OutCall.httpGetRequest(url, [{ name = "accept"; value = "application/json" }], transform);
      { body = response; isLive = true };
    } catch (_) { { body = ""; isLive = false } };
  };
};
