# train the final compact model on the full year and export it as a Pine function; verify the export numerically
import pickle, numpy as np, pandas as pd, lightgbm as lgb, warnings, re
warnings.filterwarnings('ignore')
exec(open('r4defs.py').read())
S = ['BTCUSDT','ETHUSDT','SOLUSDT','PAXGUSDT']
COLS = ['h4_slope','h4_dist','h1_slope','h1_dist','dvwap','zvwap','e50_200','e21_50','slope200','d200','ret288','ret96','ret48','dext100','di','h4_rsi','h1_rsi','pos288','pos100','rsi','atr50_200','volreg','adx','bbw']
NOND = ['atr50_200','volreg','adx','bbw']
CP = dict(n_estimators=80, learning_rate=0.08, max_depth=3, num_leaves=8, min_child_samples=1500, subsample=0.7, subsample_freq=1, colsample_bytree=0.7, reg_lambda=10, random_state=7)
D = pickle.load(open('../data/F_5min.pkl', 'rb')); Xs, ys, keep = [], [], {}
for s in S:
    F = D[s].iloc[400:-600]; X, _ = prep(F); X = X[COLS]; ok = X.notna().all(axis=1) & (F['y3'] != 0); Xa = X[ok]; ya = (F['y3'][ok] == 1).astype(int)
    Xm = Xa.copy(); dc = [c for c in COLS if c not in NOND]; Xm[dc] = -Xm[dc]; Xs += [Xa, Xm]; ys += [ya, 1-ya]; keep[s] = Xa
g = lgb.LGBMClassifier(verbose=-1, **CP).fit(pd.concat(Xs), pd.concat(ys))
PN = {c: 'x'+str(i) for i, c in enumerate(COLS)}
def fmt(v):
    v = 0.0 if abs(v) < 1e-12 else v
    t = ('%.9f' % v).rstrip('0')
    return t + '0' if t.endswith('.') else t
def node(n, py=False):
    if 'leaf_value' in n: return fmt(n['leaf_value'])
    assert n['decision_type'] == '<='
    c = '%s <= %s' % (PN[COLS[n['split_feature']]], fmt(n['threshold']))
    L, R = node(n['left_child'], py), node(n['right_child'], py)
    return ('np.where(%s, %s, %s)' % (c, L, R)) if py else ('(%s ? %s : %s)' % (c, L, R))
TI = g.booster_.dump_model()['tree_info']
trees = [node(t['tree_structure']) for t in TI]; ptrees = [node(t['tree_structure'], True) for t in TI]
def pyexpr(e): return e
Xt = keep['BTCUSDT'].iloc[::50]; env = {'np': np}; env.update({PN[c]: Xt[c].values for c in COLS})
raw = sum(eval(t, env) for t in ptrees); ref = g.predict(Xt, raw_score=True)
print('trees', len(trees), 'max abs diff export vs lightgbm raw score: %.2e' % np.abs(raw-ref).max(), '| longest line', max(map(len, trees)))
used = sorted({COLS[n] for t in g.booster_.dump_model()['tree_info'] for n in (lambda f: f(f, t['tree_structure']))(lambda f, n: [] if 'leaf_value' in n else [n['split_feature']] + f(f, n['left_child']) + f(f, n['right_child']))}, key=COLS.index)
print('features used:', len(used), [c for c in COLS if c not in used] or 'all')
lines = ['f_modelRaw(' + ', '.join('float '+PN[c] for c in COLS) + ') =>', '    float s = 0.0'] + ['    s += ' + t for t in trees] + ['    s']
open('../data/model_pine.txt', 'w').write('\n'.join(lines) + '\n')
pickle.dump({'g': g, 'cols': COLS, 'nond': NOND}, open('../data/final_model.pkl', 'wb'))
print('pine function lines:', len(lines), 'chars:', sum(map(len, lines)))
print('arg order:', ', '.join(f'{PN[c]}={c}' for c in COLS))
