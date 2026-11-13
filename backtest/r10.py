# hand-written version of what the model learned: fade the intraday move back toward VWAP, in the direction of the 4H trend
import pickle, numpy as np, pandas as pd, itertools
from r6 import S, COST, simulate, report
D = pickle.load(open('../data/F_5min.pkl', 'rb')); split = pd.Timestamp('2026-07-01', tz='UTC')
def rule_p(F, zv, r48, trend, quiet):
    L = (F.zvwap <= -zv) & (F.ret48 <= -r48); Sh = (F.zvwap >= zv) & (F.ret48 >= r48)
    if trend == 'h4': L &= F.h4 >= 0; Sh &= F.h4 <= 0
    if trend == 'h4s': L &= F.h4 == 1; Sh &= F.h4 == -1
    if trend == 'd': L &= F.ret288 > 0; Sh &= F.ret288 < 0
    if quiet: q = (F.hour >= 20) | (F.hour <= 1); L &= q; Sh &= q
    return pd.DataFrame({'p': np.where(L, 1.0, np.where(Sh, 0.0, 0.5)), 'y': F['y3'], 'dur': F['dur3'], 'atr_pct': F['atr_pct']}, index=F.index).iloc[400:-600]
rows = []
for zv, r48, trend, quiet in itertools.product((1.0, 1.5, 2.0), (0.0, 2.0, 4.0), ('none', 'h4', 'h4s', 'd'), (False, True)):
    T = pd.concat([simulate(rule_p(D[s], zv, r48, trend, quiet), s, 3.0, '5min', 0.4, max_cost=0.08).assign(s=s[:4]) for s in S])
    a = T[T.index < split]; b = T[T.index >= split]
    rows.append(dict(zv=zv, r48=r48, trend=trend, quiet=quiet, n_is=len(a), win_is=100*(a.res > 0).mean(), net_is=a.r.sum(), n_oos=len(b), win_oos=100*(b.res > 0).mean(), net_oos=b.r.sum(), per_sym=' '.join('%s%+.0f' % (k, v) for k, v in T.groupby('s').r.sum().items())))
R = pd.DataFrame(rows); pd.set_option('display.width', 220)
print(R.sort_values('net_is', ascending=False).head(12).round(1).to_string(index=False))
print('rules with positive IS net: %d of %d; of those positive OOS: %d' % ((R.net_is > 0).sum(), len(R), ((R.net_is > 0) & (R.net_oos > 0)).sum()))
