import sys, time, pickle, numpy as np, pandas as pd
from feats import build, labels
from load import SYMS
rule = sys.argv[1] if len(sys.argv) > 1 else '5min'
out = {}
for s in SYMS:
    t = time.time(); F, df, m1 = build(s, rule)
    for k in (1.0, 2.0, 3.0):
        y, dur, amb = labels(F, df, m1, rule, k)
        F[f'y{k:g}'] = y; F[f'dur{k:g}'] = dur
    out[s] = F
    yy = F['y2'].values[300:-2000]
    print(s, rule, len(F), 'atr%% med %.3f' % F.atr_pct.median(), 'P(up first,k=2)=%.3f' % (yy == 1).mean(), 'none=%.3f' % (yy == 0).mean(), 'med dur k1/k2/k3 min', int(np.median(F.dur1)), int(np.median(F.dur2)), int(np.median(F.dur3)), '%.1fs' % (time.time()-t), flush=True)
pickle.dump(out, open(f'../data/F_{rule}.pkl', 'wb'))
