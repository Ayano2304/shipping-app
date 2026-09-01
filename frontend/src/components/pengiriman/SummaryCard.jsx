import {
  hitungTotalBerat, hitungPersenSusut, hitungSusutPerjalanan,
  toKg, formatAngka, getSusutColor
} from '../../lib/calc'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { cn } from '../../lib/utils'

export default function SummaryCard({ palkaBerangkat = [], palkaDatang = [], nilaiBl, satuanBl }) {
  const blKg = toKg(nilaiBl, satuanBl)
  const totalBerangkat = hitungTotalBerat(palkaBerangkat)
  const totalDatang = hitungTotalBerat(palkaDatang)
  const susutBl = hitungPersenSusut(totalDatang, nilaiBl, satuanBl)
  const selisihBl = totalDatang - blKg
  const susutPerjalanan = hitungSusutPerjalanan(totalBerangkat, totalDatang)
  const susutColor = getSusutColor(Math.abs(susutBl))

  const Item = ({ label, value, sub, className }) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-mono font-semibold', className)}>{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  )

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-secondary/30 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Ringkasan Perhitungan</h3>
        <p className="text-xs text-muted-foreground">Kalkulasi otomatis real-time</p>
      </div>
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
        <Item
          label="Total Keberangkatan"
          value={`${formatAngka(totalBerangkat)} KG`}
          className="text-blue-300"
        />
        <Item
          label="Total Kedatangan"
          value={`${formatAngka(totalDatang)} KG`}
          className="text-indigo-300"
        />
        <Item
          label="Nilai B/L"
          value={nilaiBl ? `${formatAngka(nilaiBl, 0)} ${satuanBl || 'KG'}` : '-'}
          className="text-muted-foreground"
        />
        <Item
          label="Selisih vs B/L"
          value={blKg ? `${selisihBl >= 0 ? '+' : ''}${formatAngka(selisihBl)} KG` : '-'}
          className={selisihBl >= 0 ? 'text-green-400' : 'text-red-400'}
        />
        <Item
          label="Susut Perjalanan"
          value={`${formatAngka(susutPerjalanan)} KG`}
          className={susutPerjalanan > 0 ? 'text-amber-400' : 'text-green-400'}
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Persentase Susut</span>
          <div className="flex items-center gap-1.5">
            <span className={cn('text-lg font-mono font-bold', susutColor)}>
              {formatAngka(Math.abs(susutBl), 4)}%
            </span>
            {susutBl > 0 ? <TrendingDown size={16} className="text-red-400" /> : susutBl < 0 ? <TrendingUp size={16} className="text-green-400" /> : <Minus size={16} className="text-muted-foreground" />}
          </div>
          <span className="text-xs text-muted-foreground">vs B/L</span>
        </div>
      </div>
    </div>
  )
}
