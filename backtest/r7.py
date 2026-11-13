import sys, pickle, pandas as pd
from r6 import *
for rule, K in (('5min', 2.0), ('5min', 3.0), ('15min', 2.0), ('15min', 3.0)):
    Ks = f'{K:g}'
    try: P = pickle.load(open(f'../data/oof_{rule}_{Ks}_full.pkl', 'rb'))
    except Exception: P = oof(rule, Ks)
    print(f'=== {rule} k={Ks} — out-of-fold, spread included, skip trades whose spread > 8% of the stop', flush=True)
    for thr in (0.05, 0.07, 0.09, 0.11):
        tot = []
        for s in S:
            T = simulate(P[s], s, K, rule, thr, max_cost=0.08); tot.append(T); print(report(T, f'thr={thr:.2f} {s[:4]}'))
        A = pd.concat(tot); g = (A.res > 0).mean(); print('   -> all four: n=%d win=%.1f%% net=%+.1fR gross=%+.1fR' % (len(A), 100*g, A.r.sum(), A.res.sum()), flush=True)
