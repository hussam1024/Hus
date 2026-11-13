import pickle, numpy as np, pandas as pd
from r6 import *
M = pickle.load(open('../data/final_model.pkl', 'rb')); g, COLS, NOND = M['g'], M['cols'], M['nond']
D = pickle.load(open('../data/F_5min.pkl', 'rb')); O = pickle.load(open('../data/oof_5min_3_compact.pkl', 'rb'))
tot_in, tot_oof = [], []
for s in S:
    F = D[s].iloc[400:-600]; X, _ = prep(F); X = X[COLS]; ok = X.notna().all(axis=1); X = X[ok]; F = F[ok]
    Xm = X.copy(); dc = [c for c in COLS if c not in NOND]; Xm[dc] = -Xm[dc]
    p = (g.predict_proba(X)[:, 1] + 1 - g.predict_proba(Xm)[:, 1])/2
    P = pd.DataFrame({'p': p, 'y': F['y3'].values, 'dur': F['dur3'].values, 'atr_pct': F['atr_pct'].values}, index=X.index)
    a = simulate(P, s, 3.0, '5min', 0.05, max_cost=0.08); b = simulate(O[s], s, 3.0, '5min', 0.05, max_cost=0.08); tot_in.append(a); tot_oof.append(b)
    print(report(a, 'IN-SAMPLE (final model) ' + s[:4])); print(report(b, 'OUT-OF-FOLD             ' + s[:4]))
for nm, t in (('IN-SAMPLE', tot_in), ('OUT-OF-FOLD', tot_oof)):
    A = pd.concat(t); d = pd.concat([x.r.groupby(x.index.floor('1D')).sum() for x in t])
    print('%s pooled: n=%d win=%.1f%% net=%+.1fR (%+.3f/trade) gross=%+.1fR | symbol-days traded=%d, green=%.0f%%, best day %+.1fR, worst day %+.1fR' % (nm, len(A), 100*(A.res > 0).mean(), A.r.sum(), A.r.mean(), A.res.sum(), len(d), 100*(d > 0).mean(), d.max(), d.min()))
# longest losing streak of days and of trades, out-of-fold
for s, b in zip(S, tot_oof):
    d = (b.r.groupby(b.index.floor('1D')).sum() > 0).astype(int).values; ls = cur = 0
    for v in d: cur = 0 if v else cur+1; ls = max(ls, cur)
    lt = cur = 0
    for v in (b.res > 0).values: cur = 0 if v else cur+1; lt = max(lt, cur)
    print('   %s out-of-fold: longest run of losing days=%d, longest run of losing trades=%d, days with no signal=%d of 365' % (s[:4], ls, lt, 365-b.index.floor('1D').nunique()))
