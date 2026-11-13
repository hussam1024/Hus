import numpy as np, pandas as pd
from numba import njit

@njit(cache=True)
def ema(x, n):
    out = np.empty(len(x)); a = 2.0/(n+1); s = np.nan
    for i in range(len(x)):
        v = x[i]
        if np.isnan(v): out[i] = s; continue
        s = v if np.isnan(s) else a*v + (1-a)*s
        out[i] = s
    return out

@njit(cache=True)
def rma(x, n):
    out = np.full(len(x), np.nan); a = 1.0/n; s = np.nan; acc = 0.0; cnt = 0
    for i in range(len(x)):
        v = x[i]
        if np.isnan(v): continue
        if np.isnan(s):
            acc += v; cnt += 1
            if cnt == n: s = acc/n; out[i] = s
        else:
            s = a*v + (1-a)*s; out[i] = s
    return out

def sma(x, n): return pd.Series(x).rolling(n).mean().values
def rmax(x, n): return pd.Series(x).rolling(n).max().values
def rmin(x, n): return pd.Series(x).rolling(n).min().values
def rsum(x, n): return pd.Series(x).rolling(n).sum().values
def shift(x, k):
    out = np.full(len(x), np.nan); 
    if k < len(x): out[k:] = x[:len(x)-k]
    return out

def true_range(h, l, c):
    pc = shift(c, 1)
    tr = np.maximum(h-l, np.maximum(np.abs(h-pc), np.abs(l-pc)))
    tr[0] = h[0]-l[0]
    return tr
def atr(h, l, c, n=14): return rma(true_range(h, l, c), n)
def rsi(c, n=14):
    d = np.diff(c, prepend=np.nan)
    up = rma(np.where(np.isnan(d), np.nan, np.maximum(d, 0)), n); dn = rma(np.where(np.isnan(d), np.nan, np.maximum(-d, 0)), n)
    return np.where(dn == 0, 100.0, 100 - 100/(1 + up/np.where(dn == 0, np.nan, dn)))
def dmi(h, l, c, n=14):
    up = np.diff(h, prepend=np.nan); dn = -np.diff(l, prepend=np.nan)
    pdm = np.where((up > dn) & (up > 0), up, 0.0); mdm = np.where((dn > up) & (dn > 0), dn, 0.0)
    pdm[0] = np.nan; mdm[0] = np.nan
    trr = rma(true_range(h, l, c), n)
    dip = 100*rma(pdm, n)/trr; dim = 100*rma(mdm, n)/trr
    s = dip+dim; dx = 100*np.abs(dip-dim)/np.where(s == 0, 1, s)
    return dip, dim, rma(dx, n)
def stoch(x, n): 
    lo = rmin(x, n); hi = rmax(x, n); return 100*(x-lo)/np.where(hi-lo == 0, np.nan, hi-lo)

@njit(cache=True)
def supertrend(h, l, c, atrv, mult):
    n = len(c); d = np.ones(n); line = np.full(n, np.nan); ub = np.nan; lb = np.nan
    for i in range(n):
        if np.isnan(atrv[i]): continue
        m = (h[i]+l[i])/2; u = m + mult*atrv[i]; lo = m - mult*atrv[i]
        if np.isnan(ub): ub = u; lb = lo; d[i] = 1; line[i] = ub; continue
        lb = lo if (lo > lb or c[i-1] < lb) else lb
        ub = u if (u < ub or c[i-1] > ub) else ub
        pd_ = d[i-1]
        if pd_ == 1:   # 1 = downtrend (pine: dir>0 down)
            d[i] = -1 if c[i] > ub else 1
        else:
            d[i] = 1 if c[i] < lb else -1
        line[i] = lb if d[i] == -1 else ub
    return line, d

@njit(cache=True)
def barrier_labels(tclose, entry, dist_up, dist_dn, m_t, m_h, m_l, m_c, horizon):
    """first-touch label using 1m bars. tclose: ns close time of each signal bar. returns y(+1 up first,-1 down first,0 none), bars-to-hit(min), both-hit flag"""
    n = len(tclose); y = np.zeros(n, np.int8); dur = np.zeros(n, np.int32); amb = np.zeros(n, np.int8); j = 0; M = len(m_t)
    for i in range(n):
        if np.isnan(dist_up[i]) or np.isnan(dist_dn[i]): continue
        while j < M and m_t[j] < tclose[i]: j += 1
        up = entry[i] + dist_up[i]; dn = entry[i] - dist_dn[i]
        k = j; end = min(M, j + horizon)
        while k < end:
            hu = m_h[k] >= up; hd = m_l[k] <= dn
            if hu and hd: amb[i] = 1; y[i] = 0; dur[i] = k-j+1; break
            if hu: y[i] = 1; dur[i] = k-j+1; break
            if hd: y[i] = -1; dur[i] = k-j+1; break
            k += 1
    return y, dur, amb
