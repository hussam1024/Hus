from g import *
pd.set_option('display.width', 250)
def hourly(sym):
    h = bars(load(sym), '60min'); ny = h.index.tz_convert('America/New_York')
    d = pd.DataFrame({'r': np.log(h.c/h.c.shift(1))*1e4, 'hour': ny.hour, 'dow': ny.dayofweek, 'year': ny.year}, index=h.index).dropna()
    # trading day key: session that starts 17:00 NY belongs to the next calendar day (like the gold market)
    d['sess'] = (ny + pd.Timedelta(hours=7)).floor('D').tz_localize(None)[1:] if len(ny) == len(d)+1 else (d.index.tz_convert('America/New_York') + pd.Timedelta(hours=7)).floor('D').tz_localize(None)
    d['sdow'] = pd.DatetimeIndex(d.sess).dayofweek
    return d[d.sdow < 5]          # sessions Mon..Fri (Sunday 17:00 NY belongs to Monday); Sat/Sun sessions dropped
P = hourly('PAXGUSDT'); X = hourly('XAUUSDT')
def window(d, a, b):
    """sum of hourly returns for NY hours in [a, b) of one gold session (17:00 -> 17:00)"""
    hrs = [(a + k) % 24 for k in range((b - a) % 24 or 24)]
    return d[d.hour.isin(hrs)].groupby('sess').r.sum()
def line(nm, s):
    y = s.groupby(pd.DatetimeIndex(s.index).year).mean(); t = s.mean()/(s.std()/np.sqrt(len(s)))
    return '%-24s n=%4d mean %+6.2f bp t=%+5.2f green %4.1f%% | %s' % (nm, len(s), s.mean(), t, 100*(s > 0).mean(), ' '.join('%d:%+5.1f' % (k, v) for k, v in y.items()))
print('=== hourly mean bp by NY hour, per year (PAXG, sessions Mon-Fri), then XAUUSDT Dec25-Oct26')
T = P.pivot_table(index='hour', columns='year', values='r', aggfunc='mean'); T['ALL'] = P.groupby('hour').r.mean(); T['t'] = P.groupby('hour').r.apply(lambda v: v.mean()/(v.std()/np.sqrt(len(v)))); T['XAU'] = X.groupby('hour').r.mean()
print(T.reindex([17, 18, 19, 20, 21, 22, 23] + list(range(0, 17))).round(2).to_string())
print('\n=== session windows (NY time), PAXG 2020-2026')
for a, b in ((17, 22), (18, 22), (17, 0), (18, 0), (17, 3), (18, 3), (3, 8), (8, 12), (9, 13), (8, 17), (22, 8), (12, 17)):
    print(line('%02d:00 -> %02d:00' % (a, b), window(P, a, b)), '| XAU: mean %+.2f green %.0f%%' % (window(X, a, b).mean(), 100*(window(X, a, b) > 0).mean()))
print('\n=== by weekday of the session, window 18:00->22:00 and 17:00->22:00 (PAXG)')
for a, b in ((18, 22), (17, 22), (8, 12)):
    s = window(P, a, b); print('%02d->%02d' % (a, b), ' '.join('%s %+.1f(%.0f%%)' % (['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][k], v.mean(), 100*(v > 0).mean()) for k, v in s.groupby(pd.DatetimeIndex(s.index).dayofweek)))
# weekend: Friday 17:00 NY -> Sunday 18:00 NY, and does it give back on Sunday evening?
h = bars(load('PAXGUSDT'), '60min'); ny = h.index.tz_convert('America/New_York'); c = pd.Series(h.c.values, index=ny)
fri = c[(c.index.dayofweek == 4) & (c.index.hour == 16)]; rows = []
for t, v in fri.items():
    try: rows.append((t.date(), np.log(c[t + pd.Timedelta(hours=49)]/v)*1e4, np.log(c[t + pd.Timedelta(hours=53)]/c[t + pd.Timedelta(hours=49)])*1e4, np.log(c[t + pd.Timedelta(hours=73)]/c[t + pd.Timedelta(hours=49)])*1e4))
    except KeyError: pass
W = pd.DataFrame(rows, columns=['d', 'weekend', 'sun18_22', 'next24h']).set_index('d'); W.index = pd.to_datetime(W.index)
print('\n=== weekend gap (Fri 17:00 NY -> Sun 18:00 NY), PAXG'); print(line('weekend', W.weekend)); print(line('then Sun 18->22', W.sun18_22)); print(line('then next 24h', W.next24h)); print('corr(weekend move, next 24h) = %.2f' % np.corrcoef(W.weekend, W.next24h)[0, 1])
