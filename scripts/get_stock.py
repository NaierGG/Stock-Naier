import json
import sys

import yfinance as yf


def to_number(value):
    if value is None:
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def main():
    if len(sys.argv) < 2 or not sys.argv[1].strip():
        raise ValueError("Ticker argument is required.")

    ticker = sys.argv[1].strip()
    stock = yf.Ticker(ticker)
    info = stock.info or {}
    fast_info = getattr(stock, "fast_info", {}) or {}

    price = (
        info.get("currentPrice")
        or info.get("regularMarketPrice")
        or info.get("navPrice")
        or fast_info.get("lastPrice")
        or fast_info.get("regularMarketPrice")
    )
    change = info.get("regularMarketChange") or fast_info.get("lastChange")
    change_percent = info.get("regularMarketChangePercent")

    if change_percent is None and price is not None:
        previous_close = (
            info.get("regularMarketPreviousClose")
            or fast_info.get("previousClose")
            or info.get("previousClose")
        )

        if previous_close:
            change_percent = ((price - previous_close) / previous_close) * 100

    data = {
        "ticker": ticker,
        "name": info.get("longName") or info.get("shortName") or ticker,
        "price": to_number(price),
        "change": to_number(change),
        "changePercent": to_number(change_percent),
        "high52w": to_number(info.get("fiftyTwoWeekHigh") or fast_info.get("yearHigh")),
        "low52w": to_number(info.get("fiftyTwoWeekLow") or fast_info.get("yearLow")),
        "per": to_number(info.get("trailingPE")),
        "pbr": to_number(info.get("priceToBook")),
        "dividendYield": to_number(info.get("dividendYield")),
        "marketCap": to_number(info.get("marketCap")),
        "volume": to_number(
            info.get("regularMarketVolume")
            or fast_info.get("lastVolume")
            or fast_info.get("tenDayAverageVolume")
        ),
        "currency": info.get("currency"),
        "exchange": info.get("exchange"),
    }

    print(json.dumps(data, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False))
        sys.exit(1)
