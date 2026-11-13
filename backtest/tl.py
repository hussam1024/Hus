import numpy as np, pandas as pd, sys, warnings
from numba import njit
from load import load, resample
from lib import *
warnings.filterwarnings('ignore')
COST = {'BTCUSDT': 0.03, 'ETHUSDT': 0.04, 'SOLUSDT': 0.06, 'PAXGUSDT': 0.01}   # round-trip spread, % of price

@njit(cache=True)
def trend_lock(h, l, c, tlatr, src, e50, donhi, donlo, mult, conf, hold):
    n = len(c); d = np.zeros(n, np.int8); line = np.full(n, np.nan); cur = 0; ln = np.nan; cnt = 0; brk = False; fb = 0
    for i in range(n):
        if np.isnan(tlatr[i]) or np.isnan(donhi[i]) or np.isnan(e50[i]):
            continue
        up = src[i] + mult*tlatr[i]; dn = src[i] - mult*tlatr[i]
        if cur == 0:
            cur = 1 if c[i] >= e50[i] else -1; ln = dn if cur == 1 else up; fb = i
        elif cur == 1:
            ln = max(ln, dn)
            if c[i] < ln:
                cnt += 1
                if c[i] < donlo[i]: brk = True
            else: cnt = 0; brk = False
            if cnt >= conf and brk and i - fb >= hold:
                cur = -1; ln = up; fb = i; cnt = 0; brk = False
        else:
            ln = min(ln, up)
            if c[i] > ln:
                cnt += 1
                if c[i] > donhi[i]: brk = True
            else: cnt = 0; brk = False
            if cnt >= conf and brk and i - fb >= hold:
                cur = 1; ln = dn; fb = i; cnt = 0; brk = False
        d[i] = cur; line[i] = ln
    return d, line

def run(df, mult, strl, conf, hold):
    h, l, c = df.h.values.astype(float), df.l.values.astype(float), df.c.values.astype(float)
    a50 = atr(h, l, c, 50); a200 = atr(h, l, c, 200); tla = np.maximum(a50, np.nan_to_num(a200)*0.85)
    src = ema((h+l)/2, 5); e50 = ema(c, 50)
    d, line = trend_lock(h, l, c, tla, src, e50, shift(rmax(h, strl), 1), shift(rmin(l, strl), 1), mult, conf, hold)
    return d

def legs(df, d, cost):
    c = df.c.values; idx = np.where(np.diff(d.astype(int)) != 0)[0] + 1; idx = idx[d[idx-1] != 0]
    out = []
    for a, b in zip(idx[:-1], idx[1:]):
        out.append((df.index[a], d[a], d[a]*(c[b]/c[a]-1)*100 - cost, b-a))
    return pd.DataFrame(out, columns=['t', 'dir', 'ret', 'bars']).set_index('t')

if __name__ == '__main__':
    split = pd.Timestamp('2026-07-01', tz='UTC')
    P = {'Fast': (2.5, 10, 1, 3), 'Balanced': (3.5, 20, 2, 8), 'Slow': (4.5, 30, 2, 12), 'VerySlow': (6.0, 50, 3, 20)}
    M = {s: load(s) for s in COST}
    for rule in ('5min', '15min', '60min', '240min'):
        for nm, p in P.items():
            row = []
            for s in COST:
                df = resample(M[s], rule); L = legs(df, run(df, *p), COST[s])
                a = L[L.index < split]; b = L[L.index >= split]
                row.append('%s n=%d win=%2.0f%% IS=%+6.1f%% OOS=%+6.1f%% gross=%+6.1f%%' % (s[:4], len(L), 100*(L.ret > 0).mean(), a.ret.sum(), b.ret.sum(), L.ret.sum()+COST[s]*len(L)))
            print(rule, nm.ljust(8), ' | '.join(row))
