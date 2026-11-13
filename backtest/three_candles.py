import pandas as pd, numpy as np, glob, zipfile, warnings
warnings.filterwarnings('ignore')
def load(sym):
    fr = []
    for f in sorted(glob.glob(f'{sym}-1m-*.zip')):
        with zipfile.ZipFile(f) as z: df = pd.read_csv(z.open(z.namelist()[0]), header=None, usecols=[0, 1, 2, 3, 4, 5], dtype=str)
        df = df[df[0].str.isnumeric()].astype(float); df.columns = ['t', 'o', 'h', 'l', 'c', 'v']
        t = df.t.astype('int64').values; t = np.where(t > 10**14, t // 1000, t); df['t'] = pd.to_datetime(t, unit='ms', utc=True); fr.append(df)
    df = pd.concat(fr).drop_duplicates('t').set_index('t').sort_index()
    return df.resample('5min', label='left', closed='left').agg({'o': 'first', 'h': 'max', 'l': 'min', 'c': 'last', 'v': 'sum'}).dropna(subset=['o'])

def table(b, tz):
    """one row per (day, slot): colour of candle 1 and of the two candles after it"""
    loc = b.index.tz_convert(tz)
    col = np.sign(b.c.values - b.o.values)
    d = pd.DataFrame({'c1': col, 'c2': np.roll(col, -1), 'c3': np.roll(col, -2), 'slot': loc.hour*60 + loc.minute, 'dow': loc.dayofweek, 'date': loc.date,
                      'ret': np.roll(b.c.values, -2)/b.c.values - 1, 'year': loc.year, 'gap': np.roll(b.index.asi8, -2) - b.index.asi8}, index=b.index).iloc[:-2]
    d = d[(d.dow < 5) & (d.gap == d.gap.mode()[0]) & (d.c1 != 0)]
    d['both'] = (d.c2 == d.c1) & (d.c3 == d.c1); d['s2'] = d.c2 == d.c1; d['s3'] = d.c3 == d.c1; d['fwd'] = np.sign(d.ret) == d.c1; d['dret'] = d.ret*d.c1*100
    return d
def per_slot(d):
    g = d.groupby('slot'); r = g.agg(n=('both', 'size'), both=('both', 'mean'), s2=('s2', 'mean'), s3=('s3', 'mean'), fwd=('fwd', 'mean'), dret=('dret', 'mean'))
    r.index = ['%02d:%02d' % (s//60, s % 60) for s in r.index]; return r
pd.set_option('display.width', 220)
P = load('PAXGUSDT'); X = load('XAUUSDT')
print('PAXG 5m bars', len(P), P.index[0], '->', P.index[-1], '| doji share %.1f%%' % (100*(P.c == P.o).mean()))
print('XAUUSDT 5m bars', len(X), X.index[0], '->', X.index[-1], '| doji share %.1f%%' % (100*(X.c == X.o).mean()))
for tz in ('UTC', 'America/New_York', 'Europe/London'):
    d = table(P, tz); allr = per_slot(d); a = per_slot(d[d.year == 2025]); b = per_slot(d[d.year == 2026]); x = per_slot(table(X, tz))
    base = d.both.mean()
    print(f'\n===== time zone {tz} | gold (PAXG) weekdays | overall share of days where candles 2 and 3 both copy candle 1: {100*base:.1f}% | candle 2 copies candle 1: {100*d.s2.mean():.1f}%')
    T = pd.DataFrame({'n_2025': a.n, 'both_2025': a.both*100, 'n_2026': b.n, 'both_2026': b.both*100, 'both_all': allr.both*100, 'XAUUSDT_n': x.n, 'XAUUSDT_both': x.both*100, 'c2_same_all': allr.s2*100, 'close3_in_dir_all': allr.fwd*100})
    print('top 10 start times by the full two years:'); print(T.sort_values('both_all', ascending=False).head(10).round(1).to_string())
    top25 = a.both.sort_values(ascending=False).head(10).index
    print('top 10 start times chosen on 2025 only, and what they did in 2026:'); print(T.loc[top25, ['n_2025', 'both_2025', 'n_2026', 'both_2026', 'XAUUSDT_both']].round(1).to_string())
    print('max over all 288 start times: all=%.1f%%  2025=%.1f%%  2026=%.1f%%  XAUUSDT=%.1f%% | correlation of 2025 vs 2026 slot scores: %.2f' % (allr.both.max()*100, a.both.max()*100, b.both.max()*100, x.both.max()*100, np.corrcoef(a.both.reindex(b.index).fillna(base), b.both)[0, 1]))
# chance benchmark: shuffle the day order of colours inside each slot independently -> what would the best slot look like with no real pattern?
d = table(P, 'UTC'); rng = np.random.default_rng(1); mx = []
piv = {k: d.pivot_table(index='date', columns='slot', values=k, aggfunc='first') for k in ('c1', 'c2', 'c3')}
for _ in range(200):
    c1 = piv['c1'].values; c2 = piv['c2'].values.copy(); c3 = piv['c3'].values.copy()
    for j in range(c2.shape[1]): p = rng.permutation(c2.shape[0]); c2[:, j] = c2[p, j]; p = rng.permutation(c3.shape[0]); c3[:, j] = c3[p, j]
    ok = ~np.isnan(c1) & ~np.isnan(c2) & ~np.isnan(c3); both = ((c2 == c1) & (c3 == c1) & ok).sum(0)/ok.sum(0); mx.append(both.max())
print('\nchance benchmark (candles 2,3 shuffled across days, 200 runs): best slot would show %.1f%% on average, 95%% of runs below %.1f%%' % (100*np.mean(mx), 100*np.quantile(mx, .95)))
