"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CovenantMark } from "@/components/covenant-mark";
import { useStore } from "@/lib/store";
import { useWallet } from "@/lib/wallet";
import { shortAddr } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  count?: number | string;
}

export function Sidebar() {
  const pathname = usePathname();
  const { covenants } = useStore();
  const { account } = useWallet();

  const items: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z" />,
    },
    {
      href: "/dashboard/covenants",
      label: "Covenants",
      icon: (
        <>
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M4 9h16M9 4v16" />
        </>
      ),
      count: covenants.length,
    },
    {
      href: "/dashboard/console",
      label: "Task Console",
      icon: <path d="M5 7l4 5-4 5M12 17h7" />,
    },
    {
      href: "/dashboard/audit",
      label: "Audit Log",
      icon: (
        <>
          <path d="M6 3h9l4 4v14H6zM14 3v5h5" />
          <path d="M9 13h7M9 17h5" />
        </>
      ),
    },
    {
      href: "/dashboard/services",
      label: "Services",
      icon: (
        <>
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
          <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
        </>
      ),
    },
  ];

  const walletAddr = account ? shortAddr(account) : "0x7a…3F2c";

  return (
    <aside className="side">
      <Link className="brand" href="/">
        <CovenantMark size={28} className="mark" />
        Covenant
      </Link>
      <div className="side-label">Workspace</div>
      <nav className="nav">
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} className={`navitem ${active ? "active" : ""}`} href={item.href}>
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {item.icon}
              </svg>
              {item.label}
              {item.count !== undefined && item.count !== "" ? (
                <span className="count">{item.count}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="side-foot">
        <Link className="btn btn-dark" href="/new" style={{ width: "100%" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          New covenant
        </Link>
        <div className="wallet">
          <span className="wdot"></span>
          <span className="wmeta">
            <b>{walletAddr}</b>
            <small>MetaMask Smart Account</small>
          </span>
          <span className="wnet">Base</span>
        </div>
      </div>
    </aside>
  );
}
