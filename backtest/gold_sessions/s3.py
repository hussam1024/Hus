from g import *
pd.set_option('display.width', 250)
def matrix(sym):
    b = bars(load(sym), '5min'); ny = b.index.tz_convert('America/New_York'); sh = ny + pd.Timedelta(hours=7)
    d = pd.DataFrame({'c': b.c.values, 'h': b.h.values, 'l': b.l.values, 'sess': sh.floor('D').tz_localize(None), 'slot': sh.hour*12 + sh.minute//5})
    d = d[pd.DatetimeIndex(d.sess).dayofweek < 5]
    C = d.pivot_table(index='sess', columns='slot', values='c', aggfunc='last').reindex(columns=range(288)).ffill(axis=1); H = d.pivot_table(index='sess', columns='slot', values='h', aggfunc='max').reindex(columns=range(288)); L = d.pivot_table(index='sess', columns='slot', values='l', aggfunc='min').reindex(columns=range(288))
    ok = C.notna().sum(axis=1) >= 280
    return C[ok], H[ok], L[ok]
def S(hh, mm=0): return ((hh - 17) % 24)*12 + mm//5          # slot index whose bar STARTS at hh:mm NY
class M:
    def __init__(s, sym):
        s.C, s.H, s.L = matrix(sym); s.prev = s.C[287].shift(1)       # previous session close (17:00 NY)
    def at(s, hh, mm=0):                                               # price at time hh:mm = close of the bar that ended then
        if hh == 'end': return s.C[287]                                # this session's close (17:00 NY)
        k = S(hh, mm) - 1
        return s.prev if k < 0 else s.C[k]
    def ret(s, a, b): return np.log(s.at(*b)/s.at(*a))*1e4
    def start(s): return s.prev
    def hi(s, a, b): return s.H.loc[:, S(*a):S(*b)-1].max(axis=1)
    def lo(s, a, b): return s.L.loc[:, S(*a):S(*b)-1].min(axis=1)
P = M('PAXGUSDT'); X = M('XAUUSDT'); COST = 1.0   # bp round trip
def ev(nm, f):
    out = []
    for m in (P, X):
        r = f(m).dropna(); r = r[r != 0]; out.append(r)
    r = out[0]; d = r[r.index < '2024-01-01']; v = r[r.index >= '2024-01-01']; x = out[1]
    st = lambda q: (q.mean(), q.mean()/(q.std()/np.sqrt(len(q))) if len(q) > 5 else np.nan, 100*(q > 0).mean(), len(q))
    a, b, c = st(d), st(v), st(x)
    print('%-58s disc %+6.2fbp t=%+5.2f g=%4.1f%% n=%4d | valid %+6.2fbp t=%+5.2f g=%4.1f%% n=%4d | XAU %+6.2fbp t=%+5.2f g=%4.1f%% n=%3d' % (nm, *a, *b, *c))
    return r
sg = np.sign
print('gross returns in bp per trade (spread ~1bp not deducted); disc = Aug2020-2023, valid = 2024-Oct2026, XAU = gold contract Dec2025-Oct2026\n')
ev('A1 long 18:00->22:00', lambda m: m.ret((18, 0), (22, 0)))
ev('A1b long 17:00->22:00 (through the daily break)', lambda m: m.ret((17, 0), (22, 0)))
def trend(m, n): c = m.C[287]; return (c.shift(1) > c.shift(1).rolling(n).mean())
for n in (10, 20, 50, 100):
    ev(f'A2 long 18->22 only if prev close > SMA{n} (daily)', lambda m, n=n: m.ret((18, 0), (22, 0)).where(trend(m, n)))
    ev(f'A2 long 18->22 only if prev close < SMA{n}', lambda m, n=n: m.ret((18, 0), (22, 0)).where(~trend(m, n) & m.C[287].shift(1+n).notna()))
ev('A3 long 18->22 after a DOWN NY session (08-17)', lambda m: m.ret((18, 0), (22, 0)).where(m.ret((8, 0), ('end', 0)).shift(1) < 0))
ev('A3 long 18->22 after an UP NY session', lambda m: m.ret((18, 0), (22, 0)).where(m.ret((8, 0), ('end', 0)).shift(1) > 0))
ev('A4 follow prev NY session direction into 18->22', lambda m: m.ret((18, 0), (22, 0))*sg(m.ret((8, 0), ('end', 0)).shift(1)))
ev('B1 London 03-04 direction -> hold 04:00->08:00', lambda m: m.ret((4, 0), (8, 0))*sg(m.ret((3, 0), (4, 0))))
ev('B2 Asia (18-03) direction -> London 03:00->08:00', lambda m: m.ret((3, 0), (8, 0))*sg(m.ret((18, 0), (3, 0))))
def brk(m, a0, a1, w0, w1, x1):
    """first 5m close outside the [a0,a1) range during [w0,w1) -> hold to x1"""
    hi = m.hi(a0, a1); lo = m.lo(a0, a1); C = m.C.loc[:, S(*w0):S(*w1)-1]; up = C.gt(hi, axis=0); dn = C.lt(lo, axis=0); out = pd.Series(np.nan, index=m.C.index); ex = m.at(*x1)
    for day in m.C.index:
        u = up.loc[day].values; d = dn.loc[day].values; iu = np.argmax(u) if u.any() else 10**6; idn = np.argmax(d) if d.any() else 10**6
        if min(iu, idn) < 10**6:
            k = min(iu, idn); side = 1 if iu < idn else -1; out[day] = side*np.log(ex[day]/C.loc[day].values[k])*1e4
    return out
ev('B3 breakout of Asia range (18-03) in London -> 08:00', lambda m: brk(m, (18, 0), (3, 0), (3, 0), (8, 0), (8, 0)))
ev('B4 breakout of Asia range in London -> 12:00', lambda m: brk(m, (18, 0), (3, 0), (3, 0), (8, 0), (12, 0)))
ev('B5 breakout of Asia+London range (18-08) in NY -> 12:00', lambda m: brk(m, (18, 0), (8, 0), (8, 0), (12, 0), (12, 0)))
ev('B6 breakout of Asia+London range in NY -> 17:00', lambda m: brk(m, (18, 0), (8, 0), (8, 0), (15, 0), ('end', 0)))
ev('C1 London (03-08) direction -> NY 08:00->12:00', lambda m: m.ret((8, 0), (12, 0))*sg(m.ret((3, 0), (8, 0))))
ev('C2 NY first hour (08-09) direction -> 09:00->12:00', lambda m: m.ret((9, 0), (12, 0))*sg(m.ret((8, 0), (9, 0))))
ev('C3 08:30-09:00 direction -> 09:00->11:00', lambda m: m.ret((9, 0), (11, 0))*sg(m.ret((8, 30), (9, 0))))
ev('C4 day so far (17:00->12:00) direction -> 15:00->17:00', lambda m: m.ret((15, 0), ('end', 0))*sg(m.ret((17, 0), (12, 0))))
ev('C5 NY morning (08-12) direction -> 12:00->17:00', lambda m: m.ret((12, 0), ('end', 0))*sg(m.ret((8, 0), (12, 0))))
ev('C6 short 09:00->13:00 (NY morning drift)', lambda m: -m.ret((9, 0), (13, 0)))
ev('D1 prev session direction -> whole next session', lambda m: m.ret((17, 0), (16, 55))*sg(np.log(m.C[287]/m.C[287].shift(1)).shift(1)))
ev('D2 overnight (17-08) direction -> NY 08:00->17:00', lambda m: m.ret((8, 0), ('end', 0))*sg(m.ret((17, 0), (8, 0))))
def pdh(m, x1):
    ph = m.H.max(axis=1).shift(1); pl = m.L.min(axis=1).shift(1); C = m.C.loc[:, S(18, 0):S(15, 0)]; up = C.gt(ph, axis=0); dn = C.lt(pl, axis=0); out = pd.Series(np.nan, index=m.C.index); ex = m.at(*x1)
    for day in m.C.index:
        u = up.loc[day].values; d = dn.loc[day].values; iu = np.argmax(u) if u.any() else 10**6; idn = np.argmax(d) if d.any() else 10**6
        if min(iu, idn) < 10**6: k = min(iu, idn); side = 1 if iu < idn else -1; out[day] = side*np.log(ex[day]/C.loc[day].values[k])*1e4
    return out
ev('E1 first close beyond previous day high/low -> 17:00', lambda m: pdh(m, ('end', 0)))
ev('E2 fade it (opposite side) -> 17:00', lambda m: -pdh(m, ('end', 0)))
big = lambda m: (np.log(m.C[287]/m.C[287].shift(1)).abs() > 1.5*np.log(m.C[287]/m.C[287].shift(1)).abs().rolling(20).mean().shift(1))
ev('F1 after a big day: continue next session', lambda m: (m.ret((17, 0), (16, 55))*sg(np.log(m.C[287]/m.C[287].shift(1)).shift(1))).where(big(m).shift(1)))
ev('F2 after 3 same-direction days: continue', lambda m: (m.ret((17, 0), (16, 55))*sg(np.log(m.C[287]/m.C[287].shift(1)).shift(1))).where(np.sign(np.log(m.C[287]/m.C[287].shift(1))).rolling(3).sum().abs().shift(1) == 3))
