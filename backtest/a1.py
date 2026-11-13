import pickle, sys
from apex import *
COST = {'BTCUSDT': 0.03, 'ETHUSDT': 0.04, 'SOLUSDT': 0.06, 'PAXGUSDT': 0.01}
rule = sys.argv[1]; H = {'1min': ('15min', '60min'), '5min': ('60min', '240min'), '15min': ('60min', '240min')}[rule]
PRE = {}
for s in COST:
    for nm, tl in (('slow', (4.5, 30, 2, 12)), ('vslow', (6.0, 50, 3, 20))):
        PRE[s, nm] = prep(load(s), rule, H[0], H[1], tl)
pickle.dump(PRE, open(f'../data/apex_{rule}.pkl', 'wb'))
print(f'##### chart {rule} — current indicator defaults (Balanced 68, both engines, trend lock Slow, TP 1R/2R/3R 50/30/20, BE)')
for s in COST:
    df, A = PRE[s, 'slow']; T = trades(df, A, COST[s]); print(s[:4], stats(T))
    for e, nm in ((1, 'A'), (2, 'B')): print('      engine', nm, stats(T[T.eng == e]))
