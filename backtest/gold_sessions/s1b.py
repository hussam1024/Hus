from g import *
m = load(); h = bars(m, '60min')
print('first', h.c.iloc[0], 'last', h.c.iloc[-1], 'total log ret %.3f' % np.log(h.c.iloc[-1]/h.c.iloc[0]))
co = np.log(h.c/h.o); cc = np.log(h.c/h.c.shift(1)); print('sum of open->close per hour: %.3f | sum close->close: %.3f | sum of gaps (prev close -> open): %.3f' % (co.sum(), cc.sum(), np.log(h.o/h.c.shift(1)).sum()))
ny = h.index.tz_convert('America/New_York'); inc = (((ny.dayofweek < 4) | ((ny.dayofweek == 4) & (ny.hour < 17)) | ((ny.dayofweek == 6) & (ny.hour >= 18))) & (ny.hour != 17))
print('close->close log return inside gold hours: %.3f | outside (weekend + 17:00 NY hour): %.3f' % (cc[inc].sum(), cc[~inc].sum()))
print('per year inside/outside:'); print(pd.DataFrame({'inside': cc[inc].groupby(ny[inc].year).sum(), 'outside': cc[~inc].groupby(ny[~inc].year).sum(), 'price_end': h.c.groupby(ny.year).last()}).round(3).to_string())
g1 = np.log(m.o/m.c.shift(1)); print('1m gaps: mean %.2e, share nonzero %.3f, sum %.3f' % (g1.mean(), (g1 != 0).mean(), g1.sum()))
