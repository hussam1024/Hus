import numpy as np, pandas as pd
from load import load, resample
from lib import *

def htf_bias(m1, rule, idx, fast=20, slow=50):
    """Pine: security(tf, bias[1], lookahead_on) -> value of the HTF bar before the one containing the chart bar"""
    h = resample(m1, rule); c = h.c.values
    ef = ema(c, fast); es = ema(c, slow)
    b = np.where((ef > es) & (c > es), 1, np.where((ef < es) & (c < es), -1, 0)).astype(float)
    s = pd.Series(b, index=h.index).shift(1)
    extra = {'slope': pd.Series((es - shift(es, 3))/atr(h.h.values, h.l.values, c, 14), index=h.index).shift(1),
             'dist': pd.Series((c - es)/atr(h.h.values, h.l.values, c, 14), index=h.index).shift(1),
             'rsi': pd.Series(rsi(c, 14), index=h.index).shift(1)}
    key = idx.floor(rule)
    return s.reindex(key).values, {k: v.reindex(key).values for k, v in extra.items()}

def build(sym, rule='5min', m1=None):
    m1 = load(sym) if m1 is None else m1
    df = resample(m1, rule)
    o, h, l, c, v = [df[k].values.astype(float) for k in 'ohlcv']
    n = len(df); F = pd.DataFrame(index=df.index)
    a = atr(h, l, c, 14); F['atr'] = a; F['close'] = c
    for k, (r1) in {'h1': '60min', 'h4': '240min', 'd1': '1D', 'm15': '15min'}.items():
        b, ex = htf_bias(m1, r1, df.index)
        F[k] = b; F[k+'_slope'] = ex['slope']; F[k+'_dist'] = ex['dist']; F[k+'_rsi'] = ex['rsi']
    e9, e21, e50, e200 = ema(c, 9), ema(c, 21), ema(c, 50), ema(c, 200)
    F['d9'] = (c-e9)/a; F['d21'] = (c-e21)/a; F['d50'] = (c-e50)/a; F['d200'] = (c-e200)/a
    F['e21_50'] = (e21-e50)/a; F['e50_200'] = (e50-e200)/a; F['slope50'] = (e50-shift(e50, 5))/a; F['slope200'] = (e200-shift(e200, 20))/a
    r = rsi(c, 14); F['rsi'] = r; F['rsi2'] = rsi(c, 2); F['rsi_chg'] = r - shift(r, 1); F['rsi_chg3'] = r - shift(r, 3)
    macd = ema(c, 12)-ema(c, 26); hist = macd-ema(macd, 9); F['hist'] = hist/a; F['hist_chg'] = (hist-shift(hist, 1))/a
    k_ = sma(stoch(r, 14), 3); d_ = sma(k_, 3); F['stK'] = k_; F['stKD'] = k_-d_
    dip, dim, adx = dmi(h, l, c, 14); F['adx'] = adx; F['di'] = dip-dim; F['adx_chg'] = adx-shift(adx, 3)
    for L in (10, 20, 50):
        F[f'er{L}'] = np.abs(c-shift(c, L))/rsum(np.abs(np.diff(c, prepend=np.nan)), L)
    ab = sma(a, 100); F['volreg'] = a/ab; F['atr_pct'] = a/c*100
    a50 = atr(h, l, c, 50); a200 = atr(h, l, c, 200); F['atr50_200'] = a50/a200
    rng = h-l; rs = np.where(rng == 0, np.nan, rng)
    F['body'] = (c-o)/a; F['rng'] = rng/a; F['cloc'] = (c-l)/rs; F['upw'] = (h-np.maximum(o, c))/rs; F['dnw'] = (np.minimum(o, c)-l)/rs
    vm = sma(v, 20); F['relvol'] = v/np.where(vm == 0, np.nan, vm); delta = np.where(rng > 0, v*(2*c-h-l)/rs, 0.0); F['delta'] = ema(delta, 10)/np.where(vm == 0, np.nan, vm)
    F['relvol5'] = sma(v, 5)/np.where(vm == 0, np.nan, vm)
    for L in (1, 3, 6, 12, 24, 48, 96, 288):
        F[f'ret{L}'] = (c-shift(c, L))/a
    for L in (20, 50, 100, 288):
        hh = rmax(h, L); ll = rmin(l, L); F[f'pos{L}'] = (c-ll)/np.where(hh-ll == 0, np.nan, hh-ll); F[f'dhi{L}'] = (hh-c)/a; F[f'dlo{L}'] = (c-ll)/a
        F[f'brk_hi{L}'] = (c > shift(hh, 1)).astype(float); F[f'brk_lo{L}'] = (c < shift(ll, 1)).astype(float)
    # daily vwap
    day = df.index.floor('1D'); tp = (h+l+c)/3; cv = pd.Series(v).groupby(day.values).cumsum().values; cpv = pd.Series(tp*v).groupby(day.values).cumsum().values
    cpv2 = pd.Series(tp*tp*v).groupby(day.values).cumsum().values
    vw = cpv/np.where(cv == 0, np.nan, cv); sd = np.sqrt(np.maximum(cpv2/np.where(cv == 0, np.nan, cv)-vw*vw, 0))
    F['dvwap'] = (c-vw)/a; F['zvwap'] = (c-vw)/np.where(sd == 0, np.nan, sd)
    # bollinger z, keltner
    m20 = sma(c, 20); s20 = pd.Series(c).rolling(20).std(ddof=0).values; F['bbz'] = (c-m20)/np.where(s20 == 0, np.nan, s20); F['bbw'] = 4*s20/a
    stl, std_ = supertrend(h, l, c, atr(h, l, c, 10), 3.0); F['st'] = -std_
    # consecutive candles
    up = (c > o).astype(int); dn = (c < o).astype(int)
    def streak(x):
        s = pd.Series(x); g = (s != s.shift()).cumsum(); return (s.groupby(g).cumcount()+1).values*x
    F['upstreak'] = streak(up); F['dnstreak'] = streak(dn)
    F['hour'] = df.index.hour.values; F['dow'] = df.index.dayofweek.values
    F['o'] = o; F['h'] = h; F['l'] = l; F['v'] = v
    return F, df, m1

def labels(F, df, m1, rule, k_up, k_dn=None, horizon=24*60):
    k_dn = k_up if k_dn is None else k_dn
    tclose = (df.index + pd.Timedelta(rule)).as_unit('ns').asi8
    a = F['atr'].values
    return barrier_labels(tclose, df.c.values.astype(float), k_up*a, k_dn*a, m1.index.as_unit('ns').asi8, m1.h.values.astype(float), m1.l.values.astype(float), m1.c.values.astype(float), horizon)
