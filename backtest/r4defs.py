DIR = ['h1','h4','m15','h1_slope','h4_slope','m15_slope','h1_dist','h4_dist','m15_dist','d9','d21','d50','d200','e21_50','e50_200','slope50','slope200','rsi_chg','rsi_chg3','hist','hist_chg','stKD','di','body','delta','ret1','ret3','ret6','ret12','ret24','ret48','ret96','ret288','dvwap','zvwap','bbz','st']
CEN = {'rsi':50,'rsi2':50,'stK':50,'h1_rsi':50,'h4_rsi':50,'m15_rsi':50,'cloc':.5,'pos20':.5,'pos50':.5,'pos100':.5,'pos288':.5}
NON = ['adx','adx_chg','er10','er20','er50','volreg','atr50_200','rng','relvol','relvol5','bbw']
def prep(F):
    X = pd.DataFrame(index=F.index)
    for c in DIR: X[c] = F[c]
    for c, m in CEN.items(): X[c] = F[c]-m
    X['wick'] = F['dnw']-F['upw']; X['streak'] = F['upstreak']-F['dnstreak']
    X['dext20'] = F['dlo20']-F['dhi20']; X['dext100'] = F['dlo100']-F['dhi100']
    dcols = list(X.columns)
    for c in NON: X[c] = F[c]
    return X, dcols
