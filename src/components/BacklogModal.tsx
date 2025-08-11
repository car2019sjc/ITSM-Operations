import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { X } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Incident } from '../types/incident';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

interface BacklogModalProps {
  incidents: Incident[];
  onClose: () => void;
  defaultMonth?: string;
}

/**
 * BacklogModal - Modal de análise de backlog às 08h
 *
 * Props:
 * - incidents: Array de incidentes
 * - onClose: Função para fechar o modal
 * - defaultMonth?: string ("YYYY-MM")
 */
export function BacklogModal({
  incidents,
  onClose,
  defaultMonth = dayjs().format("YYYY-MM"),
}: BacklogModalProps) {
  // ================= UI STATE ================= (somente diário)
  const viewMode = 'daily' as const;
  const [month, setMonth] = useState<string>(defaultMonth); // YYYY-MM
  const [cutoff, setCutoff] = useState<string>("08:00");
  const [businessDaysOnly, setBusinessDaysOnly] = useState<boolean>(true);
  const [showAllMonthDays, setShowAllMonthDays] = useState<boolean>(true);
  const [fillWeekends, setFillWeekends] = useState<boolean>(true);
  const [threshold, setThreshold] = useState<number>(18);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // ================ HELPERS ==================
  type Row = { Number: string; Opened: string; Updated: string; State: string };
  type Pt = { date: string; backlog_08h: number; opened_volume: number; closed_volume: number };

  // Mantemos os modos independentes (diário vs semanal) para que mostrem gráficos distintos

  // Converter incidentes para o formato esperado
  const data: Row[] = useMemo(() => {
    return incidents.map(incident => ({
      Number: incident.Number,
      Opened: incident.Opened,
      Updated: incident.Updated || incident.Opened,
      State: incident.State?.toLowerCase() === 'fechado' || incident.State?.toLowerCase() === 'closed' ? 'closed' : 'open'
    }));
  }, [incidents]);

  const toDate = (s: string | undefined) => {
    if (!s) return null;
    // Accepts many formats; dayjs will parse in local TZ; enforce tz
    const d = dayjs.tz(s, "America/Sao_Paulo");
    return d.isValid() ? d : null;
  };

  const closedDt = (row: Row) => {
    return row.State?.toLowerCase() === "closed" ? toDate(row.Updated) : null;
  };

  const isBusinessDay = (d: dayjs.Dayjs) => {
    const wd = d.day(); // 0 Sun .. 6 Sat
    return wd !== 0 && wd !== 6;
  };

  // Retorna o instante anterior (08:00) considerando dias úteis se necessário
  const getPreviousInstant = (instant: dayjs.Dayjs, businessOnly: boolean) => {
    let prev = instant.subtract(1, 'day');
    if (!businessOnly) return prev;
    // pular fins de semana
    while (!isBusinessDay(prev)) {
      prev = prev.subtract(1, 'day');
    }
    return prev;
  };

  // Conta chamados cujo Opened está dentro da janela (prevInstant 08:00, instant 08:00]
  const countOpenedInWindow = (rows: Row[], prevInstant: dayjs.Dayjs, instant: dayjs.Dayjs) => {
    let n = 0;
    const windowEnd = instant.valueOf();
    const windowStart = prevInstant.valueOf();
    for (const r of rows) {
      const opened = toDate(r.Opened);
      if (!opened) continue;
      const t = opened.valueOf();
      if (t > windowStart && t <= windowEnd) n++;
    }
    return n;
  };

  // Conta chamados fechados dentro da janela 08h→08h
  const countClosedInWindow = (rows: Row[], prevInstant: dayjs.Dayjs, instant: dayjs.Dayjs) => {
    let n = 0;
    const windowEnd = instant.valueOf();
    const windowStart = prevInstant.valueOf();
    for (const r of rows) {
      // Considera fechado quando State === 'Closed' e Updated na janela
      if ((r.State || '').toLowerCase() !== 'closed') continue;
      const updated = toDate(r.Updated);
      if (!updated) continue;
      const t = updated.valueOf();
      if (t > windowStart && t <= windowEnd) n++;
    }
    return n;
  };

  // Quantidade de chamados em backlog no instante (abertos até o instante e não fechados antes dele)
  // Exclui chamados com status 'Hold' do cálculo de backlog
  const backlogStockAt = (rows: Row[], instant: dayjs.Dayjs) => {
    const t = instant.valueOf();
    let n = 0;
    for (const r of rows) {
      const opened = toDate(r.Opened);
      if (!opened) continue;
      if (opened.valueOf() > t) continue;
      
      // Excluir chamados com status 'Hold' do backlog
      const state = r.State?.toLowerCase() || '';
      if (state.includes('hold') || state.includes('pending') || state.includes('aguardando')) {
        continue;
      }
      
      const closed = r.State?.toLowerCase() === 'closed' ? toDate(r.Updated) : null;
      if (!closed || closed.valueOf() > t) n++;
    }
    return n;
  };

  const buildDailySeries = (
    rows: Row[],
    monthYYYYMM: string,
    opts: { businessOnly: boolean; showAllDays: boolean; fillWeekends: boolean; cutoffHHmm: string }
  ): Pt[] => {
    const base = dayjs.tz(monthYYYYMM + "-01", "America/Sao_Paulo");
    const start = base.startOf("month");
    const monthEnd = base.endOf("month");
    const todayEnd = dayjs.tz().endOf("day");
    const end = monthEnd.isAfter(todayEnd) ? todayEnd : monthEnd; // clamp ao dia atual

    // Build the list of days based on options
    const days: dayjs.Dayjs[] = [];
    for (let d = start; d.isBefore(end) || d.isSame(end, "day"); d = d.add(1, "day")) {
      // Sempre incluir todos os dias; fins de semana receberam tratamento especial via fillWeekends
      days.push(d);
    }

    const cutoffParts = opts.cutoffHHmm.split(":");
    const hh = parseInt(cutoffParts[0] || "8", 10);
    const mm = parseInt(cutoffParts[1] || "0", 10);

    // Compute valores por dia útil
    const seriesBD: Pt[] = days.map((d) => {
      const instant = d.hour(hh).minute(mm).second(0).millisecond(0);
      const prevInstant = getPreviousInstant(instant, opts.businessOnly).hour(hh).minute(mm).second(0).millisecond(0);
      return { 
        date: d.format("YYYY-MM-DD"), 
        backlog_08h: backlogStockAt(rows, instant),
        opened_volume: countOpenedInWindow(rows, prevInstant, instant),
        closed_volume: countClosedInWindow(rows, prevInstant, instant)
      };
    });

    if (!opts.showAllDays) return seriesBD; // only business days requested

    // Expand to all days of the month, filling weekends with last business day value
    const allDays: dayjs.Dayjs[] = [];
    for (let d = start; d.isBefore(end) || d.isSame(end, "day"); d = d.add(1, "day")) allDays.push(d);

    const mapBacklog = new Map(seriesBD.map((p) => [p.date, p.backlog_08h]));
    const mapOpened = new Map(seriesBD.map((p) => [p.date, p.opened_volume]));
    // Ajustaremos 'closed' pela identidade: backlog_t = backlog_{t-1} + opened_t - closed_t
    let lastBacklog = 0; // para herdar em fins de semana
    let prevBacklogForIdentity: number | null = null;
    const full: Pt[] = allDays.map((d) => {
      const key = d.format("YYYY-MM-DD");
      let backlogVal: number;
      let openedVal: number;
      let closedVal: number = 0;
      if (mapBacklog.has(key)) {
        backlogVal = mapBacklog.get(key)!;
        lastBacklog = backlogVal;
        openedVal = mapOpened.get(key) ?? 0;
      } else {
        backlogVal = opts.fillWeekends ? lastBacklog : 0;
        openedVal = 0; // volume de aberturas em fds exibido como 0
      }
      // Ajuste coerência: fechado = backlog_{t-1} + aberto_t - backlog_t
      if (prevBacklogForIdentity === null) {
        closedVal = 0; // primeiro dia não tem referência; assume 0
      } else {
        closedVal = Math.max(0, prevBacklogForIdentity + openedVal - backlogVal);
      }
      prevBacklogForIdentity = backlogVal;
      return { date: key, backlog_08h: backlogVal, opened_volume: openedVal, closed_volume: closedVal };
    });

    return full;
  };

  // Modo semanal removido

  // ============== DATA PROCESSING ==============
  const [series, setSeries] = useState<{ points: Pt[]; mean: number }>({ points: [], mean: 0 });

  React.useEffect(() => {
    const processData = async () => {
      if (!Array.isArray(data) || data.length === 0) {
        setSeries({ points: [], mean: 0 });
        return;
      }

      setIsProcessing(true);

      // Usar setTimeout para não bloquear o UI
      setTimeout(() => {
        try {
          // Limitar o processamento para evitar travamentos
          const maxDataPoints = 1000;
          const limitedData = data.length > maxDataPoints ? data.slice(0, maxDataPoints) : data;
          
          const pts = buildDailySeries(limitedData, month, {
            businessOnly: businessDaysOnly,
            showAllDays: showAllMonthDays,
            fillWeekends: fillWeekends,
            cutoffHHmm: cutoff,
          });
          
          const mean = pts.length ? pts.reduce((a, b) => a + b.backlog_08h, 0) / pts.length : 0;
          setSeries({ points: pts, mean });
        } catch (error) {
          console.error('Erro ao processar dados do backlog:', error);
          setSeries({ points: [], mean: 0 });
        } finally {
          setIsProcessing(false);
        }
      }, 100);
    };

    processData();
  }, [data, month, cutoff, businessDaysOnly, showAllMonthDays, fillWeekends]);

  // Ajustar título para refletir o fim efetivo (clampado em hoje)
  const effectiveEnd = (() => {
    const monthEnd = dayjs.tz(month + "-01", "America/Sao_Paulo").endOf("month");
    const todayEnd = dayjs.tz().endOf("day");
    return monthEnd.isAfter(todayEnd) ? todayEnd : monthEnd;
  })();

  const title = `Backlog às ${cutoff} — até ${effectiveEnd.format("DD/MM/YYYY")}`;

  // ============== RENDER =======================
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-[#151B2B] rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            Painel — Backlog às 08h
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        <div className="overflow-auto max-h-[calc(95vh-80px)] p-4">
          <Card className="shadow-lg">
            <CardContent className="space-y-4 p-6">
              {/* Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Modo</Label>
                  <div className="text-sm text-gray-300">Diário</div>
                </div>

                {true ? (
                  <div className="space-y-2">
                    <Label>Mês (YYYY-MM)</Label>
                    <Input
                      type="month"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="bg-orange-200 text-black border-orange-300 focus:ring-orange-400 focus:border-orange-400 placeholder:text-black/60"
                    />
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label>Horário de medição</Label>
                  <Input
                    type="time"
                    value={cutoff}
                    onChange={(e) => setCutoff(e.target.value)}
                    className="bg-orange-200 text-black border-orange-300 focus:ring-orange-400 focus:border-orange-400 placeholder:text-black/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Opção 'Somente dias úteis' desativada do modal */}
                {true && (
                  <>
                    {/* Opção 'Exibir todos os dias do mês' desativada do modal */}
                    <div className="flex items-center space-x-2">
                      <Checkbox id="fill" checked={fillWeekends} onCheckedChange={(v) => setFillWeekends(Boolean(v))} />
                      <Label htmlFor="fill">Finais de semana herdam último dia útil</Label>
                    </div>
                  </>
                )}
                {/* Botão para mostrar média removido */}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Meta (linha verde)</Label>
                  <Input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value || 0))} />
                </div>
                <div className="md:col-span-2 text-sm text-gray-400">
                  <p>
                    Série exibida: <strong>Diária</strong>
                  </p>
                </div>
              </div>

              {/* Chart */}
              <Card className="border-dashed border-gray-600">
                <CardHeader className="pb-0">
                  <CardTitle className="text-lg text-white">{title}</CardTitle>
                </CardHeader>
                <CardContent className="h-[360px]">
                  {isProcessing ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                        <p className="text-gray-400">Processando dados...</p>
                        {data.length > 1000 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Processando {Math.min(1000, data.length)} de {data.length} registros
                          </p>
                        )}
                      </div>
                    </div>
                  ) : series.points.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400">Nenhum dado disponível para o período selecionado</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={series.points} margin={{ top: 12, right: 24, left: 0, bottom: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        {
                          // Tick personalizado: finais de semana em vermelho e rótulos "Sab"/"Dom"
                        }
                        <XAxis 
                          dataKey="date" 
                          interval={0}
                          tickMargin={8}
                          stroke="#6B7280"
                          tick={(props: any) => {
                            const { x, y, payload } = props;
                            const d = dayjs(payload?.value);
                            const isValid = d.isValid();
                            const dow = isValid ? d.day() : -1; // 0=Dom,6=Sab
                            const isWeekend = dow === 0 || dow === 6;
                            const label = isWeekend ? (dow === 0 ? 'Dom' : 'Sab') : (isValid ? d.format('DD') : payload?.value);
                            const fill = isWeekend ? '#EF4444' : '#9CA3AF';
                            return (
                              <text x={x} y={y} dy={12} textAnchor="middle" fill={fill} style={{ fontSize: 12 }}>
                                {label}
                              </text>
                            );
                          }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#9CA3AF' }} 
                          allowDecimals={false}
                          stroke="#6B7280"
                          domain={[0, (dataMax: number) => Math.max(dataMax, threshold) + 5]}
                        />
                        {/* Linha laranja (Total) removida a pedido */}
                        <Tooltip 
                          formatter={(v: any, n: any, props: any) => {
                            const key = props?.dataKey as string | undefined;
                            const seriesName = key === 'opened_volume' ? 'backlog 08h' : (props?.name || n);
                            return [v, seriesName];
                          }} 
                          labelFormatter={(l) => dayjs(l).isValid() ? dayjs(l).format("DD/MM/YYYY") : l}
                          contentStyle={{
                            backgroundColor: '#1F2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#F3F4F6'
                          }}
                        />
                        {/* Linha de média removida */}
                        <ReferenceLine 
                          y={threshold} 
                          stroke="#10B981" 
                          strokeWidth={2}
                          strokeDasharray="8 4" 
                          label={{ 
                            value: `Meta: ${threshold}`, 
                            position: "topRight", 
                            fill: "#10B981",
                            fontSize: 12,
                            fontWeight: "bold"
                          }} 
                        />
                        {/* Linha de Abertos 08h-08h (azul) */}
                        <Line 
                          type="monotone" 
                          dataKey="opened_volume" 
                          stroke="#3B82F6"
                          strokeWidth={2} 
                          dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                          name="backlog 08h"
                          isAnimationActive={false} 
                        />
                        {/* Linha de fechados removida */}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
