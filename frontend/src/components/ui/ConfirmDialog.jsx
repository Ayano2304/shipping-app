import { AlertTriangle, Trash2, X } from 'lucide-react'

/**
 * Reusable confirm dialog menggantikan window.confirm()
 * 
 * @param {boolean} open - apakah dialog terbuka
 * @param {string} title - judul dialog
 * @param {string} message - pesan detail
 * @param {function} onConfirm - callback saat konfirmasi
 * @param {function} onCancel - callback saat batal
 * @param {string} confirmText - teks tombol konfirmasi (default: 'Hapus')
 * @param {string} cancelText - teks tombol batal (default: 'Batal')
 * @param {'danger'|'warning'} variant - warna tema dialog
 */
export default function ConfirmDialog({
  open,
  title = 'Konfirmasi',
  message = 'Apakah Anda yakin?',
  onConfirm,
  onCancel,
  confirmText = 'Hapus',
  cancelText = 'Batal',
  variant = 'danger',
}) {
  if (!open) return null

  const isDanger = variant === 'danger'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary transition-colors"
        >
          <X size={15} />
        </button>

        {/* Icon + Title */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isDanger ? 'bg-red-500/15' : 'bg-amber-500/15'
          }`}>
            {isDanger
              ? <Trash2 size={18} className="text-red-400" />
              : <AlertTriangle size={18} className="text-amber-400" />
            }
          </div>
          <h3 className="font-semibold text-foreground pr-6">{title}</h3>
        </div>

        {/* Message */}
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{message}</p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isDanger
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
