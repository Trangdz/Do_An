import React, { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { ethers } from 'ethers';
import useLendContext from '@/context/useLendContext';
import { CONFIG } from '@/config/contracts';
import { POOL_ABI, ORACLE_ABI } from '@/config/abis';
import { Button } from '@/components/ui/Button';

type Candidate = {
  user: string;
  healthFactor: number;
  collateralUSD: number;
  debtUSD: number;
};

type ModalState = {
  open: boolean;
  user?: string;
};

export default function LiquidationsPage() {
  const { provider, signer } = useLendContext();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [form, setForm] = useState({
    debtAsset: CONFIG.TOKENS.find(t => t.isBorrowable)?.address || '',
    collateralAsset: CONFIG.WETH,
    repayAmount: '',
    estimate: { seizeAmount: 0, bonusBps: 0, gas: '' }
  });

  const pool = useMemo(() => provider ? new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, provider) : null, [provider]);
  const oracle = useMemo(() => provider ? new ethers.Contract(CONFIG.PRICE_ORACLE, ORACLE_ABI, provider) : null, [provider]);

  useEffect(() => {
    if (!provider || !pool) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        // 1) Lấy danh sách borrower từ sự kiện Borrowed trong 5k block gần nhất
        const current = await provider.getBlockNumber();
        const fromBlock = Math.max(0, current - 5000);
        const iface = new ethers.Interface(POOL_ABI);
        const topic = iface.getEvent('Borrowed').topicHash;
        const logs = await provider.getLogs({
          address: CONFIG.LENDING_POOL,
          topics: [topic],
          fromBlock,
          toBlock: current
        });
        const users = new Set<string>();
        for (const log of logs) {
          const parsed = iface.parseLog(log);
          const user = parsed.args.user as string;
          users.add(user.toLowerCase());
        }

        const list: Candidate[] = [];
        for (const user of Array.from(users)) {
          const [coll, debt, hf] = await pool.getAccountData(user);
          const hfNum = Number(ethers.formatUnits(hf, 18));
          const collNum = Number(ethers.formatUnits(coll, 18));
          const debtNum = Number(ethers.formatUnits(debt, 18));
          list.push({ user, healthFactor: hfNum, collateralUSD: collNum, debtUSD: debtNum });
        }
        if (!cancelled) setCandidates(list.sort((a, b) => a.healthFactor - b.healthFactor));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [provider, pool]);

  const risky = useMemo(() => candidates.filter(c => c.healthFactor < 1.0), [candidates]);

  async function openLiquidate(user: string) {
    setModal({ open: true, user });
    // reset estimate
    setForm(s => ({ ...s, repayAmount: '', estimate: { seizeAmount: 0, bonusBps: 0, gas: '' } }));
  }

  async function estimateSeize() {
    if (!pool || !oracle || !modal.user) return;
    try {
      const repayRaw = Number(form.repayAmount || '0');
      if (repayRaw <= 0) return setForm(s => ({ ...s, estimate: { seizeAmount: 0, bonusBps: 0, gas: '' } }));

      // Đọc tham số reserve của collateral để lấy bonus và decimals
      const r = await pool.reserves(form.collateralAsset);
      const bonusBps = Number(r.liqBonusBps);
      const collDecimals: number = Number(r.decimals);

      // Giá
      const priceDebt = await oracle.getAssetPrice1e18(form.debtAsset);
      const priceColl = await oracle.getAssetPrice1e18(form.collateralAsset);

      // repay USD -> seize with bonus -> convert sang token số lượng
      const repayUsd = repayRaw; // đầu vào đã là USD (giả định người dùng nhập USD). Nếu nhập token thì cần parseUnits và nhân giá.
      const seizeUsd = repayUsd * (1 + bonusBps / 10000);
      const seizeTokens = seizeUsd / Number(ethers.formatUnits(priceColl, 18));

      setForm(s => ({ ...s, estimate: { seizeAmount: seizeTokens, bonusBps, gas: '' } }));
    } catch {}
  }

  async function onConfirmLiquidate() {
    if (!signer || !modal.user) return;
    const poolWithSigner = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, signer);
    // parse repayAmount as token amount of debtAsset
    const debtToken = CONFIG.TOKENS.find(t => t.address.toLowerCase() === form.debtAsset.toLowerCase());
    if (!debtToken) return;
    const repayParsed = ethers.parseUnits(form.repayAmount || '0', debtToken.decimals);
    const tx = await poolWithSigner.liquidationCall(form.debtAsset, form.collateralAsset, modal.user, repayParsed);
    await tx.wait();
    setModal({ open: false });
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Liquidation</h1>
          <p className="text-muted-foreground mt-2">Danh sách vị thế rủi ro (HF &lt; 1) trong vài nghìn block gần đây.</p>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-6 gap-2 px-4 py-3 bg-muted text-xs font-medium text-muted-foreground">
            <div>User</div>
            <div className="text-right">Health Factor</div>
            <div className="text-right">Debt (USD)</div>
            <div className="text-right">Collateral (USD)</div>
            <div className="text-right">Status</div>
            <div className="text-right">Action</div>
          </div>
          {loading && (
            <div className="px-4 py-6 text-sm text-muted-foreground">Đang tải...</div>
          )}
          {!loading && risky.length === 0 && (
            <div className="px-4 py-6 text-sm text-muted-foreground">Không có vị thế cần thanh lý.</div>
          )}
          {!loading && risky.map((c) => (
            <div key={c.user} className="grid grid-cols-6 gap-2 px-4 py-3 border-t border-border text-sm items-center">
              <div className="font-mono">{c.user.slice(0, 6)}...{c.user.slice(-4)}</div>
              <div className="text-right {c.healthFactor < 1 ? 'text-red-600' : ''}">{c.healthFactor.toFixed(2)}</div>
              <div className="text-right">{c.debtUSD.toFixed(2)}</div>
              <div className="text-right">{c.collateralUSD.toFixed(2)}</div>
              <div className="text-right">{c.healthFactor < 1 ? '🔴 Có thể thanh lý' : '—'}</div>
              <div className="text-right">
                {c.healthFactor < 1 ? (
                  <Button onClick={() => openLiquidate(c.user)}>Thanh lý</Button>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {modal.open && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-xl w-full max-w-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Xác nhận thanh lý</h2>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Borrower</div>
                  <div className="font-mono text-sm">{modal.user}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Debt Asset</div>
                    <select className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
                      value={form.debtAsset}
                      onChange={(e) => setForm(s => ({ ...s, debtAsset: e.target.value }))}
                    >
                      {CONFIG.TOKENS.filter(t => t.isBorrowable).map(t => (
                        <option key={t.address} value={t.address}>{t.symbol}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Collateral Asset</div>
                    <select className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
                      value={form.collateralAsset}
                      onChange={(e) => setForm(s => ({ ...s, collateralAsset: e.target.value }))}
                    >
                      {[CONFIG.WETH, ...CONFIG.TOKENS.filter(t => t.isCollateral && !t.isNative).map(t => t.address)].map(addr => {
                        const t = CONFIG.TOKENS.find(x => x.address.toLowerCase() === addr.toLowerCase());
                        return <option key={addr} value={addr}>{t?.symbol || 'ASSET'}</option>;
                      })}
                    </select>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Repay amount ({CONFIG.TOKENS.find(t => t.address.toLowerCase() === form.debtAsset.toLowerCase())?.symbol})</div>
                  <input className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
                    placeholder="0.0"
                    value={form.repayAmount}
                    onChange={(e) => setForm(s => ({ ...s, repayAmount: e.target.value }))}
                    onBlur={estimateSeize}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Ước tính nhận về: <span className="text-foreground font-medium">{form.estimate.seizeAmount.toFixed(6)}</span> {CONFIG.TOKENS.find(t => t.address.toLowerCase() === form.collateralAsset.toLowerCase())?.symbol} (bonus ~ {form.estimate.bonusBps} bps)
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-2">
                <Button variant="secondary" onClick={() => setModal({ open: false })}>Hủy</Button>
                <Button onClick={onConfirmLiquidate}>Xác nhận</Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


