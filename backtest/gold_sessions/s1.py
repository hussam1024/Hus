from g import *
m = load(); h = bars(m, '60min'); pd.set_option('display.width', 250)
print('gold (PAXG) 1m rows', len(m), m.index[0], '->', m.index[-1])
ny = h.index.tz_convert('America/New_York'); r = pd.DataFrame({'ret': (h.c/h.o-1)*1e4, 'hour': ny.hour, 'dow': ny.dayofweek, 'year': ny.year}, index=h.index)
# gold market hours only: Sun 18:00 NY -> Fri 17:00 NY, skip the 17:00 daily break
r = r[((r.dow < 4) | ((r.dow == 4) & (r.hour < 17)) | ((r.dow == 6) & (r.hour >= 18))) & (r.hour != 17)]
t = r.groupby('hour').ret.agg(['mean', 'std', 'count']); t['t'] = t['mean']/(t['std']/np.sqrt(t['count']))
yr = r.pivot_table(index='hour', columns='year', values='ret', aggfunc='mean')
print('mean hourly return in basis points by New-York hour (weekdays, gold hours), all years, t-stat, then per year:')
print(pd.concat([t[['mean', 't']].round(2), yr.round(2)], axis=1).to_string())
print('\nby day of week (bp per day, NY days):'); d = r.groupby([r.index.tz_convert('America/New_York').date]).ret.sum(); dd = pd.Series(d.values, index=pd.to_datetime(d.index)); print(dd.groupby(dd.index.dayofweek).agg(['mean', 'count']).round(2).T.to_string())
print('\nsessions (bp/day): ')
def sess(a, b): return r[(r.hour >= a) & (r.hour < b)] if a < b else r[(r.hour >= a) | (r.hour < b)]
for nm, a, b in (('Asia 18-03 NY', 18, 3), ('London 03-08 NY', 3, 8), ('NY 08-17', 8, 17), ('overnight 17-08 (18..07)', 18, 8), ('NY morning 08-12', 8, 12), ('NY afternoon 12-17', 12, 17)):
    s = sess(a, b); day = s.groupby(s.index.tz_convert('America/New_York').floor('D') + pd.to_timedelta((s.hour >= 18).astype(int), unit='D')).ret.sum()
    print('%-26s mean %+6.2f bp  t=%+.2f  win days %.1f%% | per year: %s' % (nm, day.mean(), day.mean()/(day.std()/np.sqrt(len(day))), 100*(day > 0).mean(), ' '.join('%d:%+.1f' % (y, v) for y, v in day.groupby(day.index.year).mean().items())))
