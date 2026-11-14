from g import *
from numba import njit
pd.set_option('display.width', 250)
@njit(cache=True)
def walk(t, h, l, c, i0, i1, side, entry, sl, tp):
    """walk 1m bars i0..i1-1; exit at stop/target (stop first inside one bar) or at the close of bar i1-1. returns exit price, reason (0 time,1 sl,2 tp)"""
    for i in range(i0, i1):
        if side == 1:
            if l[i] <= sl: return sl, 1
            if h[i] >= tp: return tp, 2
        else:
            if h[i] >= sl: return sl, 1
            if l[i] <= tp: return tp, 2
    return c[i1-1], 0
def prep(sym):
    m = load(sym); ny = m.index.tz_convert('America/New_York')
    return m, ny, m.index.as_unit('ns').asi8, m.h.values, m.l.values, m.c.values
def trades(sym, kind, sl_k=None, tp_k=None, hold_end=None, cost=1.0, swap=0.0, start='2020-09-01', closes=True, sunday=False, w0=8.0, w1=9.0, entry_h=None):
    m, ny, t, h, l, c = prep(sym)
    if closes: h = c; l = c          # stop/target judged on 1m closes (PAXG prints thin-market wicks)
    days = pd.date_range(start, m.index[-1].tz_convert('America/New_York').date(), freq='D'); rows = []
    pos = pd.Series(np.arange(len(m)), index=ny)
    daily = m.c.resample('1D').last().pct_change().abs().rolling(20).mean().shift(1)*1e4      # usual daily move in bp (vol unit)
    def idx(ts):
        k = pos.index.searchsorted(ts); return k if k < len(pos) else None
    for d in days:
        if kind == 'asia':                      # buy at 17:00 NY Sun..Thu (session Mon..Fri), exit 22:00
            if d.dayofweek not in ((6, 0, 1, 2, 3) if sunday else (0, 1, 2, 3)): continue
            b = pd.Timestamp(d.date(), tz='America/New_York'); t0 = b + pd.Timedelta(hours=entry_h or 17); t1 = b + pd.Timedelta(hours=hold_end or 22); side = 1
        else:                                   # fade the 08:00-09:00 NY move at 09:00, exit 12:00, Mon..Fri
            if d.dayofweek > 4: continue
            b = pd.Timestamp(d.date(), tz='America/New_York'); a0 = idx(b + pd.Timedelta(hours=w0)); a1 = idx(b + pd.Timedelta(hours=w1))
            if a0 is None or a1 is None or a1 - a0 < 25: continue
            mv = c[a1-1]/c[a0-1] - 1
            if mv == 0: continue
            side = -1 if mv > 0 else 1; t0 = b + pd.Timedelta(hours=entry_h or w1); t1 = b + pd.Timedelta(hours=hold_end or 12)
        i0 = idx(t0); i1 = idx(t1)
        if i0 is None or i1 is None or i1 - i0 < 30 or i0 == 0: continue
        entry = c[i0-1]; u = daily.asof(m.index[i0])
        if np.isnan(u): continue
        dist = entry*u/1e4
        sl = entry - side*sl_k*dist if sl_k else (-1e18 if side == 1 else 1e18); tp = entry + side*tp_k*dist if tp_k else (1e18 if side == 1 else -1e18)
        px, why = walk(t, h, l, c, i0, i1, side, entry, sl, tp)
        rows.append((t0.tz_convert(None), side, side*(px/entry-1)*1e4 - cost - swap, why, u))
    return pd.DataFrame(rows, columns=['t', 'side', 'bp', 'why', 'u']).set_index('t')
def rep(nm, T):
    mo = T.bp.groupby(T.index.to_period('M')).sum(); yr = T.bp.groupby(T.index.year).sum(); eq = T.bp.cumsum()
    print('%-44s n=%4d win=%4.1f%% avg %+5.2fbp total %+6.0fbp | green months %2d/%2d (%.0f%%) worst month %+5.0fbp | maxDD %4.0fbp | stops %4.1f%% targets %4.1f%% | yearly: %s' % (
        nm, len(T), 100*(T.bp > 0).mean(), T.bp.mean(), T.bp.sum(), (mo > 0).sum(), len(mo), 100*(mo > 0).mean(), mo.min(), (eq.cummax()-eq).max(), 100*(T.why == 1).mean(), 100*(T.why == 2).mean(), ' '.join('%d:%+.0f' % (k, v) for k, v in yr.items())))
if __name__ == '__main__':
    print('net of costs: spread 1bp per trade; Asia trade through 17:00 NY also pays 2bp swap. stops/targets judged on 1m closes. PAXG Sep2020-Oct2026\n')
    rep('ASIA long Mon-Thu 17:00->22:00, no stop', trades('PAXGUSDT', 'asia', swap=2.0))
    rep('ASIA long Mon-Thu 18:00->22:00 (no swap)', trades('PAXGUSDT', 'asia', entry_h=18))
    rep('ASIA 17->22 stop 1.0 / target 1.0', trades('PAXGUSDT', 'asia', sl_k=1.0, tp_k=1.0, swap=2.0))
    rep('ASIA 17->22 stop 0.5 / target 0.5', trades('PAXGUSDT', 'asia', sl_k=0.5, tp_k=0.5, swap=2.0))
    print()
    for hold in (11, 12, 13, 15): rep('NY FADE 09:00->%d:00, no stop' % hold, trades('PAXGUSDT', 'fade', hold_end=hold))
    rep('NY FADE (08:30-09:00 move) 09:00->12:00', trades('PAXGUSDT', 'fade', w0=8.5, w1=9.0))
    for sk, tk in ((1.0, None), (1.0, 1.0), (0.75, 0.75), (0.5, 0.5), (0.5, 1.0), (1.0, 0.5)):
        rep('NY FADE ->12:00 stop %s / target %s' % (sk, tk), trades('PAXGUSDT', 'fade', sl_k=sk, tp_k=tk))
    rep('NY FADE ->15:00 stop 1.0 / target 1.0', trades('PAXGUSDT', 'fade', sl_k=1.0, tp_k=1.0, hold_end=15))
    rep('NY FADE ->15:00 stop 0.5 / target 0.5', trades('PAXGUSDT', 'fade', sl_k=0.5, tp_k=0.5, hold_end=15))
    print('\nsame on the gold contract XAUUSDT (real highs/lows used for stops), Jan-Oct 2026:')
    for nm, kw in (('ASIA 17->22 no stop', dict(kind='asia', swap=2.0)), ('ASIA 18->22 no stop', dict(kind='asia', entry_h=18)), ('NY FADE ->12 no stop', dict(kind='fade')), ('NY FADE ->15 no stop', dict(kind='fade', hold_end=15)), ('NY FADE ->12 stop1/target1', dict(kind='fade', sl_k=1.0, tp_k=1.0)), ('NY FADE ->12 stop.5/target.5', dict(kind='fade', sl_k=0.5, tp_k=0.5)), ('NY FADE ->15 stop.5/target.5', dict(kind='fade', sl_k=0.5, tp_k=0.5, hold_end=15))):
        rep(nm, trades('XAUUSDT', start='2026-01-15', closes=False, **kw))
