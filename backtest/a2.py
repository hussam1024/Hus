import pickle, sys, numpy as np, pandas as pd
from apex import *
COST = {'BTCUSDT': 0.03, 'ETHUSDT': 0.04, 'SOLUSDT': 0.06, 'PAXGUSDT': 0.01}
rule = sys.argv[1]; PRE = pickle.load(open(f'../data/apex_{rule}.pkl', 'rb')); split = pd.Timestamp('2026-07-01', tz='UTC')
def allsym(tlname='slow', **kw):
    return pd.concat([trades(*PRE[s, tlname], COST[s], **kw).assign(s=s[:4]) for s in COST])
def line(T, nm):
    a = T[T.index < split]; b = T[T.index >= split]
    f = lambda X: 'n=%5d win=%4.1f%% gross/tr=%+.3f net/tr=%+.3f' % (len(X), 100*(X.R > 0).mean() if len(X) else 0, X.R.mean() if len(X) else 0, X.net.mean() if len(X) else 0)
    return nm.ljust(46) + ' IS ' + f(a) + ' | OOS ' + f(b) + ' | per-sym OOS net/tr: ' + ' '.join('%s %+.2f' % (k, v) for k, v in b.groupby('s').net.mean().items())
print(f'##### {rule}: 4 symbols pooled; IS = Nov-Jun, OOS = Jul-Oct')
T = allsym(minScore=50.0, p1=1.0)      # pure 1:1 to read the score cleanly
print('1:1 outcome by score bucket (all signals >= 50):')
T['b'] = pd.cut(T.score, [50, 58, 64, 68, 72, 76, 80, 85, 101], right=False)
print(T.groupby(['b', 'eng']).agg(n=('R', 'size'), win=('R', lambda x: round(100*(x > 0).mean(), 1))).unstack().to_string())
print(line(allsym(), 'current defaults'))
print(line(allsym(p1=1.0), '1:1 single target'))
print(line(allsym(p1=1.0, engB=False), '1:1, engine A only'))
print(line(allsym(p1=1.0, engA=False, minScore=50.0), '1:1, engine B only, score>=50'))
for ms in (58.0, 78.0, 85.0): print(line(allsym(p1=1.0, minScore=ms), f'1:1, minScore {ms:g}'))
print(line(allsym(p1=1.0, htfMode=2), '1:1, HTF strict'))
print(line(allsym(p1=1.0, htfMode=0, tlGate=False), '1:1, no HTF gate, no trend-lock gate'))
print(line(allsym('vslow', p1=1.0), '1:1, trend lock Very slow'))
print(line(allsym(p1=1.0, minRisk=1.5, maxRisk=3.0), '1:1, stop 1.5-3 ATR'))
print(line(allsym(p1=1.0, minRisk=2.5, maxRisk=4.0), '1:1, stop 2.5-4 ATR'))
print(line(allsym(p1=1.0, rr1=2.0, be=False), 'single target 2R'))
print(line(allsym(p1=1.0, rr1=3.0, be=False, minRisk=1.0), 'single target 3R, stop>=1 ATR'))
print(line(allsym(p1=0.0, p2=0.0, rr3=4.0, be=False, trail=False), 'single target 4R, no BE'))
print(line(allsym(p1=1.0, rr1=0.5, minRisk=2.0, maxRisk=4.0), 'target 0.5R with stop 2-4 ATR (high win-rate style)'))
