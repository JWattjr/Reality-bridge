'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Circle, ExternalLink, HandCoins, MousePointerClick, X } from 'lucide-react'
import type { FootballMarket } from '@/lib/football-data'
import { formatUSDT, statusLabel } from '@/lib/football-data'
import { useAuthStore } from '@/store/useAuthStore'
import { useIndexPrediction, useWalletBalance } from '@/hooks/useApi'
import {
  approveAndPlacePrediction,
  claimTestUSDT,
  getFootballPredictionAddress,
  getPrivyEmbeddedXLayerWallet,
  getTestUSDTAddress,
  isXLayerContractsConfigured,
  xLayerExplorerAddress,
  type XLayerWallet,
} from '@/lib/xlayer'

export function PredictionModal({
  market,
  open,
  onClose,
  gameId,
}: {
  market: FootballMarket | null
  open: boolean
  onClose: () => void
  gameId?: string
}) {
  const auth = useAuthStore()
  const indexPredictionMutation = useIndexPrediction(auth)
  const walletAddress = auth.authenticated ? (auth.walletAddress ?? auth.userId ?? "") : "";
  const { data: walletBalances } = useWalletBalance(walletAddress);
  const [selectedOption, setSelectedOption] = useState('')
  const [stake, setStake] = useState('')
  const [status, setStatus] = useState('')
  const [txUrl, setTxUrl] = useState('')
  const [predictionId, setPredictionId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFauceting, setIsFauceting] = useState(false)

  const stakeValue = Number(stake)
  const userUsdtBalance = walletBalances?.usdt ? Number(walletBalances.usdt) : 0;
  const needsFaucet = auth.authenticated && userUsdtBalance < (stakeValue || market?.minStake || 0);
  const selected = useMemo(
    () => market?.options.find((option) => option.id === selectedOption),
    [market, selectedOption],
  )
  const configured = isXLayerContractsConfigured()
  const activeWallet = getPrivyEmbeddedXLayerWallet(auth.wallets as XLayerWallet[])
  const canBackPick = Boolean(
    market &&
    selected &&
    Number.isFinite(stakeValue) &&
    stakeValue >= market.minStake &&
    market.status === 'OPEN' &&
    configured &&
    auth.authenticated &&
    activeWallet,
  )
  const selectedLabel = useMemo(
    () => market?.options.find((option) => option.id === selectedOption)?.label,
    [market, selectedOption],
  )
  const minimumStake = market?.minStake ?? 0
  const betHelp = !selected
    ? 'Choose an outcome to continue.'
    : !stake
      ? 'Enter your USDT stake.'
      : stakeValue < minimumStake
        ? `Minimum stake is ${minimumStake} USDT.`
        : !auth.authenticated
          ? 'Connect your wallet to place this bet.'
          : !configured
            ? 'X Layer contracts are not configured yet.'
            : !activeWallet
              ? 'Privy wallet is being created. Wait a moment, then try again.'
              : 'Ready to place your bet.'

  if (!open || !market) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end bg-black/35 p-3 backdrop-blur-md sm:items-center sm:justify-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bubbly-card max-h-[92vh] w-full max-w-lg overflow-y-auto bg-white p-4 sm:p-5"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prediction-modal-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase opacity-50">
              {market.category}
            </p>
            <h2 id="prediction-modal-title" className="font-display text-2xl font-bold">{market.title}</h2>
            <p className="mt-1 text-xs font-bold opacity-60">
              {market.type === 'YES_NO'
                ? 'Tap Yes or No to choose your outcome.'
                : 'Tap one outcome to choose your pick.'}{' '}
              Then enter your USDT stake.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close prediction modal"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-primary-900 bg-bg-base"
          >
            <X size={16} />
          </button>
        </div>

        <div className="rounded-2xl border-2 border-primary-900 bg-pastel-blue/60 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold">
            <MousePointerClick size={15} />
            <span>Step 1: Choose your outcome</span>
          </div>
          <div className={`grid gap-2 ${market.type === 'YES_NO' ? 'grid-cols-2' : ''}`}>
            {market.options.map((option) => (
              <button
                type="button"
                key={option.id}
                onClick={() => {
                  setSelectedOption(option.id)
                  setStatus('')
                  setTxUrl('')
                  setPredictionId('')
                }}
                aria-pressed={selectedOption === option.id}
                className={`group flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 border-primary-900 px-3 py-3 text-left text-sm font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:-translate-y-0.5 hover:bg-pastel-yellow hover:shadow-[3px_3px_0px_0px_#312e81] ${
                  selectedOption === option.id
                    ? 'bg-primary-900 text-white shadow-none'
                    : 'bg-white'
                }`}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                    selectedOption === option.id
                      ? 'border-white bg-pastel-green text-primary-900'
                      : 'border-primary-900 bg-bg-base text-primary-900 group-hover:bg-white'
                  }`}
                >
                  {selectedOption === option.id ? <CheckCircle2 size={17} /> : <Circle size={14} />}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] font-bold opacity-65">
            Selected outcome: {selectedLabel ?? 'none yet'}
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase opacity-60">
              <HandCoins size={12} /> Step 2: USDT stake
            </span>
            <input
              type="number"
              min={market.minStake}
              value={stake}
              onChange={(event) => {
                setStake(event.target.value)
                setStatus('')
                setTxUrl('')
                setPredictionId('')
              }}
              placeholder={`Minimum ${market.minStake}`}
              className="mt-1 w-full rounded-2xl border-2 border-primary-900 bg-bg-base px-3 py-2.5 text-sm font-bold outline-none"
            />
          </label>
          <div className="rounded-2xl border-2 border-primary-900 bg-pastel-blue p-3">
            <p className="text-[10px] font-bold uppercase opacity-60">Pool</p>
            <p className="font-display text-xl font-bold">
              {formatUSDT(market.totalPool)}
            </p>
            <p className="mt-1 text-[10px] font-bold opacity-60">
              Market {statusLabel(market.status)}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border-2 border-primary-900 bg-white p-3 text-xs font-bold">
          <p>Your Bet: {selectedLabel ?? 'Choose an outcome first'}</p>
          <p className="mt-1 opacity-60">
            Correct Pick = 1 match point and 1 PvP hit. Stake size only affects pool payout.
          </p>
        </div>

        {market.status !== 'OPEN' && (
          <p className="mt-3 rounded-2xl border-2 border-amber-700 bg-amber-50 p-3 text-xs font-bold text-amber-800">
            This market is closed for new picks.
          </p>
        )}

        {configured && !auth.authenticated && (
          <p className="mt-3 rounded-2xl border-2 border-amber-700 bg-amber-50 p-3 text-xs font-bold text-amber-800">
            Connect your wallet to approve Test USDT and back this pick on X
            Layer testnet.
          </p>
        )}

        {configured && auth.authenticated && needsFaucet && (
          <p className="mt-3 rounded-2xl border-2 border-amber-700 bg-amber-50 p-3 text-xs font-bold text-amber-800">
            You do not have enough Test USDT (Balance: {userUsdtBalance.toLocaleString()} USDT). Mint some below to proceed.
          </p>
        )}

        {status && (
          <p className="mt-3 rounded-2xl border-2 border-primary-900 bg-pastel-blue p-3 text-xs font-bold">
            {status}
            {txUrl && (
              <a
                href={txUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-2 inline-flex items-center gap-1 underline"
              >
                View tx <ExternalLink size={11} />
              </a>
            )}
            {predictionId && (
              <span className="ml-2">Receipt #{predictionId}</span>
            )}
          </p>
        )}

        <p className={`mt-4 text-xs font-bold ${canBackPick ? 'text-green-700' : 'text-amber-700'}`}>
          {betHelp}
        </p>

        <button
          type="button"
          disabled={!canBackPick || isSubmitting}
          onClick={async () => {
            if (!market || !selected || !activeWallet) return
            setIsSubmitting(true)
            setStatus('Preparing X Layer bet...')
            setTxUrl('')
            try {
              const result = await approveAndPlacePrediction({
                wallet: activeWallet,
                marketId: market.chainMarketId,
                optionIndex: selected.optionIndex,
                stake,
              })
              setStatus(
                result.approvalHash
                  ? 'Approved Test USDT and placed your bet on X Layer.'
                  : 'Bet placed on X Layer.',
              )
              setTxUrl(result.explorerUrl)
              setPredictionId(result.predictionId ?? '')
              if (result.predictionId && auth.userId) {
                await indexPredictionMutation.mutateAsync({
                  chainPredictionId: result.predictionId,
                  userId: auth.userId,
                  walletAddress: auth.walletAddress,
                  gameId,
                  marketId: market.id,
                  chainMarketId: market.chainMarketId,
                  optionId: selected.id,
                  optionIndex: selected.optionIndex,
                  optionLabel: selected.label,
                  amountUSDT: stake,
                  txHash: result.predictionHash,
                }).catch(() => undefined)
              }
            } catch (error) {
              setStatus(
                error instanceof Error
                  ? error.message
                  : 'Could not place bet on X Layer.',
              )
            } finally {
              setIsSubmitting(false)
            }
          }}
          className="mt-4 w-full rounded-full border-2 border-primary-900 bg-pastel-green px-5 py-3 text-sm font-bold shadow-[3px_3px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {isSubmitting ? 'Placing Bet...' : 'Place Bet'}
        </button>

        {configured && auth.authenticated && activeWallet && needsFaucet && (
          <button
            type="button"
            disabled={isFauceting}
            onClick={async () => {
              setIsFauceting(true)
              setStatus('Claiming Test USDT...')
              setTxUrl('')
              try {
                const result = await claimTestUSDT(activeWallet)
                setStatus('Claimed 1,000 Test USDT for X Layer testing.')
                setTxUrl(result.explorerUrl)
              } catch (error) {
                setStatus(
                  error instanceof Error
                    ? error.message
                    : 'Could not claim Test USDT.',
                )
              } finally {
                setIsFauceting(false)
              }
            }}
            className="mt-2 w-full rounded-full border-2 border-primary-900 bg-white px-5 py-2.5 text-xs font-bold shadow-[2px_2px_0px_0px_#312e81] transition-all hover:translate-y-0.5 hover:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {isFauceting ? 'Claiming...' : 'Claim Test USDT'}
          </button>
        )}

        {configured && (
          <div className="mt-3 space-y-1 rounded-2xl border-2 border-primary-900 bg-bg-base p-3 text-[10px] font-bold">
            <p>
              Prediction contract:{' '}
              <a
                href={xLayerExplorerAddress(
                  getFootballPredictionAddress() ?? '',
                )}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {getFootballPredictionAddress()}
              </a>
            </p>
            <p>
              Test USDT:{' '}
              <a
                href={xLayerExplorerAddress(getTestUSDTAddress() ?? '')}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {getTestUSDTAddress()}
              </a>
            </p>
            <p>On-chain market ID: {market.chainMarketId}</p>
          </div>
        )}
      </div>
    </div>
  )
}
