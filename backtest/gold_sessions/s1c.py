from g import *
P = bars(load('PAXGUSDT'), '60min'); X = bars(load('XAUUSDT'), '60min')
def tab(h):
    ny = h.index.tz_convert('America/New_York'); cc = np.log(h.c/h.c.shift(1))*1e4
    return pd.DataFrame({'r': cc, 'hour': ny.hour, 'dow': ny.dayofweek}, index=h.index).dropna()
p = tab(P); x = tab(X); common = p.index.intersection(x.index); pc = p.loc[common]; xc = x.loc[common]
print('same period (Dec 2025 - Oct 2026): total log return PAXG %.3f  XAUUSDT %.3f | hourly return correlation %.3f' % (pc.r.sum()/1e4, xc.r.sum()/1e4, np.corrcoef(pc.r, xc.r)[0, 1]))
wk = lambda d: d[(d.dow < 5)]
print('weekday close->close mean bp by NY hour: PAXG(all yrs) | PAXG(common) | XAUUSDT(common)')
T = pd.DataFrame({'PAXG_all': wk(p).groupby('hour').r.mean(), 'PAXG_common': wk(pc).groupby('hour').r.mean(), 'XAU_common': wk(xc).groupby('hour').r.mean()}); print(T.round(2).T.to_string())
for nm, d in (('PAXG all years', p), ('PAXG common', pc), ('XAUUSDT common', xc)):
    sat = d[(d.dow == 5) | ((d.dow == 6) & (d.hour < 18)) | ((d.dow == 4) & (d.hour >= 17))].r.sum()/1e4; h17 = d[(d.dow < 4) & (d.hour == 17)].r.sum()/1e4; rest = d.r.sum()/1e4 - sat - h17
    print('%-16s weekend (Fri 17:00-Sun 18:00 NY) %+.3f | 17:00 hour Mon-Thu %+.3f | market hours %+.3f' % (nm, sat, h17, rest))
print('XAUUSDT weekend bars exist?', len(x[x.dow == 5]), 'Saturday hourly bars; mean |ret| Sat %.2f bp vs weekdays %.2f bp' % (x[x.dow == 5].r.abs().mean(), x[x.dow < 5].r.abs().mean()))
