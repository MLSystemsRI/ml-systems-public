import { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import {
  grossUpAnnualNet,
  shiftAnnualNet,
  shiftBlockNet,
  SALARY_NET,
  SHIFT_HOURLY,
  BLOCK_HOURS,
  WC_CLASS_CODE,
  WC_RATE_PCT,
  type PayrollBreakdown,
} from "@/lib/payroll-calc";

const ACCENT = "#F97316";
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const money2 = (n: number) => `$${n.toFixed(2)}`;
const pct = (f: number) => `${(f * 100).toFixed(1)}%`;

type Mode = "salary" | "shift";

/**
 * Pay — RI payroll gross-up calculator (on-device mirror of the Day-N engine).
 * The stated pay is NET; this shows the gross-up + full RI/federal withholdings +
 * employer burden incl. workers' comp (class 5403). Annual-basis estimate.
 */
export function PayrollCalc() {
  const [mode, setMode] = useState<Mode>("salary");

  // Salary inputs
  const [salaryNet, setSalaryNet] = useState(String(SALARY_NET));
  // Shift inputs
  const [hourly, setHourly] = useState(String(SHIFT_HOURLY));
  const [blocksPerDay, setBlocksPerDay] = useState("6");
  const [days, setDays] = useState("120");

  const salary = useMemo(() => grossUpAnnualNet(num(salaryNet)), [salaryNet]);
  const shift = useMemo(() => {
    const hr = num(hourly), bpd = num(blocksPerDay), d = num(days);
    return grossUpAnnualNet(shiftAnnualNet(hr, bpd, d));
  }, [hourly, blocksPerDay, days]);

  const b = mode === "salary" ? salary : shift;

  return (
    <View>
      {/* Salary | Shift sub-toggle */}
      <View className="flex-row bg-[#111111] border border-[#262626] rounded-xl p-0.5 mb-4">
        {(["salary", "shift"] as Mode[]).map((m) => {
          const on = mode === m;
          return (
            <Pressable key={m} onPress={() => setMode(m)} className="flex-1 rounded-lg py-2 items-center" style={on ? { backgroundColor: ACCENT } : undefined}>
              <Text style={{ color: on ? "#0A0A0A" : "#9CA3AF" }} className="text-[12px] font-bold">
                {m === "salary" ? "Salary" : "Shift"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Inputs */}
      {mode === "salary" ? (
        <View className="mb-4">
          <NumField label="Annual net take-home" prefix="$" value={salaryNet} onChange={setSalaryNet} />
          <Text className="text-[#4B5563] text-[10px] mt-1">Day-N Year-1 salary. This is NET — the employer grosses it up.</Text>
        </View>
      ) : (
        <View className="mb-4">
          <View className="flex-row gap-2">
            <View className="flex-1"><NumField label="Rate / hr" prefix="$" value={hourly} onChange={setHourly} /></View>
            <View className="flex-1"><NumField label="Blocks / day" value={blocksPerDay} onChange={setBlocksPerDay} /></View>
            <View className="flex-1"><NumField label="Days / yr" value={days} onChange={setDays} /></View>
          </View>
          <View className="flex-row items-center justify-between mt-2 bg-[#111111] border border-[#262626] rounded-xl px-3 py-2">
            <Text className="text-[#9CA3AF] text-[11px]">Per 2.25-hr block (net)</Text>
            <Text style={{ color: ACCENT }} className="text-[13px] font-bold">{money2(shiftBlockNet(num(hourly)))}</Text>
          </View>
          <Text className="text-[#4B5563] text-[10px] mt-1">
            ${num(hourly)}/hr × {BLOCK_HOURS} hr block (90 labor + 45 solve, both paid) — +50% take-home vs a conventional 1.5-hr block.
          </Text>
        </View>
      )}

      {/* Gross-up breakdown */}
      <BreakdownCard b={b} />

      {/* Workers' comp */}
      <View className="bg-[#111111] border rounded-2xl p-4 mt-3" style={{ borderColor: "#EF444433" }}>
        <Text style={{ color: "#EF4444" }} className="text-[10px] font-bold uppercase tracking-wider mb-1">Workers' Comp</Text>
        <View className="flex-row items-center justify-between">
          <Text className="text-[#F9FAFB] text-[13px] font-bold">Class {WC_CLASS_CODE} · Carpentry — Residential</Text>
          <Text style={{ color: "#EF4444" }} className="text-[14px] font-extrabold">{money(b.workersComp)}/yr</Text>
        </View>
        <Text className="text-[#6B7280] text-[11px] mt-1">
          {pct(WC_RATE_PCT)} of gross payroll. Actual rate varies by carrier + experience mod (new employer = standard; adjusts after 3 yrs).
        </Text>
      </View>

      <Text className="text-[#374151] text-[9px] text-center mt-3">
        On-device estimate · mirrors the ML Systems payroll engine · exact daily figures from payroll.previewDayPayroll
      </Text>
    </View>
  );
}

function BreakdownCard({ b }: { b: PayrollBreakdown }) {
  return (
    <View className="bg-[#111111] border border-[#262626] rounded-2xl p-4">
      {/* Net → Gross */}
      <View className="flex-row justify-between items-end mb-3 pb-3 border-b border-[#262626]">
        <View>
          <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider">Net (take-home)</Text>
          <Text className="text-[#F9FAFB] text-[18px] font-extrabold">{money(b.net)}</Text>
        </View>
        <Text className="text-[#4B5563] text-lg">→</Text>
        <View className="items-end">
          <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider">Gross</Text>
          <Text style={{ color: ACCENT }} className="text-[18px] font-extrabold">{money(b.gross)}</Text>
        </View>
      </View>

      {/* Employee withholdings */}
      <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider mb-1.5">Withheld from gross</Text>
      <Line label="Federal income" value={b.federal} />
      <Line label="RI income" value={b.ri} />
      <Line label="Social Security" value={b.socialSecurity} />
      <Line label="Medicare" value={b.medicare} />
      <Line label="RI TDI" value={b.tdi} />
      <Line label="Employee deductions" value={b.employeeDeductions} bold />

      {/* Employer costs */}
      <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider mb-1.5 mt-3">Employer pays on top</Text>
      <Line label="FICA match" value={b.employerFica} />
      <Line label="FUTA" value={b.futa} />
      <Line label="RI SUTA" value={b.suta} />
      <Line label="Workers' Comp (5403)" value={b.workersComp} accent="#EF4444" />
      <Line label="Employer taxes" value={b.employerTaxes} bold />

      {/* Total */}
      <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-[#262626]">
        <View>
          <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider">Total employer cost</Text>
          <Text className="text-[#4B5563] text-[10px]">{pct(b.effectiveBurden)} overhead on net</Text>
        </View>
        <Text style={{ color: ACCENT }} className="text-[20px] font-extrabold">{money(b.employerTotal)}</Text>
      </View>
    </View>
  );
}

function Line({ label, value, bold, accent }: { label: string; value: number; bold?: boolean; accent?: string }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className={bold ? "text-[#cbd2da] text-[12px] font-bold" : "text-[#9CA3AF] text-[12px]"}>{label}</Text>
      <Text
        style={accent ? { color: accent } : undefined}
        className={`text-[12px] font-mono ${bold ? "font-bold text-[#F9FAFB]" : accent ? "" : "text-[#cbd2da]"}`}
      >
        {money(value)}
      </Text>
    </View>
  );
}

function NumField({ label, value, onChange, prefix }: { label: string; value: string; onChange: (v: string) => void; prefix?: string }) {
  return (
    <View>
      <Text className="text-[#6B7280] text-[10px] uppercase tracking-wider mb-1">{label}</Text>
      <View className="flex-row items-center bg-[#111111] border border-[#262626] rounded-xl px-3 py-2.5">
        {prefix ? <Text className="text-[#6B7280] text-[13px] mr-0.5">{prefix}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholderTextColor="#4B5563"
          className="flex-1 text-[#F9FAFB] text-[14px] font-semibold p-0"
        />
      </View>
    </View>
  );
}

function num(s: string): number {
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return isFinite(n) ? n : 0;
}
