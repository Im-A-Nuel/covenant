"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck, ArrowRight, Lock, Receipt, Gauge, FileCheck2,
  Ban, CircleDollarSign, Workflow, Eye, Sparkles,
} from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.5 } }),
};

export default function Landing() {
  return (
    <>
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="relative mx-auto max-w-6xl px-4 pt-20 pb-16 text-center">
          <motion.div initial="hidden" animate="show" variants={fade}>
            <Badge tone="violet" className="mx-auto mb-6">
              <Sparkles className="h-3 w-3" /> Best x402 + ERC-7710 · Best Agent · Venice AI
            </Badge>
          </motion.div>
          <motion.h1
            custom={1} initial="hidden" animate="show" variants={fade}
            className="mx-auto max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-6xl"
          >
            Let agents pay,
            <br />
            <span className="bg-gradient-to-r from-brand to-brand-2 bg-clip-text text-transparent">
              but only under covenant.
            </span>
          </motion.h1>
          <motion.p
            custom={2} initial="hidden" animate="show" variants={fade}
            className="mx-auto mt-6 max-w-2xl text-lg text-muted"
          >
            Covenant turns wallet permissions into enforceable spending policies. AI agents pay for
            x402 services using ERC-7710 delegated permissions — within user-defined budgets, services,
            and purposes. Full wallet control never leaves your hands.
          </motion.p>
          <motion.div
            custom={3} initial="hidden" animate="show" variants={fade}
            className="mt-9 flex items-center justify-center gap-3"
          >
            <Link href="/dashboard">
              <Button size="lg">
                Launch the demo <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#how">
              <Button size="lg" variant="secondary">How it works</Button>
            </Link>
          </motion.div>

          <motion.div
            custom={4} initial="hidden" animate="show" variants={fade}
            className="mx-auto mt-14 max-w-3xl"
          >
            <FlowStrip />
          </motion.div>
        </div>
      </section>

      {/* PROBLEM */}
      <Section id="problem" title="The problem" kicker="Why agents can't just hold a wallet">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: CircleDollarSign, t: "Overspending", d: "An autonomous agent with raw wallet access can drain funds on a bad loop." },
            { icon: Ban, t: "Wrong recipients", d: "Nothing stops an agent paying an unverified or malicious service." },
            { icon: Receipt, t: "No auditability", d: "Users rarely understand why a payment happened — or whether it repeated." },
          ].map((c) => (
            <FeatureCard key={c.t} icon={c.icon} title={c.t} desc={c.d} />
          ))}
        </div>
      </Section>

      {/* HOW */}
      <Section id="how" title="How Covenant works" kicker="A payment firewall for autonomous agents">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Lock, t: "1 · Define a covenant", d: "Budget, duration, max-per-request, allowed services, and purpose — signed as an ERC-7710 delegation from your MetaMask Smart Account." },
            { icon: Workflow, t: "2 · Agent works", d: "Venice AI plans the task and calls an x402 service. The service answers 402 Payment Required." },
            { icon: Gauge, t: "3 · Policy check", d: "The engine validates the quote against the covenant: budget, limit, service, purpose, duplicates, expiry." },
            { icon: FileCheck2, t: "4 · Pay & audit", d: "If valid, the delegated permission is redeemed on-chain. Every action lands in an audit trail." },
          ].map((c) => (
            <FeatureCard key={c.t} icon={c.icon} title={c.t} desc={c.d} />
          ))}
        </div>
      </Section>

      {/* TRACKS */}
      <Section id="tracks" title="Built for the tracks" kicker="Where Covenant qualifies">
        <div className="grid gap-4 sm:grid-cols-2">
          <Track tone="violet" title="Best x402 + ERC-7710" points={["x402 402-response handler", "ERC-7710 delegated redemption", "MetaMask Smart Accounts Kit in the main flow"]} />
          <Track tone="brand" title="Best Agent" points={["Plans, decides, and pays autonomously", "Acts strictly within policy", "Produces a real risk report"]} />
          <Track tone="good" title="Best use of Venice AI" points={["Venice plans the task", "Venice reasons about paid data", "Venice writes the final report"]} />
          <Track tone="warn" title="Safety layer" points={["Off-chain policy firewall", "On-chain caveat hard cap", "Auditable, revocable, expiring"]} />
        </div>
      </Section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-surface-2 to-surface p-10 text-center">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative">
            <ShieldCheck className="mx-auto h-10 w-10 text-brand" />
            <h2 className="mt-4 text-2xl font-semibold text-ink sm:text-3xl">Covenant controls how agents spend.</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">
              Create a policy, give your agent a task, and watch it pay for paid data — safely, under rules you signed.
            </p>
            <Link href="/dashboard" className="mt-7 inline-block">
              <Button size="lg">Open the dashboard <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-faint">
        Covenant · Policy-bound x402 payments · MetaMask Smart Accounts + ERC-7710 + Venice AI
      </footer>
    </>
  );
}

function FlowStrip() {
  const steps = ["Covenant", "Agent task", "402 required", "Policy check", "ERC-7710 pay", "Audit"];
  return (
    <div className="flex items-center justify-between gap-1 rounded-2xl border border-border bg-surface/70 p-3 text-[11px] sm:text-xs">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <span className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-muted">{s}</span>
          {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-faint" />}
        </div>
      ))}
    </div>
  );
}

function Section({ id, title, kicker, children }: { id: string; title: string; kicker: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-4 py-14">
      <div className="mb-7">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">{kicker}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border bg-surface/70 p-5"
    >
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-brand">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <h3 className="mt-3 font-medium text-ink">{title}</h3>
      <p className="mt-1.5 text-sm text-muted">{desc}</p>
    </motion.div>
  );
}

function Track({ title, points, tone }: { title: string; points: string[]; tone: "brand" | "violet" | "good" | "warn" }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-5">
      <Badge tone={tone}>{title}</Badge>
      <ul className="mt-3 space-y-2">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm text-muted">
            <Eye className="mt-0.5 h-4 w-4 shrink-0 text-faint" /> {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
