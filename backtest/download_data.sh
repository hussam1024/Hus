#!/bin/bash
# download monthly 1m klines for several symbols from Binance public data
for sym in BTCUSDT ETHUSDT PAXGUSDT EURUSDT SOLUSDT; do
  for ym in 2025-11 2025-12 2026-01 2026-02 2026-03 2026-04 2026-05 2026-06 2026-07 2026-08 2026-09 2026-10; do
    f="${sym}-1m-${ym}.zip"
    [ -s "$f" ] && continue
    for try in 1 2 3; do
      code=$(curl -sS -m 120 -o "$f" -w "%{http_code}" "https://data.binance.vision/data/spot/monthly/klines/${sym}/1m/${f}")
      [ "$code" = "200" ] && break
      rm -f "$f"; sleep 2
    done
    echo "$f $code"
  done
done
