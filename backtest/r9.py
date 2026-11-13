import pickle, numpy as np, pandas as pd
from r6 import *
P = pickle.load(open('../data/oof_5min_3_compact.pkl', 'rb')); D = pickle.load(open('../data/F_5min.pkl', 'rb'))
for thr in (0.04, 0.05, 0.06):
    A = pd.concat([simulate(P[s], s, 3.0, '5min', thr, max_cost=0.08).assign(s=s[:4]) for s in S])
    A['blk'] = pd.cut(A.index, EDGES, right=False, labels=[str(e.date())[:7] for e in EDGES[:-1]])
    print(f'--- compact 5min k=3 thr={thr}: by 2-month block (pooled 4 symbols) and by symbol')
    print(A.groupby('blk').agg(n=('r', 'size'), win=('res', lambda x: round(100*(x > 0).mean(), 1)), netR=('r', 'sum')).round(1).T.to_string())
    print(A.groupby(['s', 'blk']).r.sum().unstack().round(1).to_string())
    print('long share %.0f%%, long win %.1f%%, short win %.1f%%' % (100*(A.side > 0).mean(), 100*(A.res[A.side > 0] > 0).mean(), 100*(A.res[A.side < 0] > 0).mean()))
    if thr == 0.05:
        for cost_mult in (0.5, 1.5, 2.0):
            B = pd.concat([simulate(P[s], s, 3.0, '5min', thr, cost_mult=cost_mult, max_cost=0.08*cost_mult) for s in S]); print('   spread x%.1f: n=%d net=%+.1fR (%.3f R/trade)' % (cost_mult, len(B), B.r.sum(), B.r.mean()))
        for tp_, sl_ in ((1.0, 2.0), (1.0, 3.0), (2.0, 2.0)):
            B = [simulate(P[s], s, 3.0, '5min', thr, max_cost=0.08, day_tp=tp_, day_sl=sl_) for s in S]
            for s, b in zip(S, B):
                d = b.r.groupby(b.index.floor('1D')).sum(); print('   daily lock +%gR/-%gR %s: n=%d net=%+.1fR green days=%.0f%% of %d, avg green=%+.2fR avg red=%+.2fR' % (tp_, sl_, s[:4], len(b), b.r.sum(), 100*(d > 0).mean(), len(d), d[d > 0].mean(), d[d <= 0].mean()))
        # what does the model do? relation of chosen side to context
        for s in S:
            T = simulate(P[s], s, 3.0, '5min', thr, max_cost=0.08); F = D[s].loc[T.index]
            print('   %s side vs: 4H bias agree %.0f%%, sign(ret48) agree %.0f%%, sign(dvwap) agree %.0f%%, sign(ret288) agree %.0f%% | median hold %d min, hour-of-day top: %s' % (s[:4], 100*(np.sign(F.h4) == T.side).mean(), 100*(np.sign(F.ret48) == T.side).mean(), 100*(np.sign(F.dvwap) == T.side).mean(), 100*(np.sign(F.ret288) == T.side).mean(), P[s].loc[T.index].dur.median(), T.index.hour.value_counts().head(4).index.tolist()))
