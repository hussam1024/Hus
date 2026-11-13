import pandas as pd, numpy as np, warnings
warnings.filterwarnings('ignore')
import importlib.util, sys, io, contextlib
src = open('three_candles.py').read().split("pd.set_option('display.width', 220)")[0]; exec(src)
P = load('PAXGUSDT'); X = load('XAUUSDT'); pd.set_option('display.width', 200)
def body_rank(b):
    body = (b.c-b.o).abs(); return body/body.rolling(288*5).median()
for nm, B in (('PAXG 2025-2026', P), ('XAUUSDT Dec2025-Oct2026', X)):
    d = table(B, 'America/New_York'); d['big'] = body_rank(B).reindex(d.index); half = d.index < d.index[len(d)//2]
    print(f'\n##### {nm} (New York time, weekdays)')
    # 1) candle 2 alone copying candle 1
    a = per_slot(d[half]).s2; b = per_slot(d[~half]).s2; top = a.sort_values(ascending=False).head(5)
    print('candle 2 copies candle 1 — best 5 times in the first half -> same times in the second half:', ', '.join('%s %.0f%%->%.0f%%' % (k, 100*v, 100*b.get(k, np.nan)) for k, v in top.items()))
    # 2) strong first candle
    for thr in (2, 3, 5):
        s = d[d.big >= thr]; print('first candle body >= %dx the usual: n=%d, candles 2&3 both copy it %.1f%%, candle 2 copies %.1f%%, close of candle 3 beyond close of candle 1 in its direction %.1f%%' % (thr, len(s), 100*s.both.mean(), 100*s.s2.mean(), 100*s.fwd.mean()))
    s = d[d.big >= 3]; g = s.groupby('slot').both.agg(['size', 'mean']); g = g[g['size'] >= 25].sort_values('mean', ascending=False).head(3)
    print('   with a strong first candle, best times (>=25 cases):', ', '.join('%02d:%02d %.0f%% (n=%d)' % (k//60, k % 60, 100*r['mean'], r['size']) for k, r in g.iterrows()))
    # 3) any run length: after two same-colour candles, does the third copy?
    s = d[d.c2 == d.c1]; print('after two same-colour candles, the third copies: %.1f%% (n=%d)' % (100*(s.c3 == s.c1).mean(), len(s)))
    # 4) most consistent slot through time: share of months where the slot beats 40%
    d['ym'] = d.index.strftime('%Y-%m'); m = d.groupby(['slot', 'ym']).both.mean().unstack(); best = m.min(axis=1).sort_values(ascending=False).head(3)
    print('best worst-month score of any time of day:', ', '.join('%02d:%02d worst month %.0f%%, best month %.0f%%' % (k//60, k % 60, 100*v, 100*m.loc[k].max()) for k, v in best.items()))
    hi = (per_slot(d).both >= 0.40).sum(); print('times of day with a two-candle follow-through of 40%% or more over the whole period: %d of 288' % hi)
