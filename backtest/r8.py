import sys, pickle, pandas as pd
from r6 import *
COLS = ['h4_slope','h4_dist','h1_slope','h1_dist','dvwap','zvwap','e50_200','e21_50','slope200','d200','ret288','ret96','ret48','dext100','di','h4_rsi','h1_rsi','pos288','pos100','rsi','atr50_200','volreg','adx','bbw']
CP = dict(n_estimators=80, learning_rate=0.08, max_depth=3, num_leaves=8, min_child_samples=1500, subsample=0.7, subsample_freq=1, colsample_bytree=0.7, reg_lambda=10)
for rule, K in (('5min', 3.0), ('5min', 2.0)):
    Ks = f'{K:g}'; P = oof(rule, Ks, params=CP, cols=COLS, tag='compact')
    print(f'=== {rule} k={Ks} — COMPACT model (80 depth-3 trees, 24 features), out-of-fold, spread included, spread<=8% of stop', flush=True)
    for thr in (0.03, 0.04, 0.05, 0.06, 0.07):
        tot = []
        for s in S:
            T = simulate(P[s], s, K, rule, thr, max_cost=0.08); tot.append(T); print(report(T, f'thr={thr:.2f} {s[:4]}'))
        A = pd.concat(tot); print('   -> all four: n=%d win=%.1f%% net=%+.1fR gross=%+.1fR' % (len(A), 100*(A.res > 0).mean(), A.r.sum(), A.res.sum()), flush=True)
