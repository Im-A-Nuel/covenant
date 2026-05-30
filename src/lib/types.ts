import type { Address, Hex } from "viem";

export type CovenantStatus = "active" | "expired" | "revoked" | "depleted";

export interface Covenant {
  id: string;
  user: Address | string;
  agent: string;
  token: "USDC";
  totalBudget: number;
  remainingBudget: number;
  durationHours: number;
  maxPerRequest: number;
  allowedServices: string[];
  purpose: string;
  createdAt: string;
  expiresAt: string;
  status: CovenantStatus;
  /** On-chain delegation metadata (ERC-7710) */
  delegation?: SignedDelegationMeta;
  smartAccount?: Address;
  /** Display-only accent color for seed/UI cards. */
  color?: string;
  /** Number of payments made under this covenant (seed/UI). */
  payments?: number;
}

export interface SignedDelegationMeta {
  /** The signed ERC-7710 delegation object (serialized) */
  delegation: SerializableDelegation;
  signature: Hex;
  delegationManager: Address;
  chainId: number;
  /** "real" = signed via MetaMask smart account, "simulated" = no wallet */
  mode: "real" | "simulated";
}

/** Delegation with bigints stringified for storage/transport */
export interface SerializableDelegation {
  delegator: Address;
  delegate: Address;
  authority: Hex;
  caveats: { enforcer: Address; terms: Hex; args: Hex }[];
  salt: string;
  signature?: Hex;
}

export type PaymentDecision = "approved" | "blocked" | "needs_user";

export interface PaymentCheck {
  label: string;
  ok: boolean;
  detail: string;
}

export interface PaymentRequest {
  id: string;
  service: string;
  resource: string;
  price: number;
  token: "USDC";
  payTo: Address | string;
  purpose: string;
  scheme: string;
  network: string;
  /** Seller is a verified x402 service (from the 402 envelope's `extra.verified`). */
  verified: boolean;
  raw402?: unknown;
}

export interface PolicyResult {
  decision: PaymentDecision;
  checks: PaymentCheck[];
  reason: string;
}

export type ExecMode = "real" | "simulated";

export interface AuditEntry {
  id: string;
  covenantId: string;
  task: string;
  agent: string;
  service: string;
  resource: string;
  amount: number;
  decision: PaymentDecision;
  reason: string;
  transactionHash?: string;
  execMode: ExecMode;
  remainingBudget: number;
  status: "completed" | "blocked" | "pending";
  timestamp: string;
  /** Human-friendly relative label for seed/UI (e.g. 'just now', '4m ago'). */
  timeLabel?: string;
}

export interface AgentStep {
  id: string;
  label: string;
  detail?: string;
  status: "pending" | "running" | "done" | "blocked";
}

export interface VeniceMeta {
  model: string;
  mode: "real" | "mock";
}
