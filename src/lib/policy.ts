import type { Covenant, PaymentRequest, PolicyResult, PaymentCheck, AuditEntry } from "./types";

/**
 * The Policy Engine: Covenant's payment firewall.
 * Every x402 payment request is checked against the user-defined covenant
 * BEFORE any ERC-7710 redemption is attempted.
 */
export function evaluatePolicy(
  covenant: Covenant,
  payment: PaymentRequest,
  history: AuditEntry[]
): PolicyResult {
  const checks: PaymentCheck[] = [];

  const budgetOk = payment.price <= covenant.remainingBudget;
  checks.push({
    label: "Budget remaining",
    ok: budgetOk,
    detail: `${payment.price} ≤ ${covenant.remainingBudget.toFixed(2)} USDC remaining`,
  });

  const perReqOk = payment.price <= covenant.maxPerRequest;
  checks.push({
    label: "Under max per request",
    ok: perReqOk,
    detail: `${payment.price} ≤ ${covenant.maxPerRequest} USDC limit`,
  });

  const serviceOk =
    covenant.allowedServices.length === 0 ||
    covenant.allowedServices.some(
      (s) => payment.service.includes(s) || s.includes(payment.service) || s === "*"
    );
  checks.push({
    label: "Service allowed",
    ok: serviceOk,
    detail: serviceOk ? `${payment.service} is in allow-list` : `${payment.service} not allowed`,
  });

  const verifiedOk = payment.verified;
  checks.push({
    label: "Seller verified",
    ok: verifiedOk,
    detail: verifiedOk ? "x402 service is verified" : "seller is not a verified x402 service",
  });

  const purposeOk = !covenant.purpose || covenant.purpose === payment.purpose;
  checks.push({
    label: "Purpose matches covenant",
    ok: purposeOk,
    detail: purposeOk ? `purpose "${payment.purpose}"` : `"${payment.purpose}" ≠ "${covenant.purpose}"`,
  });

  const duplicate = history.some(
    (h) =>
      h.covenantId === covenant.id &&
      h.service === payment.service &&
      h.resource === payment.resource &&
      h.status === "completed"
  );
  checks.push({
    label: "No duplicate payment",
    ok: !duplicate,
    detail: duplicate ? "identical resource already purchased" : "not a duplicate",
  });

  const active = covenant.status === "active" && new Date(covenant.expiresAt).getTime() > Date.now();
  checks.push({
    label: "Covenant active",
    ok: active,
    detail: active ? `expires ${new Date(covenant.expiresAt).toLocaleString()}` : `status: ${covenant.status}`,
  });

  const allOk = checks.every((c) => c.ok);
  const hardFail = !budgetOk || !active || duplicate || !serviceOk || !purposeOk || !verifiedOk;

  let decision: PolicyResult["decision"];
  let reason: string;
  if (allOk) {
    decision = "approved";
    reason = "All policy checks passed. Payment authorized under the covenant.";
  } else if (!perReqOk && !hardFail) {
    decision = "needs_user";
    reason = "Price exceeds the per-request limit but other checks pass, so it needs user approval.";
  } else {
    decision = "blocked";
    const failed = checks.filter((c) => !c.ok).map((c) => c.label);
    reason = `Blocked by policy: ${failed.join(", ")}.`;
  }

  return { decision, checks, reason };
}
