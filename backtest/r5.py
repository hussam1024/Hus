# walk-forward / cross-period validation of the symmetric GBM
import sys, pickle, numpy as np, pandas as pd, lightgbm as lgb, warnings
warnings.filterwarnings('ignore')
rule, K = sys.argv[1], sys.argv[2]
D = pickle.load(open(f'../data/F_{rule}.pkl', 'rb')); S = ['BTCUSDT','ETHUSDT','SOLUSDT','PAXGUSDT']
exec(open('r4defs.py').read())
data = {}
for s in S:
    F = D[s].iloc[400:-600]; F = F[F[f'y{K}'] != 0]; X, dcols = prep(F); y = (F[f'y{K}'] == 1).astype(int); ok = X.notna().all(axis=1); data[s] = (X[ok], y[ok])
edges = pd.to_datetime(['2025-11-01','2026-01-01','2026-03-01','2026-05-01','2026-07-01','2026-09-01','2026-11-01'], utc=True)
res = []; imps = []
for f in range(6):
    a, b = edges[f], edges[f+1]; gap = pd.Timedelta('2D')
    Xs, ys = [], []
    for s in S:
        X, y = data[s]; m = (X.index < a-gap) | (X.index >= b+gap); Xa = X[m]; Xm = Xa.copy(); Xm[dcols] = -Xm[dcols]
        Xs += [Xa, Xm]; ys += [y[m], 1-y[m]]
    g = lgb.LGBMClassifier(n_estimators=300, learning_rate=0.03, num_leaves=24, min_child_samples=500, subsample=0.7, subsample_freq=1, colsample_bytree=0.6, reg_lambda=5, verbose=-1).fit(pd.concat(Xs), pd.concat(ys))
    imps.append(pd.Series(g.booster_.feature_importance('gain'), index=Xs[0].columns))
    for s in S:
        X, y = data[s]; m = (X.index >= a) & (X.index < b); Xt = X[m]; Xm = Xt.copy(); Xm[dcols] = -Xm[dcols]
        p = (g.predict_proba(Xt)[:, 1] + 1 - g.predict_proba(Xm)[:, 1])/2; conf = np.abs(p-.5); win = np.where(p > .5, y[m], 1-y[m])
        res.append(dict(fold=str(a.date())[:7], s=s[:4], all=win.mean(), top10=win[conf >= np.quantile(conf, .9)].mean(), top5=win[conf >= np.quantile(conf, .95)].mean(), top2=win[conf >= np.quantile(conf, .98)].mean(), thr5=np.quantile(conf, .95)))
R = pd.DataFrame(res); pd.set_option('display.width', 200)
print(f'== {rule} k={K}: each 2-month block predicted by a model trained on the other 10 months (2-day gap)')
for col in ('top10', 'top5', 'top2'):
    print(col); print((R.pivot(index='fold', columns='s', values=col)*100).round(1).to_string())
imp = pd.concat(imps, axis=1).mean(axis=1); print('importance:', ', '.join(f'{k} {v:.3f}' for k, v in (imp/imp.sum()).sort_values(ascending=False).head(25).items()))
