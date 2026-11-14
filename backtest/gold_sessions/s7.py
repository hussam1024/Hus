from s6 import R, summ
from s5 import *
print('\\n--- sensitivity (PAXG 2020-2026)')
for e in (18, 18.25, 18.5, 19):
    for c in (1.0, 2.0):
        T = R(trades('PAXGUSDT', 'asia', entry_h=e, cost=c)); print('ASIA entry %5.2f spread %.0fbp: %+.3fR/trade, total %+.1fR, green months %.0f%%, years>0: %d/7' % (e, c, T.R.mean(), T.R.sum(), 100*(T.R.groupby(T.index.to_period('M')).sum() > 0).mean(), (T.R.groupby(T.index.year).sum() > 0).sum()))
for x in (20, 21, 22, 23, 24+1, 24+3):
    T = R(trades('PAXGUSDT', 'asia', entry_h=18, hold_end=x)); print('ASIA 18:00 -> %d:00: %+.3fR/trade total %+.1fR green months %.0f%%' % (x % 24, T.R.mean(), T.R.sum(), 100*(T.R.groupby(T.index.to_period('M')).sum() > 0).mean()))
for c in (1.0, 2.0, 3.0):
    T = R(trades('PAXGUSDT', 'fade', sl_k=1.0, tp_k=1.0, hold_end=15, cost=c)); print('FADE ->15 1:1 spread %.0fbp: %+.3fR/trade total %+.1fR green months %.0f%% years>0: %d/7' % (c, T.R.mean(), T.R.sum(), 100*(T.R.groupby(T.index.to_period('M')).sum() > 0).mean(), (T.R.groupby(T.index.year).sum() > 0).sum()))
A = R(trades('PAXGUSDT', 'asia', entry_h=18, cost=2.0)); F = R(trades('PAXGUSDT', 'fade', sl_k=1.0, tp_k=1.0, hold_end=15, cost=2.0)); summ('BOTH at 2bp spread', pd.concat([A, F]).sort_index())
