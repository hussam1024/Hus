from s6 import R
from s5 import *
import contextlib, io
A = R(trades('PAXGUSDT', 'asia', entry_h=18)); F = R(trades('PAXGUSDT', 'fade', sl_k=1.0, tp_k=1.0, hold_end=15)); A['k'] = 'A'; F['k'] = 'F'
B = pd.concat([A, F]).sort_index(); B['ym'] = B.index.to_period('M')
g = B.groupby('ym'); M = pd.DataFrame({'trades': g.R.size(), 'wins': g.R.apply(lambda x: (x > 0).sum()), 'A': B[B.k == 'A'].groupby('ym').R.sum(), 'F': B[B.k == 'F'].groupby('ym').R.sum(), 'total': g.R.sum()}).fillna(0)
M['usd'] = (M.total*100).round(0)
pd.set_option('display.width', 200); pd.set_option('display.max_rows', 200)
print(M.round(1).to_string())
M.round(2).to_csv('monthly.csv')
y = M.groupby(M.index.year).agg(trades=('trades', 'sum'), wins=('wins', 'sum'), A=('A', 'sum'), F=('F', 'sum'), total=('total', 'sum'), green=('total', lambda x: (x > 0).sum()), months=('total', 'size'), worst=('total', 'min'), best=('total', 'max'))
print(y.round(1).to_string())
print('all: total %.1fR, green %d/%d, avg green month %+.1fR, avg red month %+.1fR, median month %+.1fR' % (M.total.sum(), (M.total > 0).sum(), len(M), M.total[M.total > 0].mean(), M.total[M.total <= 0].mean(), M.total.median()))
