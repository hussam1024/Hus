from s5 import *
def R(T, k=1.0): T = T.copy(); T['R'] = T.bp/(k*T.u); return T
def summ(nm, T):
    mo = T.R.groupby(T.index.to_period('M')).sum(); yr = T.R.groupby(T.index.year).sum(); eq = T.R.cumsum(); d = T.R.groupby(T.index.date).sum(); t = T.R.mean()/(T.R.std()/np.sqrt(len(T)))
    wk = T.R.groupby(T.index.to_period('W')).sum()
    print('%-34s n=%4d win %.1f%% | %+.3fR/trade t=%.2f | total %+.1fR (%.1fR/yr) | green: days %.0f%% weeks %.0f%% months %.0f%% (%d/%d) | worst month %+.1fR, longest losing-month run %d | maxDD %.1fR | yearly R: %s' % (
        nm, len(T), 100*(T.R > 0).mean(), T.R.mean(), t, T.R.sum(), T.R.sum()/6.17, 100*(d > 0).mean(), 100*(wk > 0).mean(), 100*(mo > 0).mean(), (mo > 0).sum(), len(mo), mo.min(),
        max((sum(1 for _ in g) for k, g in __import__('itertools').groupby((mo <= 0).values) if k), default=0), (eq.cummax()-eq).max(), ' '.join('%d:%+.1f' % (a, b) for a, b in yr.items())))
    return mo
print('R = the usual daily move of gold (20-day average of |daily change|), about %.0f bp on average; costs included\n' % trades('PAXGUSDT', 'fade').u.mean())
A = R(trades('PAXGUSDT', 'asia', entry_h=18)); F12 = R(trades('PAXGUSDT', 'fade', sl_k=1.0, tp_k=1.0)); F15 = R(trades('PAXGUSDT', 'fade', sl_k=1.0, tp_k=1.0, hold_end=15))
summ('ASIA long 18:00->22:00 (Mon-Thu)', A); summ('NY FADE 09:00->12:00, 1:1', F12); summ('NY FADE 09:00->15:00, 1:1', F15)
B = pd.concat([A, F15]).sort_index(); mo = summ('BOTH (Asia + fade->15:00)', B)
print('\nmonthly R of BOTH:'); M = mo.to_frame('R'); M['y'] = M.index.year; M['m'] = M.index.month; print(M.pivot(index='y', columns='m', values='R').round(1).to_string())
# robustness of the fade: shift the whole schedule
print('\nfade robustness (no stop, net bp/trade): measure window -> entry -> exit')
for w0, w1, e, x in ((8, 9, 9, 12), (7.5, 8.5, 8.5, 11.5), (8.5, 9.5, 9.5, 12.5), (8, 9, 9.25, 12), (8, 9, 9.5, 12), (8, 8.75, 8.75, 12), (8, 9.25, 9.25, 12), (8.25, 9, 9, 12), (9, 10, 10, 13), (10, 11, 11, 14), (3, 4, 4, 7), (13, 14, 14, 17)):
    T = trades('PAXGUSDT', 'fade', w0=w0, w1=w1, entry_h=e, hold_end=x); a = T[T.index < '2024-01-01'].bp; b = T[T.index >= '2024-01-01'].bp
    print('  %5.2f-%5.2f -> %5.2f -> %5.2f : disc %+5.2f (t=%+.2f)  valid %+5.2f (t=%+.2f)' % (w0, w1, e, x, a.mean(), a.mean()/(a.std()/np.sqrt(len(a))), b.mean(), b.mean()/(b.std()/np.sqrt(len(b)))))
