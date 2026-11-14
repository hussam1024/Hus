import pandas as pd, numpy as np, glob, zipfile, os, warnings
warnings.filterwarnings('ignore')
G = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'gold')
def load(sym='PAXGUSDT'):
    out = os.path.join(G, sym + '_1m.pkl')
    if os.path.exists(out): return pd.read_pickle(out)
    fr = []
    for f in sorted(glob.glob(os.path.join(G, f'{sym}-1m-*.zip'))):
        with zipfile.ZipFile(f) as z: df = pd.read_csv(z.open(z.namelist()[0]), header=None, usecols=[0, 1, 2, 3, 4, 5], dtype=str)
        df = df[df[0].str.isnumeric()].astype(float); df.columns = ['t', 'o', 'h', 'l', 'c', 'v']
        t = df.t.astype('int64').values; t = np.where(t > 10**14, t // 1000, t); df['t'] = pd.to_datetime(t, unit='ms', utc=True); fr.append(df)
    df = pd.concat(fr).drop_duplicates('t').set_index('t').sort_index(); df.to_pickle(out); return df
def bars(m1, rule):
    return m1.resample(rule, label='left', closed='left').agg({'o': 'first', 'h': 'max', 'l': 'min', 'c': 'last', 'v': 'sum'}).dropna(subset=['o'])
