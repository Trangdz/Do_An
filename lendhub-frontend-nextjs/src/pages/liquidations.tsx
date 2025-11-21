import React, { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { ethers } from 'ethers';
import useLendContext from '@/context/useLendContext';
import { CONFIG } from '@/config/contracts';
import { POOL_ABI, ORACLE_ABI, ERC20_ABI } from '@/config/abis';
import { Button } from '@/components/ui/Button';
import {
  User0Address,
  User1Address,
  User2Address,
  User3Address,
  User4Address,
  User5Address,
  User6Address,
  User7Address,
  User8Address,
  User9Address,
} from '@/addresses';

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

type DebtOption = {
  token: (typeof CONFIG.TOKENS)[number];
  amount: number;
  amountRaw: bigint;
  closeFactorBps: number;
};

type CollateralOption = {
  token: (typeof CONFIG.TOKENS)[number];
  amount: number;
  amountRaw: bigint;
  bonusBps: number;
};

export default function LiquidationsPage() {
  const { provider, signer, metamaskDetails } = useLendContext();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [form, setForm] = useState({
    debtAsset: CONFIG.TOKENS.find(t => t.isBorrowable)?.address || '',
    collateralAsset: CONFIG.WETH,
    repayAmount: '',
    estimate: { seizeAmount: 0, bonusBps: 0, gas: '' }
  });
  const [userDebts, setUserDebts] = useState<DebtOption[]>([]);
  const [userCollaterals, setUserCollaterals] = useState<CollateralOption[]>([]);
  const [maxRepayInfo, setMaxRepayInfo] = useState({ max: 0, closeFactorBps: 0, outstanding: 0 });
  const [modalError, setModalError] = useState('');
  const [approvalPrompt, setApprovalPrompt] = useState<{ token?: any } | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use direct RPC provider to avoid MetaMask circuit breaker issues
  const rpcProvider = useMemo(() => {
    try {
      return new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    } catch (e) {
      console.error('[Liquidation] Failed to create RPC provider:', e);
      return null;
    }
  }, []);

  const pool = useMemo(() => {
    const useProvider = rpcProvider || provider;
    return useProvider ? new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, useProvider) : null;
  }, [rpcProvider, provider]);
  
  const oracle = useMemo(() => {
    const useProvider = rpcProvider || provider;
    return useProvider ? new ethers.Contract(CONFIG.PRICE_ORACLE, ORACLE_ABI, useProvider) : null;
  }, [rpcProvider, provider]);

  const formatAmount = (value: number, fraction = 4) => {
    if (!Number.isFinite(value)) return '0';
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: fraction,
    });
  };

  const debtTokenSelected = useMemo(() => {
    return CONFIG.TOKENS.find(t => t.address.toLowerCase() === form.debtAsset.toLowerCase());
  }, [form.debtAsset]);

  const collateralTokenSelected = useMemo(() => {
    return CONFIG.TOKENS.find(t => t.address.toLowerCase() === form.collateralAsset.toLowerCase());
  }, [form.collateralAsset]);

  const debtInfoSelected = useMemo(() => {
    return userDebts.find(d => d.token.address.toLowerCase() === form.debtAsset.toLowerCase());
  }, [userDebts, form.debtAsset]);

  const collateralInfoSelected = useMemo(() => {
    return userCollaterals.find(c => c.token.address.toLowerCase() === form.collateralAsset.toLowerCase());
  }, [userCollaterals, form.collateralAsset]);

  useEffect(() => {
    const useProvider = rpcProvider || provider;
    if (!useProvider || !pool) {
      console.log('[Liquidation] Waiting for provider/pool...', { hasProvider: !!useProvider, hasPool: !!pool });
      return;
    }
    let cancelled = false;
    
    const fetchCandidates = async () => {
      try {
        setLoading(true);
        const users = new Set<string>();
        
        // 1) Lấy danh sách borrower từ sự kiện Borrowed từ block 0 (để tìm TẤT CẢ users)
        const current = await useProvider.getBlockNumber();
        const iface = new ethers.Interface(POOL_ABI);
        const borrowedTopic = iface.getEvent('Borrowed').topicHash;
        const repaidTopic = iface.getEvent('Repaid').topicHash;
        
        try {
          // Scan ALL Borrowed events from block 0
          const borrowedLogs = await useProvider.getLogs({
            address: CONFIG.LENDING_POOL,
            topics: [borrowedTopic],
            fromBlock: 0, // Scan from deployment
            toBlock: current
          });
          console.log(`[Liquidation] Found ${borrowedLogs.length} Borrowed events`);
          
          for (const log of borrowedLogs) {
            try {
              const parsed = iface.parseLog(log);
              const user = (parsed.args.user as string).toLowerCase();
              users.add(user);
            } catch (e) {
              console.warn('[Liquidation] Error parsing Borrowed log:', e);
            }
          }

          // Also scan Repaid events to find users who might still have debt
          const repaidLogs = await useProvider.getLogs({
          address: CONFIG.LENDING_POOL,
            topics: [repaidTopic],
            fromBlock: 0,
          toBlock: current
        });
          console.log(`[Liquidation] Found ${repaidLogs.length} Repaid events`);
          
          for (const log of repaidLogs) {
            try {
          const parsed = iface.parseLog(log);
              const user = (parsed.args.user as string).toLowerCase();
              const onBehalfOf = (parsed.args.onBehalfOf as string).toLowerCase();
              users.add(user);
              users.add(onBehalfOf);
            } catch (e) {
              console.warn('[Liquidation] Error parsing Repaid log:', e);
            }
          }
        } catch (e) {
          console.error('[Liquidation] Error fetching events:', e);
        }

        // 2) Thêm user hiện tại đang kết nối (quan trọng!)
        if (metamaskDetails?.currentAccount) {
          users.add(metamaskDetails.currentAccount.toLowerCase());
        }

        // 3) Thêm các demo users từ addresses.js (nếu có)
        const demoUsers = [
          User0Address,
          User1Address,
          User2Address,
          User3Address,
          User4Address,
          User5Address,
          User6Address,
          User7Address,
          User8Address,
          User9Address,
        ].filter(addr => addr && addr !== '0x0000000000000000000000000000000000000000');
        
        console.log(`[Liquidation] Adding ${demoUsers.length} demo users:`, demoUsers.map(a => a.slice(0, 10) + '...'));
        demoUsers.forEach(addr => {
          if (addr) {
            users.add(addr.toLowerCase());
            console.log(`[Liquidation] Added demo user: ${addr}`);
          }
        });

        console.log(`[Liquidation] Total users to check: ${users.size}`);

        // 4) Kiểm tra tất cả users và chỉ lấy những user có debt > 0
        const list: Candidate[] = [];
        let checkedCount = 0;
        let errorCount = 0;
        
        for (const user of Array.from(users)) {
          try {
          const [coll, debt, hf] = await pool.getAccountData(user);
          const hfNum = Number(ethers.formatUnits(hf, 18));
          const collNum = Number(ethers.formatUnits(coll, 18));
          const debtNum = Number(ethers.formatUnits(debt, 18));
            
            checkedCount++;
            
            // Log tất cả users có debt để debug
            if (debtNum > 0.000001) {
              console.log(`[Liquidation] User ${user.slice(0, 10)}...: Debt=$${debtNum.toFixed(2)}, HF=${hfNum.toFixed(4)}`);
          list.push({ user, healthFactor: hfNum, collateralUSD: collNum, debtUSD: debtNum });
              if (hfNum < 1.0) {
                console.log(`[Liquidation] 🔴🔴🔴 LIQUIDATABLE: ${user} - HF=${hfNum.toFixed(4)}, Debt=$${debtNum.toFixed(2)}`);
              }
            }
          } catch (e: any) {
            errorCount++;
            // Log errors để debug
            console.warn(`[Liquidation] Error checking user ${user}:`, e?.message || e);
          }
        }
        
        console.log(`[Liquidation] Checked ${checkedCount} users, ${errorCount} errors, ${list.length} with debt, ${list.filter(c => c.healthFactor < 1.0).length} liquidatable`);
        
        if (!cancelled) {
          setCandidates(list.sort((a, b) => a.healthFactor - b.healthFactor));
        }
      } catch (error) {
        console.error('Error fetching liquidation candidates:', error);
        if (!cancelled) setCandidates([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Initial fetch
    fetchCandidates();
    
    // Auto-refresh every 15 seconds
    const intervalId = setInterval(fetchCandidates, 15000);
    
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [rpcProvider, provider, pool, metamaskDetails?.currentAccount]);

  const risky = useMemo(() => candidates.filter(c => c.healthFactor < 1.0), [candidates]);

  async function openLiquidate(user: string) {
    setModal({ open: true, user });
    setModalError('');
    // reset estimate
    setForm(s => ({ ...s, repayAmount: '', estimate: { seizeAmount: 0, bonusBps: 0, gas: '' } }));
    if (!pool) return;

    try {
      const tokens = CONFIG.TOKENS.filter(t => !t.isNative);
      const rows = await Promise.all(tokens.map(async (token) => {
        const address = token.address;
        try {
          const [userReserve, reserveData, supplyBalance, debtBalance] = await Promise.all([
            pool.userReserves(user, address),
            pool.reserves(address),
            pool.getCurrentSupplyBalance(user, address).catch(() => 0n),
            pool.getCurrentDebtBalance(user, address).catch(() => 0n),
          ]);

          const supplyNum = Number(ethers.formatUnits(supplyBalance ?? 0n, 18));
          const debtNum = Number(ethers.formatUnits(debtBalance ?? 0n, 18));
          const closeFactorBps = Number(reserveData.closeFactorBps ?? 0);
          const bonusBps = Number(reserveData.liqBonusBps ?? 0);

          return {
            token,
            supplyNum,
            debtNum,
            supplyRaw: supplyBalance ?? 0n,
            debtRaw: debtBalance ?? 0n,
            closeFactorBps,
            bonusBps,
            useAsCollateral: Boolean(userReserve.useAsCollateral),
          };
        } catch (err) {
          console.warn('[Liquidation] Failed to load token info for', token.symbol, err);
          return null;
        }
      }));

      const debts: DebtOption[] = rows
        .filter(row => row && row.debtNum > 0.000001 && row.token.isBorrowable)
        .map((row) => ({
          token: row!.token,
          amount: row!.debtNum,
          amountRaw: row!.debtRaw,
          closeFactorBps: row!.closeFactorBps,
        }));

      const collateralOptions: CollateralOption[] = rows
        .filter(row => row && row.supplyNum > 0.000001 && row.useAsCollateral)
        .map((row) => ({
          token: row!.token,
          amount: row!.supplyNum,
          amountRaw: row!.supplyRaw,
          bonusBps: row!.bonusBps,
        }));

      setUserDebts(debts);
      setUserCollaterals(collateralOptions);

      const defaultDebt = debts[0]?.token.address || '';
      const defaultColl = collateralOptions[0]?.token.address || '';
      setForm(s => ({
        ...s,
        debtAsset: defaultDebt || s.debtAsset,
        collateralAsset: defaultColl || s.collateralAsset,
        repayAmount: '',
        estimate: { seizeAmount: 0, bonusBps: 0, gas: '' }
      }));

      if (defaultDebt) {
        await refreshMaxRepay(user, defaultDebt, debts);
      } else {
        setMaxRepayInfo({ max: 0, closeFactorBps: 0, outstanding: 0 });
      }
    } catch (error) {
      console.error('[Liquidation] Failed to load user positions', error);
    }
  }

  async function refreshMaxRepay(user: string, debtAsset: string, cachedDebts?: DebtOption[]) {
    const debtToken = CONFIG.TOKENS.find(t => t.address.toLowerCase() === debtAsset.toLowerCase());
    if (!pool || !debtToken) return;

    const debtOption = (cachedDebts || userDebts).find(d => d.token.address.toLowerCase() === debtAsset.toLowerCase());
    if (!debtOption) {
      setMaxRepayInfo({ max: 0, closeFactorBps: 0, outstanding: 0 });
      return;
    }

    const outstanding = debtOption.amount;
    const max = outstanding * (debtOption.closeFactorBps / 10000);
    setMaxRepayInfo({
      max,
      closeFactorBps: debtOption.closeFactorBps,
      outstanding,
    });

    setForm(s => {
      const sanitizedRepay = s.repayAmount && Number(s.repayAmount) > max
        ? max.toString()
        : s.repayAmount;
      return {
        ...s,
        repayAmount: sanitizedRepay,
      };
    });
  }

  function handleDebtAssetChange(address: string) {
    setForm(s => ({
      ...s,
      debtAsset: address,
      repayAmount: '',
      estimate: { seizeAmount: 0, bonusBps: 0, gas: '' }
    }));
    setModalError('');
    if (modal.user) {
      refreshMaxRepay(modal.user, address);
    }
  }

  function handleCollateralChange(address: string) {
    setForm(s => ({
      ...s,
      collateralAsset: address,
      estimate: { seizeAmount: 0, bonusBps: 0, gas: '' }
    }));
    setModalError('');
  }

  async function estimateSeize() {
    if (!pool || !oracle || !modal.user) return;
    try {
      const repayRaw = Number(form.repayAmount || '0');
      if (repayRaw <= 0) {
        setForm(s => ({ ...s, estimate: { seizeAmount: 0, bonusBps: 0, gas: '' } }));
        return;
      }

      const debtToken = CONFIG.TOKENS.find(t => t.address.toLowerCase() === form.debtAsset.toLowerCase());
      const collateralToken = CONFIG.TOKENS.find(t => t.address.toLowerCase() === form.collateralAsset.toLowerCase());
      if (!debtToken || !collateralToken) return;

      const currentDebtInfo = userDebts.find(d => d.token.address.toLowerCase() === debtToken.address.toLowerCase());
      if (maxRepayInfo.max > 0 && repayRaw > maxRepayInfo.max + 1e-12) {
        setModalError(`Số tiền vượt close factor (${(maxRepayInfo.closeFactorBps / 100).toFixed(2)}% của ${maxRepayInfo.outstanding.toFixed(4)} ${debtToken.symbol})`);
        return;
      }
      setModalError('');

      const collateralInfo = userCollaterals.find(c => c.token.address.toLowerCase() === collateralToken.address.toLowerCase());
      const bonusBps = collateralInfo?.bonusBps ?? Number((await pool.reserves(collateralToken.address)).liqBonusBps ?? 0);

      const [priceDebtRaw, priceCollRaw] = await Promise.all([
        oracle.getAssetPrice1e18(debtToken.address),
        oracle.getAssetPrice1e18(collateralToken.address),
      ]);

      const priceDebt = Number(ethers.formatUnits(priceDebtRaw, 18));
      const priceColl = Number(ethers.formatUnits(priceCollRaw, 18));

      const repayUsd = repayRaw * priceDebt;
      const seizeUsd = repayUsd * (1 + bonusBps / 10000);
      const seizeTokens = priceColl > 0 ? seizeUsd / priceColl : 0;

      setForm(s => ({ ...s, estimate: { seizeAmount: seizeTokens, bonusBps, gas: '' } }));
    } catch {}
  }

  function extractErrorMessage(error: any): string {
    if (!error) return 'Giao dịch thất bại';
    if (error?.error?.data?.message) return error.error.data.message;
    if (error?.info?.error?.message) return error.info.error.message;
    if (error?.shortMessage) return error.shortMessage;
    if (error?.message) return error.message;
    return 'Giao dịch thất bại';
  }

  async function onConfirmLiquidate() {
    if (!modal.user || isSubmitting) return;
    if (!metamaskDetails?.currentAccount) {
      setModalError('Vui lòng kết nối ví trước khi thanh lý');
      return;
    }
    if (!signer) {
      setModalError('Không tìm thấy signer từ MetaMask. Hãy connect lại ví của bạn.');
      return;
    }
    const poolWithSigner = new ethers.Contract(CONFIG.LENDING_POOL, POOL_ABI, signer);
    // parse repayAmount as token amount of debtAsset
    const debtToken = CONFIG.TOKENS.find(t => t.address.toLowerCase() === form.debtAsset.toLowerCase());
    if (!debtToken) return;
    const repayNumeric = Number(form.repayAmount || '0');
    if (repayNumeric <= 0) {
      setModalError('Vui lòng nhập số tiền muốn trả giúp');
      return;
    }
    if (maxRepayInfo.max > 0 && repayNumeric > maxRepayInfo.max + 1e-12) {
      setModalError(`Số tiền vượt close factor (${(maxRepayInfo.closeFactorBps / 100).toFixed(2)}%)`);
      return;
    }

    const repayParsed = ethers.parseUnits(form.repayAmount || '0', debtToken.decimals);

    // Ensure borrower is still liquidatable
    try {
      const [, , hfRaw] = await poolWithSigner.getAccountData(modal.user);
      const hfCurrent = Number(ethers.formatUnits(hfRaw, 18));
      if (!(Number.isFinite(hfCurrent) && hfCurrent < 1)) {
        setModalError(`Health factor của user hiện tại là ${hfCurrent.toFixed(2)} (>=1) nên không thể thanh lý.`);
        return;
      }
    } catch (hfError: any) {
      console.warn('[Liquidation] Could not verify HF before tx:', hfError?.message || hfError);
    }

    // Check liquidator balance & allowance for debt asset
    if (debtToken.address && debtToken.address !== ethers.ZeroAddress) {
      try {
        const erc20 = new ethers.Contract(debtToken.address, ERC20_ABI, signer);
        const liquidatorAddress = await signer.getAddress();
        const balance = await erc20.balanceOf(liquidatorAddress);
        if (balance < repayParsed) {
          const balanceDisplay = Number(ethers.formatUnits(balance, debtToken.decimals));
          setModalError(`Ví của bạn chỉ có ${balanceDisplay.toFixed(4)} ${debtToken.symbol}. Cần nắm giữ tối thiểu ${form.repayAmount || '0'} ${debtToken.symbol} để thanh lý.`);
          setApprovalPrompt(null);
          return;
        }

        const allowance = await erc20.allowance(liquidatorAddress, CONFIG.LENDING_POOL);
        if (allowance < repayParsed) {
          const allowanceDisplay = Number(ethers.formatUnits(allowance, debtToken.decimals));
          setModalError(`Cần approve ${debtToken.symbol} cho LendingPool trước. Allowance hiện tại là ${allowanceDisplay.toFixed(4)} ${debtToken.symbol}.`);
          setApprovalPrompt({ token: debtToken });
          return;
        }
        setApprovalPrompt(null);
      } catch (assetCheckError: any) {
        console.warn('[Liquidation] ERC20 checks failed:', assetCheckError?.message || assetCheckError);
      }
    }
    // Pre-validate collateral sufficiency before sending tx
    try {
      const collateralToken = CONFIG.TOKENS.find(t => t.address.toLowerCase() === form.collateralAsset.toLowerCase());
      if (collateralToken && oracle) {
        const [priceDebtRaw, priceCollRaw] = await Promise.all([
          oracle.getAssetPrice1e18(form.debtAsset),
          oracle.getAssetPrice1e18(form.collateralAsset),
        ]);
        const priceDebt = Number(ethers.formatUnits(priceDebtRaw, 18));
        const priceColl = Number(ethers.formatUnits(priceCollRaw, 18));
        const repayUsd = repayNumeric * priceDebt;
        const collateralInfo = userCollaterals.find(c => c.token.address.toLowerCase() === collateralToken.address.toLowerCase());
        const bonusBps = collateralInfo?.bonusBps ?? 0;
        const seizeUsd = repayUsd * (1 + bonusBps / 10000);
        const seizeTokens = priceColl > 0 ? seizeUsd / priceColl : 0;
        
        // Check if borrower has enough collateral
        const borrowerCollateral = userCollaterals.find(c => c.token.address.toLowerCase() === collateralToken.address.toLowerCase());
        if (borrowerCollateral && seizeTokens > borrowerCollateral.amount + 0.000001) {
          setModalError(`Không đủ collateral để thanh lý. Cần ${seizeTokens.toFixed(4)} ${collateralToken.symbol} nhưng borrower chỉ có ${borrowerCollateral.amount.toFixed(4)} ${collateralToken.symbol}.`);
          setIsSubmitting(false);
          return;
        }
      }
    } catch (preCheckError: any) {
      console.warn('[Liquidation] Pre-validation failed:', preCheckError?.message || preCheckError);
    }

    try {
      setIsSubmitting(true);
      console.log('[Liquidation] Sending transaction', {
        debtAsset: form.debtAsset,
        collateralAsset: form.collateralAsset,
        repayAmount: form.repayAmount,
        user: modal.user,
        signer: await signer.getAddress().catch(() => 'unknown'),
      });
      setModalError('');
      
      // Try to estimate gas first to get better error message
      let estimatedGas;
      try {
        estimatedGas = await poolWithSigner.liquidationCall.estimateGas(
          form.debtAsset,
          form.collateralAsset,
          modal.user,
          repayParsed
        );
        console.log('[Liquidation] Gas estimate:', estimatedGas.toString());
      } catch (gasError: any) {
        console.error('[Liquidation] Gas estimation failed:', gasError);
        // Try to extract revert reason
        if (gasError?.reason || gasError?.message) {
          const reason = gasError.reason || gasError.message;
          if (reason.includes('HF>=') || reason.includes('HF>=')) {
            setModalError('Health factor của borrower đã >= 1, không thể thanh lý.');
          } else if (reason.includes('insufficient collateral')) {
            setModalError('Borrower không có đủ collateral để thanh lý số tiền này.');
          } else if (reason.includes('pool coll cash low')) {
            setModalError('Pool không có đủ collateral cash. Vui lòng thử lại sau.');
          } else {
            setModalError(`Giao dịch không thể thực hiện: ${reason}`);
          }
          setIsSubmitting(false);
          return;
        }
        // If gas estimation fails but no clear reason, proceed anyway (might be a gas estimation issue)
      }
      
      const tx = await poolWithSigner.liquidationCall(
        form.debtAsset,
        form.collateralAsset,
        modal.user,
        repayParsed,
        estimatedGas ? { gasLimit: estimatedGas * BigInt(120) / BigInt(100) } : undefined // Add 20% buffer
      );
    await tx.wait();
    setModal({ open: false });
      setIsSubmitting(false);
    } catch (error: any) {
      console.error('[Liquidation] transaction failed', error);
      const errorMsg = extractErrorMessage(error);
      // Improve error messages for common cases
      if (errorMsg.includes('HF>=') || errorMsg.includes('HF>=')) {
        setModalError('Health factor của borrower đã >= 1, không thể thanh lý.');
      } else if (errorMsg.includes('insufficient collateral') || errorMsg.includes('collateral')) {
        setModalError('Borrower không có đủ collateral để thanh lý số tiền này. Hãy giảm số tiền thanh lý.');
      } else if (errorMsg.includes('pool coll cash low') || errorMsg.includes('cash low')) {
        setModalError('Pool không có đủ collateral cash. Vui lòng thử lại sau hoặc liên hệ admin.');
      } else if (errorMsg.includes('coalesce') || errorMsg.includes('Internal JSON-RPC')) {
        setModalError('Giao dịch bị từ chối bởi contract. Có thể do: (1) HF đã >= 1, (2) Không đủ collateral, hoặc (3) Pool thiếu liquidity. Vui lòng kiểm tra lại.');
      } else {
        setModalError(errorMsg);
      }
      setIsSubmitting(false);
    }
  }

  async function handleApproveDebtToken() {
    if (!approvalPrompt?.token || !signer) return;
    try {
      setIsApproving(true);
      const erc20 = new ethers.Contract(approvalPrompt.token.address, ERC20_ABI, signer);
      const tx = await erc20.approve(CONFIG.LENDING_POOL, ethers.MaxUint256);
      await tx.wait();
      setModalError('');
      setApprovalPrompt(null);
      setIsApproving(false);
      // Approval successful - user can now retry liquidation
      // The allowance check will be re-run when they click "Xác nhận" again
    } catch (error: any) {
      console.error('[Liquidation] Approve failed:', error);
      setModalError(extractErrorMessage(error));
      setIsApproving(false);
    }
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
                    <div className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
                      <span>Debt Asset</span>
                      <span className="text-[11px]">Đơn vị: {debtTokenSelected?.symbol || '—'}</span>
                    </div>
                    <select className="w-full bg-background border border-border rounded-md px-3 py-2 text-base font-medium"
                      value={form.debtAsset}
                      onChange={(e) => handleDebtAssetChange(e.target.value)}
                    >
                      {userDebts.length === 0 && (
                        <option value="">Không có khoản nợ nào</option>
                      )}
                      {userDebts.map(d => (
                        <option key={d.token.address} value={d.token.address}>
                          {d.token.symbol}
                        </option>
                      ))}
                    </select>
                    <div className="bg-muted rounded-md px-3 py-2 mt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground uppercase">
                        <span>Nợ hiện tại</span>
                        <span>Close factor</span>
                      </div>
                      <div className="flex items-center justify-between text-foreground">
                        <span className="text-lg font-semibold">
                          {formatAmount(maxRepayInfo.outstanding)} {debtTokenSelected?.symbol || ''}
                        </span>
                        <span className="text-lg font-semibold">
                          {(maxRepayInfo.closeFactorBps / 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Tối đa có thể trả giúp: <span className="font-medium text-foreground">{formatAmount(maxRepayInfo.max)} {debtTokenSelected?.symbol || ''}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
                      <span>Collateral Asset</span>
                      <span className="text-[11px]">Đơn vị: {collateralTokenSelected?.symbol || '—'}</span>
                    </div>
                    <select className="w-full bg-background border border-border rounded-md px-3 py-2 text-base font-medium"
                      value={form.collateralAsset}
                      onChange={(e) => handleCollateralChange(e.target.value)}
                    >
                      {userCollaterals.length === 0 && (
                        <option value="">Không có tài sản thế chấp</option>
                      )}
                      {userCollaterals.map(c => (
                        <option key={c.token.address} value={c.token.address}>
                          {c.token.symbol}
                        </option>
                      ))}
                    </select>
                    <div className="bg-muted rounded-md px-3 py-2 mt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground uppercase">
                        <span>Số lượng đang thế chấp</span>
                        <span>Collateral bonus</span>
                      </div>
                      <div className="flex items-center justify-between text-foreground">
                        <span className="text-lg font-semibold">
                          {formatAmount(collateralInfoSelected?.amount || 0)} {collateralTokenSelected?.symbol || ''}
                        </span>
                        <span className="text-lg font-semibold">
                          {((collateralInfoSelected?.bonusBps || 0) / 100).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
                    <span>Repay amount</span>
                    <span className="text-[11px]">Đơn vị nhập: {debtTokenSelected?.symbol || '—'}</span>
                  </div>
                  <input className="w-full bg-background border border-border rounded-md px-3 py-3 text-lg font-semibold tracking-wide"
                    placeholder="0.0"
                    value={form.repayAmount}
                    onChange={(e) => setForm(s => ({ ...s, repayAmount: e.target.value }))}
                    onBlur={estimateSeize}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Giới hạn close factor: {(maxRepayInfo.closeFactorBps / 100).toFixed(2)}% ⇒ tối đa {formatAmount(maxRepayInfo.max)} {debtTokenSelected?.symbol || ''}
                </div>
                {modalError && (
                  <div className="text-xs text-red-500 flex flex-col gap-2">
                    <span>{modalError}</span>
                    {approvalPrompt?.token && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleApproveDebtToken}
                        disabled={isApproving}
                      >
                        {isApproving ? 'Đang approve...' : `Approve ${approvalPrompt.token.symbol}`}
                      </Button>
                    )}
                  </div>
                )}
                <div className="bg-muted rounded-md px-3 py-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground uppercase mb-1">
                    <span>Ước tính nhận về</span>
                    <span>Bonus ~ {form.estimate.bonusBps} bps</span>
                  </div>
                  <div className="text-2xl font-semibold text-foreground">
                    {formatAmount(form.estimate.seizeAmount, 6)} {collateralTokenSelected?.symbol || ''}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-2">
                <Button variant="secondary" onClick={() => setModal({ open: false })} disabled={isSubmitting}>Hủy</Button>
                <Button onClick={onConfirmLiquidate} disabled={isSubmitting}>
                  {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


