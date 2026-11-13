# out-of-fold predictions (6 blocks) + realistic one-trade-at-a-time simulation with spread cost
import sys, pickle, numpy as np, pandas as pd, lightgbm as lgb, warnings
warnings.filterwarnings('ignore')
S = ['BTCUSDT','ETHUSDT','SOLUSDT','PAXGUSDT']
COST = {'BTCUSDT': 0.03, 'ETHUSDT': 0.04, 'SOLUSDT': 0.06, 'PAXGUSDT': 0.01}   # round-trip spread in % of price
exec(open('r4defs.py').read())
EDGES = pd.to_datetime(['2025-11-01','2026-01-01','2026-03-01','2026-05-01','2026-07-01','2026-09-01','2026-11-01'], utc=True)

def oof(rule, K, params=None, cols=None, tag='full'):
    D = pickle.load(open(f'../data/F_{rule}.pkl', 'rb'))
    params = params or dict(n_estimators=300, learning_rate=0.03, num_leaves=24, min_child_samples=500, subsample=0.7, subsample_freq=1, colsample_bytree=0.6, reg_lambda=5)
    data = {}
    for s in S:
        F = D[s].iloc[400:-600]; X, dcols = prep(F)
        if cols: X = X[cols]
        ok = X.notna().all(axis=1); data[s] = (X[ok], F[ok])
    dc = [c for c in dcols if (not cols or c in cols)]
    out = {s: [] for s in S}
    for f in range(6):
        a, b = EDGES[f], EDGES[f+1]; gap = pd.Timedelta('2D'); Xs, ys = [], []
        for s in S:
            X, F = data[s]; y = F[f'y{K}']; m = ((X.index < a-gap) | (X.index >= b+gap)) & (y != 0).values
            Xa = X[m]; Xm = Xa.copy(); Xm[dc] = -Xm[dc]; ya = (y[m] == 1).astype(int); Xs += [Xa, Xm]; ys += [ya, 1-ya]
        g = lgb.LGBMClassifier(verbose=-1, **params).fit(pd.concat(Xs), pd.concat(ys))
        for s in S:
            X, F = data[s]; m = (X.index >= a) & (X.index < b); Xt = X[m]; Xm = Xt.copy(); Xm[dc] = -Xm[dc]
            p = (g.predict_proba(Xt)[:, 1] + 1 - g.predict_proba(Xm)[:, 1])/2
            out[s].append(pd.DataFrame({'p': p, 'y': F[f'y{K}'][m].values, 'dur': F[f'dur{K}'][m].values, 'atr_pct': F['atr_pct'][m].values}, index=Xt.index))
    out = {s: pd.concat(v) for s, v in out.items()}
    pickle.dump(out, open(f'../data/oof_{rule}_{K}_{tag}.pkl', 'wb'))
    return out

def simulate(P, s, K, rule, thr, cost_mult=1.0, day_tp=None, day_sl=None, max_cost=None):
    tf = pd.Timedelta(rule); t = P.index; p = P.p.values; y = P.y.values; dur = P.dur.values; ap = P.atr_pct.values
    free_at = t[0]; rows = []; day = None; dnet = 0.0; locked = False
    for i in range(len(t)):
        ti = t[i]
        if ti < free_at: continue
        d = ti.floor('1D')
        if d != day: day = d; dnet = 0.0; locked = False
        if locked: continue
        c = abs(p[i]-.5)
        if c < thr: continue
        side = 1 if p[i] > .5 else -1
        if dur[i] == 0: continue                       # never resolved inside 24h (rare)
        if max_cost is not None and cost_mult*COST[s]/(K*ap[i]) > max_cost: continue   # stop too tight relative to the spread
        res = -1.0 if y[i] == 0 else float(y[i]*side)  # both barriers inside one 1m bar -> count as a loss
        r = res - cost_mult*COST[s]/(K*ap[i])
        rows.append((ti, side, res, r)); free_at = ti + tf + pd.Timedelta(minutes=int(dur[i]))
        dnet += r
        if (day_tp is not None and dnet >= day_tp) or (day_sl is not None and dnet <= -day_sl): locked = True
    return pd.DataFrame(rows, columns=['t', 'side', 'res', 'r']).set_index('t')

def report(T, label):
    if len(T) == 0: return label + ' no trades'
    daily = T.r.groupby(T.index.floor('1D')).sum(); ndays = 365
    eq = T.r.cumsum(); dd = (eq.cummax()-eq).max()
    return '%s n=%4d (%.1f/day) win=%.1f%% netR=%+7.1f R/trade=%+.3f | green days=%.0f%% of %d traded, worst day=%.1fR, maxDD=%.1fR' % (label, len(T), len(T)/ndays, 100*(T.res > 0).mean(), T.r.sum(), T.r.mean(), 100*(daily > 0).mean(), len(daily), daily.min(), dd)

if __name__ == '__main__':
    rule, K = sys.argv[1], float(sys.argv[2]); Ks = f'{K:g}'
    try: P = pickle.load(open(f'../data/oof_{rule}_{Ks}_full.pkl', 'rb'))
    except Exception: P = oof(rule, Ks)
    print(f'=== {rule} k={Ks} — full model, out-of-fold over the whole year, spread included')
    for thr in (0.03, 0.05, 0.07, 0.09):
        for s in S:
            print(report(simulate(P[s], s, K, rule, thr), f'thr={thr:.2f} {s[:4]}'))
