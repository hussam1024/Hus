# Faithful port of APEX_Scalper_Pro.pine signal + trade logic (bar-level, like the on-chart dashboard)
import numpy as np, pandas as pd, warnings
from numba import njit
from load import load, resample
from lib import *
from tl import trend_lock
warnings.filterwarnings('ignore')

def prep(m1, rule, h1rule, h2rule, tl=(6.0, 50, 3, 20)):
    df = resample(m1, rule); o, h, l, c, v = [df[k].values.astype(float) for k in 'ohlcv']; n = len(c); A = {}
    def bias(r):
        H = resample(m1, r); cc = H.c.values; ef = ema(cc, 20); es = ema(cc, 50)
        b = np.where((ef > es) & (cc > es), 1, np.where((ef < es) & (cc < es), -1, 0)).astype(float)
        return np.nan_to_num(pd.Series(b, index=H.index).shift(1).reindex(df.index.floor(r)).values)
    A['h1'] = bias(h1rule); A['h2'] = bias(h2rule)
    a = atr(h, l, c, 14); A['atr'] = a; A['atrBase'] = sma(a, 100)
    A['e9'], A['e21'], A['e50'], A['e200'] = ema(c, 9), ema(c, 21), ema(c, 50), ema(c, 200)
    _, sd = supertrend(h, l, c, atr(h, l, c, 10), 3.0); A['stUp'] = (sd < 0).astype(float)
    dip, dim, adx = dmi(h, l, c, 14); A['dip'], A['dim'], A['adx'] = dip, dim, adx
    A['er'] = np.nan_to_num(np.abs(c-shift(c, 20))/rsum(np.abs(np.diff(c, prepend=np.nan)), 20))
    r = rsi(c, 14); A['rsi'] = r; macd = ema(c, 12)-ema(c, 26); A['hist'] = macd-ema(macd, 9)
    k = sma(stoch(r, 14), 3); d = sma(k, 3)
    xu = (k > d) & (shift(k, 1) <= shift(d, 1)); xd = (k < d) & (shift(k, 1) >= shift(d, 1))
    ru = pd.Series(xu.astype(float)).rolling(4).max().values > 0; rd = pd.Series(xd.astype(float)).rolling(4).max().values > 0
    A['kUp'] = (ru & (k > d)).astype(float); A['kDn'] = (rd & (k < d)).astype(float)
    A['rsiLo'], A['rsiHi'], A['rsiL3'], A['rsiH3'] = rmin(r, 5), rmax(r, 5), rmin(r, 3), rmax(r, 3)
    rng = h-l; rs = np.where(rng > 0, rng, np.nan); A['rng'] = rng; A['body'] = np.abs(c-o)
    A['cloc'] = np.where(rng > 0, (c-l)/rs, 0.5); A['dnw'] = np.where(rng > 0, (np.minimum(o, c)-l)/rs, 0.0); A['upw'] = np.where(rng > 0, (h-np.maximum(o, c))/rs, 0.0)
    vm = sma(v, 20); A['hasVol'] = (vm > 0).astype(float); A['relVol'] = np.where(vm > 0, v/np.where(vm > 0, vm, 1), 1.0)
    A['deltaE'] = ema(np.where(rng > 0, v*(2*c-h-l)/np.where(rng > 0, rng, 1), 0.0), 10)
    day = df.index.floor('1D').values; tp = (h+l+c)/3
    cv = pd.Series(v).groupby(day).cumsum().values; cpv = pd.Series(tp*v).groupby(day).cumsum().values; cpv2 = pd.Series(tp*tp*v).groupby(day).cumsum().values
    vw = cpv/np.where(cv > 0, cv, np.nan); sdv = np.sqrt(np.maximum(cpv2/np.where(cv > 0, cv, np.nan)-vw*vw, 0))
    A['vw'], A['vwU'], A['vwL'] = vw, vw+2*sdv, vw-2*sdv
    A['loN'], A['hiN'], A['pbLow'], A['pbHigh'], A['lo5'], A['hi5'] = rmin(l, 5), rmax(h, 5), rmin(l, 6), rmax(h, 6), rmin(l, 5), rmax(h, 5)
    A['rngMid'] = (rmax(h, 50)+rmin(l, 50))/2
    L = 5; win = 2*L+1
    ph = np.where((shift(h, L) == rmax(h, win)) & (shift(h, L) > rmax(h, L)), shift(h, L), np.nan)
    pl = np.where((shift(l, L) == rmin(l, win)) & (shift(l, L) < rmin(l, L)), shift(l, L), np.nan)
    A['ph'], A['pl'] = ph, pl; A['rsiPivLo'] = shift(A['rsiL3'], L-1); A['rsiPivHi'] = shift(A['rsiH3'], L-1)
    a50 = atr(h, l, c, 50); a200 = atr(h, l, c, 200)
    tld, _ = trend_lock(h, l, c, np.maximum(a50, np.nan_to_num(a200)*0.85), ema((h+l)/2, 5), A['e50'], shift(rmax(h, tl[1]), 1), shift(rmin(l, tl[1]), 1), tl[0], tl[2], tl[3])
    A['tl'] = tld.astype(float); A['o'], A['h'], A['l'], A['c'] = o, h, l, c
    A['hour'] = df.index.hour.values.astype(float)
    return df, A

@njit(cache=True)
def run(o, h, l, c, atr, atrBase, e9, e21, e50, e200, stUp, dip, dim, adx, er, rsi, hist, kUp, kDn, rsiLo, rsiHi, rsiL3, rsiH3, rng, body, cloc, dnw, upw,
        hasVol, relVol, deltaE, vw, vwU, vwL, loN, hiN, pbLow, pbHigh, lo5, hi5, rngMid, ph, pl, rsiPivLo, rsiPivHi, h1, h2, tl,
        minScore, engA, engB, tlGate, htfMode, rr1, rr2, rr3, p1, p2, be, trail, reentry, rev, cool, slBuf, minRisk, maxRisk, adxMin, minVol, spike, extMax, pbWin, swWin, eqTol, pbTol, dayOfBar, dayTP, daySL, minRiskPct):
    n = len(c); p3 = max(0.0, 1.0-p1-p2)
    out = np.zeros((n, 8)); nt = 0   # entry idx, dir, eng(1=A,2=B), score, R, risk/price, stage, exit idx
    pbL = -1; pbS = -1; lastAL = -1; lastAS = -1; lastSig = -10**9
    hp = np.zeros((12, 4)); hn = 0; lp = np.zeros((12, 4)); ln = 0     # px, rsi, born, eq
    swLBar = -1; swLExt = 0.0; swLLvl = 0.0; swLHigh = 0.0; swLWick = 0.0; swLEq = False; swLDiv = False
    swSBar = -1; swSExt = 0.0; swSLvl = 0.0; swSLow = 0.0; swSWick = 0.0; swSEq = False; swSDiv = False
    tdir = 0; tbar = 0; tentry = 0.0; tsl = 0.0; trisk = 1.0; tp1 = tp2 = tp3 = 0.0; stage = 0; rem = 1.0; realR = 0.0; teng = 0; tscore = 0.0
    curDay = -1; dayNet = 0.0; dayLock = False
    for i in range(210, n):
        a = atr[i]
        if np.isnan(a) or np.isnan(atrBase[i]) or np.isnan(vwL[i]) and False: continue
        if dayOfBar[i] != curDay: curDay = dayOfBar[i]; dayNet = 0.0; dayLock = False
        # ---- engine A state
        if e21[i] > e50[i] and l[i] <= e21[i] + a*pbTol: pbL = i
        if e21[i] < e50[i] and h[i] >= e21[i] - a*pbTol: pbS = i
        upTr = e21[i] > e50[i] and c[i] > e50[i]; dnTr = e21[i] < e50[i] and c[i] < e50[i]
        trigAL = upTr and pbL >= 0 and i-pbL <= pbWin and pbL > lastAL and c[i] > o[i] and c[i] > e9[i] and c[i] > h[i-1] and cloc[i] >= 0.5
        trigAS = dnTr and pbS >= 0 and i-pbS <= pbWin and pbS > lastAS and c[i] < o[i] and c[i] < e9[i] and c[i] < l[i-1] and cloc[i] <= 0.5
        # ---- liquidity pools
        if not np.isnan(ph[i]):
            isEq = False
            for q in range(hn):
                if abs(hp[q, 0]-ph[i]) <= a*eqTol: isEq = True; hp[q, 3] = 1
            m = min(hn, 11)
            for q in range(m, 0, -1): hp[q] = hp[q-1]
            hp[0, 0] = ph[i]; hp[0, 1] = rsiPivHi[i]; hp[0, 2] = i; hp[0, 3] = 1.0 if isEq else 0.0; hn = m+1
        if not np.isnan(pl[i]):
            isEq = False
            for q in range(ln):
                if abs(lp[q, 0]-pl[i]) <= a*eqTol: isEq = True; lp[q, 3] = 1
            m = min(ln, 11)
            for q in range(m, 0, -1): lp[q] = lp[q-1]
            lp[0, 0] = pl[i]; lp[0, 1] = rsiPivLo[i]; lp[0, 2] = i; lp[0, 3] = 1.0 if isEq else 0.0; ln = m+1
        lqL = False; lqLEq = False; lqLLvl = np.nan; lqLRsi = np.nan; q = ln-1
        while q >= 0:
            if i > lp[q, 2] and l[i] < lp[q, 0]:
                if c[i] > lp[q, 0]:
                    lqL = True; lqLEq = lqLEq or lp[q, 3] > 0
                    if np.isnan(lqLLvl) or lp[q, 0] < lqLLvl: lqLLvl = lp[q, 0]; lqLRsi = lp[q, 1]
                for z in range(q, ln-1): lp[z] = lp[z+1]
                ln -= 1
            q -= 1
        lqS = False; lqSEq = False; lqSLvl = np.nan; lqSRsi = np.nan; q = hn-1
        while q >= 0:
            if i > hp[q, 2] and h[i] > hp[q, 0]:
                if c[i] < hp[q, 0]:
                    lqS = True; lqSEq = lqSEq or hp[q, 3] > 0
                    if np.isnan(lqSLvl) or hp[q, 0] > lqSLvl: lqSLvl = hp[q, 0]; lqSRsi = hp[q, 1]
                for z in range(q, hn-1): hp[z] = hp[z+1]
                hn -= 1
            q -= 1
        if lqL:
            swLBar = i; swLExt = l[i]; swLLvl = lqLLvl; swLHigh = h[i]; swLWick = dnw[i]; swLEq = lqLEq; swLDiv = (not np.isnan(lqLRsi)) and rsiL3[i] > lqLRsi + 1.0
        elif swLBar >= 0 and i-swLBar <= swWin:
            swLExt = min(swLExt, l[i])
            if c[i] < swLLvl: swLBar = -1
        if lqS:
            swSBar = i; swSExt = h[i]; swSLvl = lqSLvl; swSLow = l[i]; swSWick = upw[i]; swSEq = lqSEq; swSDiv = (not np.isnan(lqSRsi)) and rsiH3[i] < lqSRsi - 1.0
        elif swSBar >= 0 and i-swSBar <= swWin:
            swSExt = max(swSExt, h[i])
            if c[i] > swSLvl: swSBar = -1
        inL = swLBar >= 0 and i-swLBar <= swWin; inS = swSBar >= 0 and i-swSBar <= swWin
        trigBL = inL and c[i] > o[i] and c[i] > swLLvl and ((swLWick >= 0.4 and cloc[i] >= 0.6) if i == swLBar else c[i] > h[i-1])
        trigBS = inS and c[i] < o[i] and c[i] < swSLvl and ((swSWick >= 0.4 and cloc[i] <= 0.4) if i == swSBar else c[i] < l[i-1])
        # ---- gates
        spikeOK = rng[i] <= spike*a; volatOK = a >= atrBase[i]*minVol; regimeOK = adx[i] >= adxMin or er[i] >= 0.25
        if htfMode == 0: htfL = True; htfS = True
        elif htfMode == 2: htfL = h1[i] == 1 and h2[i] != -1; htfS = h1[i] == -1 and h2[i] != 1
        else: htfL = h1[i] != -1; htfS = h1[i] != 1
        lockL = (not tlGate) or tl[i] == 1; lockS = (not tlGate) or tl[i] == -1
        okAL = engA and trigAL and c[i]-e21[i] <= extMax*a and spikeOK and volatOK and regimeOK and htfL and lockL
        okAS = engA and trigAS and e21[i]-c[i] <= extMax*a and spikeOK and volatOK and regimeOK and htfS and lockS
        okBL = engB and trigBL and spikeOK and volatOK and htfL and lockL
        okBS = engB and trigBS and spikeOK and volatOK and htfS and lockS
        # ---- scores
        sHtfL = (12.0 if h1[i] == 1 else 4.0 if h1[i] == 0 else 0.0) + (8.0 if h2[i] == 1 else 3.0 if h2[i] == 0 else 0.0)
        sHtfS = (12.0 if h1[i] == -1 else 4.0 if h1[i] == 0 else 0.0) + (8.0 if h2[i] == -1 else 3.0 if h2[i] == 0 else 0.0)
        sMomL = (4.0 if rsi[i] > rsi[i-1] else 0.0) + (5.0 if hist[i] > hist[i-1] else 0.0) + (6.0 if kUp[i] > 0 else 0.0)
        sMomS = (4.0 if rsi[i] < rsi[i-1] else 0.0) + (5.0 if hist[i] < hist[i-1] else 0.0) + (6.0 if kDn[i] > 0 else 0.0)
        if hasVol[i] > 0:
            vb = (4.0 if relVol[i] >= 1.0 else 0.0) + (3.0 if relVol[i] >= 1.5 else 0.0)
            sVolL = vb + (3.0 if deltaE[i] > 0 else 0.0); sVolS = vb + (3.0 if deltaE[i] < 0 else 0.0)
        else: sVolL = 6.0; sVolS = 6.0
        sBody = 3.0 if body[i] >= 0.5*a else 1.5 if body[i] >= 0.3*a else 0.0
        sCanL = (4.0 if cloc[i] >= 0.7 else 2.0 if cloc[i] >= 0.55 else 0.0) + sBody + (3.0 if c[i] > h[i-1] else 0.0)
        sCanS = (4.0 if cloc[i] <= 0.3 else 2.0 if cloc[i] <= 0.45 else 0.0) + sBody + (3.0 if c[i] < l[i-1] else 0.0)
        sEr = 5.0 if er[i] >= 0.30 else 2.5 if er[i] >= 0.18 else 0.0
        valRef = e200[i] if np.isnan(vw[i]) else vw[i]; vwok = not np.isnan(vw[i])
        rgA = (5.0 if adx[i] >= adxMin else 0.0) + (2.0 if adx[i] > adx[i-2] else 0.0) + sEr
        scAL = sHtfL + (4.0 if e21[i] > e50[i] else 0.0) + (4.0 if c[i] > e200[i] else 0.0) + (4.0 if stUp[i] > 0 else 0.0) + (3.0 if e50[i] > e50[i-3] else 0.0) + rgA + (3.0 if dip[i] > dim[i] else 0.0) + sMomL + (5.0 if rsi[i] > 50 else 0.0) + sVolL + (5.0 if c[i] > valRef else 0.0) + (5.0 if pbLow[i] >= e50[i]-0.25*a else 2.0) + sCanL
        scAS = sHtfS + (4.0 if e21[i] < e50[i] else 0.0) + (4.0 if c[i] < e200[i] else 0.0) + (4.0 if stUp[i] <= 0 else 0.0) + (3.0 if e50[i] < e50[i-3] else 0.0) + rgA + (3.0 if dim[i] > dip[i] else 0.0) + sMomS + (5.0 if rsi[i] < 50 else 0.0) + sVolS + (5.0 if c[i] < valRef else 0.0) + (5.0 if pbHigh[i] <= e50[i]+0.25*a else 2.0) + sCanS
        scBL = sHtfL + (5.0 if swLWick >= 0.5 else 3.0 if swLWick >= 0.3 else 0.0) + (4.0 if swLEq else 0.0) + (3.0 if c[i] > swLHigh else 0.0) + (3.0 if (swLBar >= 0 and i-swLBar <= 1) else 0.0) \
             + (6.0 if rsiLo[i] < 30 else 4.0 if rsiLo[i] < 38 else 0.0) + (5.0 if swLDiv else 0.0) + (4.0 if (lo5[i] <= e21[i]-2*a or (vwok and lo5[i] <= vwL[i])) else 0.0) \
             + sMomL + (5.0 if rsiLo[i] < 38 else 0.0) + sVolL + (5.0 if c[i] < rngMid[i] else 0.0) + (5.0 if e21[i]-c[i] >= 0.8*a else 0.0) + sCanL
        scBS = sHtfS + (5.0 if swSWick >= 0.5 else 3.0 if swSWick >= 0.3 else 0.0) + (4.0 if swSEq else 0.0) + (3.0 if c[i] < swSLow else 0.0) + (3.0 if (swSBar >= 0 and i-swSBar <= 1) else 0.0) \
             + (6.0 if rsiHi[i] > 70 else 4.0 if rsiHi[i] > 62 else 0.0) + (5.0 if swSDiv else 0.0) + (4.0 if (hi5[i] >= e21[i]+2*a or (vwok and hi5[i] >= vwU[i])) else 0.0) \
             + sMomS + (5.0 if rsiHi[i] > 62 else 0.0) + sVolS + (5.0 if c[i] > rngMid[i] else 0.0) + (5.0 if c[i]-e21[i] >= 0.8*a else 0.0) + sCanS
        longScore = 0.0; longEng = 0; shortScore = 0.0; shortEng = 0
        if okAL and scAL >= minScore: longScore = scAL; longEng = 1
        if okBL and scBL >= minScore and scBL > longScore: longScore = scBL; longEng = 2
        if okAS and scAS >= minScore: shortScore = scAS; shortEng = 1
        if okBS and scBS >= minScore and scBS > shortScore: shortScore = scBS; shortEng = 2
        sigDir = 1 if (longScore > 0 and longScore >= shortScore) else (-1 if shortScore > 0 else 0)
        # ---- manage open trade
        closed = False; exitPx = 0.0
        if tdir != 0 and i > tbar:
            stopHit = l[i] <= tsl if tdir == 1 else h[i] >= tsl
            if stopHit:
                exitPx = (min(tsl, o[i]) if tdir == 1 else max(tsl, o[i])); closed = True
            else:
                if stage == 0 and (h[i] >= tp1 if tdir == 1 else l[i] <= tp1):
                    stage = 1; realR += p1*rr1; rem -= p1
                    if be: tsl = tentry
                if stage == 1 and rem > 1e-4 and (h[i] >= tp2 if tdir == 1 else l[i] <= tp2):
                    stage = 2; realR += p2*rr2; rem -= p2
                    if trail: tsl = tp1
                if stage == 2 and rem > 1e-4 and (h[i] >= tp3 if tdir == 1 else l[i] <= tp3):
                    stage = 3; realR += rem*rr3; rem = 0.0
                if rem <= 1e-4: rem = 0.0; exitPx = tentry; closed = True
        if closed:
            r = realR + rem*tdir*(exitPx-tentry)/trisk
            out[nt, 0] = tbar; out[nt, 1] = tdir; out[nt, 2] = teng; out[nt, 3] = tscore; out[nt, 4] = r; out[nt, 5] = trisk/tentry; out[nt, 6] = stage; out[nt, 7] = i; nt += 1
            dayNet += r; tdir = 0
            if (dayTP > 0 and dayNet >= dayTP) or (daySL > 0 and dayNet <= -daySL): dayLock = True
        # ---- new signal
        if sigDir != 0 and i-lastSig >= cool and not dayLock:
            blocked = tdir != 0 and not ((reentry and stage >= 1) or (rev and tdir != sigDir))
            eng = longEng if sigDir == 1 else shortEng; sc = longScore if sigDir == 1 else shortScore
            base = (swLExt if eng == 2 else loN[i]) if sigDir == 1 else (swSExt if eng == 2 else hiN[i])
            risk = max(min(abs(c[i]-base) + slBuf*a, maxRisk*a), minRisk*a)
            if risk/c[i]*100 < minRiskPct: blocked = True      # stop too tight relative to the spread
            if not blocked:
                if tdir != 0:
                    r = realR + rem*tdir*(c[i]-tentry)/trisk
                    out[nt, 0] = tbar; out[nt, 1] = tdir; out[nt, 2] = teng; out[nt, 3] = tscore; out[nt, 4] = r; out[nt, 5] = trisk/tentry; out[nt, 6] = stage; out[nt, 7] = i; nt += 1
                    dayNet += r
                tdir = sigDir; tbar = i; tentry = c[i]; trisk = risk; tsl = c[i]-sigDir*risk; teng = eng; tscore = sc
                tp1 = c[i]+sigDir*risk*rr1; tp2 = c[i]+sigDir*risk*rr2; tp3 = c[i]+sigDir*risk*rr3; stage = 0; rem = 1.0; realR = 0.0; lastSig = i
                if sigDir == 1: lastAL = i; swLBar = -1
                else: lastAS = i; swSBar = -1
    return out[:nt]

DEF = dict(minScore=68.0, engA=True, engB=True, tlGate=True, htfMode=1, rr1=1.0, rr2=2.0, rr3=3.0, p1=0.5, p2=0.3, be=True, trail=True, reentry=True, rev=True, cool=3,
           slBuf=0.15, minRisk=0.6, maxRisk=2.5, adxMin=20.0, minVol=0.7, spike=3.0, extMax=1.6, pbWin=6, swWin=4, eqTol=0.10, pbTol=0.10, dayTP=0.0, daySL=0.0, minRiskPct=0.0)
KEYS = ['o','h','l','c','atr','atrBase','e9','e21','e50','e200','stUp','dip','dim','adx','er','rsi','hist','kUp','kDn','rsiLo','rsiHi','rsiL3','rsiH3','rng','body','cloc','dnw','upw','hasVol','relVol','deltaE','vw','vwU','vwL','loN','hiN','pbLow','pbHigh','lo5','hi5','rngMid','ph','pl','rsiPivLo','rsiPivHi','h1','h2','tl']
def trades(df, A, cost_pct=0.0, **kw):
    P = dict(DEF); P.update(kw)
    day = (df.index.as_unit('ns').asi8 // (86400*10**9)).astype(np.int64)
    out = run(*[A[k] for k in KEYS], P['minScore'], P['engA'], P['engB'], P['tlGate'], P['htfMode'], P['rr1'], P['rr2'], P['rr3'], P['p1'], P['p2'], P['be'], P['trail'], P['reentry'], P['rev'], P['cool'],
              P['slBuf'], P['minRisk'], P['maxRisk'], P['adxMin'], P['minVol'], P['spike'], P['extMax'], P['pbWin'], P['swWin'], P['eqTol'], P['pbTol'], day, P['dayTP'], P['daySL'], P['minRiskPct'])
    T = pd.DataFrame(out, columns=['bar', 'dir', 'eng', 'score', 'R', 'riskfrac', 'stage', 'xbar'])
    T['t'] = df.index[T.bar.astype(int)]; T['net'] = T.R - cost_pct/100/T.riskfrac
    return T.set_index('t')
def stats(T, col='net'):
    if len(T) == 0: return 'n=0'
    d = T[col].groupby(T.index.floor('1D')).sum(); eq = T[col].cumsum()
    gw = T[col][T[col] > 0].sum(); gl = -T[col][T[col] < 0].sum()
    return 'n=%4d win=%4.1f%% gross=%+6.1fR net=%+6.1fR PF=%.2f green days=%2.0f%%/%d worst=%+.1fR DD=%.1fR' % (len(T), 100*(T.R > 0).mean(), T.R.sum(), T[col].sum(), gw/max(gl, 1e-9), 100*(d > 0).mean(), len(d), d.min(), (eq.cummax()-eq).max())
