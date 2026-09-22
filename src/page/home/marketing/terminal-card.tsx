// src/components/marketing/terminal-card.tsx

import { Card } from "../../../components/ui/card";

export function TerminalCard() {
  return (
    <Card className="overflow-hidden bg-[#0B1014] text-slate-100">
      <div className="flex h-11 items-center border-b border-white/10 px-4">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-white/20" />
          <span className="size-2.5 rounded-full bg-white/20" />
          <span className="size-2.5 rounded-full bg-white/20" />
        </div>
        <span className="mx-auto font-mono text-[10px] text-slate-500">
          sonic-shell — zsh
        </span>
        <span className="w-8" />
      </div>

      <pre className="overflow-x-auto p-6 font-mono text-xs leading-7 sm:text-sm">
        <code>
          <span className="text-slate-500">$</span>{" "}
          <span className="text-slate-200">
            curl -X POST https://api.halasoftware.com/v1/pay
          </span>
          {"\n"}
          {"  "}
          <span className="text-slate-500">-H</span>{" "}
          <span className="text-slate-300">
            &quot;X-API-KEY: live_vault_99...&quot;
          </span>
          {"\n"}
          {"  "}
          <span className="text-slate-500">-d</span>{" "}
          <span className="text-slate-300">{"{"}</span>
          {"\n"}
          {"    "}
          <span className="text-brand-blue-400">&quot;phone&quot;</span>
          <span className="text-slate-500">:</span>{" "}
          <span className="text-brand-green-400">&quot;255788123456&quot;</span>
          <span className="text-slate-500">,</span>
          {"\n"}
          {"    "}
          <span className="text-brand-blue-400">&quot;amount&quot;</span>
          <span className="text-slate-500">:</span>{" "}
          <span className="text-slate-200">150000</span>
          <span className="text-slate-500">,</span>
          {"\n"}
          {"    "}
          <span className="text-brand-blue-400">&quot;currency&quot;</span>
          <span className="text-slate-500">:</span>{" "}
          <span className="text-brand-green-400">&quot;TZS&quot;</span>
          {"\n"}
          {"  "}
          <span className="text-slate-300">{"}"}</span>
          {"\n\n"}
          <span className="text-brand-green-400">●</span>{" "}
          <span className="text-slate-500">Protocol status: nominal</span>
        </code>
      </pre>
    </Card>
  );
}
