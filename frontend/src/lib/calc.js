// Konversi B/L ke KG
export const toKg = (nilai, satuan) => {
  if (!nilai) return 0
  return satuan === 'MT' ? parseFloat(nilai) * 1000 : parseFloat(nilai)
}

// Hitung berat satu palka dengan metode Excel (Rounding komponen Tinggi + Point)
export const hitungBeratPalka = (volumeLiter, point, density, faktorKoreksi, volumeBase, bedaLiter = 403) => {
  const vTotal = parseFloat(volumeLiter)
  const d = parseFloat(density)
  const f = parseFloat(faktorKoreksi || 1.0)
  const p = parseFloat(point || 0)
  if (!vTotal || !d || !f || isNaN(vTotal) || isNaN(d) || isNaN(f)) return 0
  
  const vB = volumeBase !== undefined && volumeBase !== null && volumeBase !== '' && !isNaN(volumeBase)
    ? parseFloat(volumeBase)
    : (vTotal - (p * bedaLiter))
  const vP = p * bedaLiter
  
  const beratTinggi = Math.round(vB * d * f)
  const beratPoint = p > 0 ? Math.round(vP * d * f) : 0
  return beratTinggi + beratPoint
}

// Hitung total berat dari array palka
export const hitungTotalBerat = (palkaList) => {
  return palkaList.reduce((sum, p) => {
    const berat = hitungBeratPalka(p.volumeLiter, p.point, p.density, p.faktorKoreksi, p.volumeBase, p.bedaLiter)
    return sum + berat
  }, 0)
}

// Hitung selisih vs B/L
export const hitungSelisihBL = (totalBerat, nilaiBl, satuanBl) => {
  const blKg = toKg(nilaiBl, satuanBl)
  return totalBerat - blKg
}

// Hitung persentase susut vs B/L
export const hitungPersenSusut = (totalBerat, nilaiBl, satuanBl) => {
  const blKg = toKg(nilaiBl, satuanBl)
  if (!blKg || blKg === 0) return 0
  return ((blKg - totalBerat) / blKg) * 100
}

// Hitung susut perjalanan (berangkat - datang)
export const hitungSusutPerjalanan = (totalBerangkat, totalDatang) => {
  return totalBerangkat - totalDatang
}

// Format angka ribuan dengan koma (default 0 desimal bulat)
export const formatAngka = (n, decimal = 0) => {
  if (n === null || n === undefined || isNaN(n) || n === '') return '-'
  return parseFloat(n).toLocaleString('id-ID', {
    minimumFractionDigits: decimal,
    maximumFractionDigits: decimal,
  })
}

// Format tanggal
export const formatTanggal = (d) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

// Warna berdasarkan nilai susut
export const getSusutColor = (persen) => {
  if (persen <= 0.1) return 'text-green-400'
  if (persen <= 0.5) return 'text-yellow-400'
  return 'text-red-400'
}

// R1 = (SFAL - BL) / BL × 100%
export const hitungR1 = (sfal, bl) => {
  if (!bl || bl === 0) return 0
  return ((sfal - bl) / bl) * 100
}

// R2 = (SFBD - SFAL) / SFAL × 100%
export const hitungR2 = (sfbd, sfal) => {
  if (!sfal || sfal === 0) return 0
  return ((sfbd - sfal) / sfal) * 100
}

// R3 = (SFBD - BL) / BL × 100%
export const hitungR3 = (sfbd, bl) => {
  if (!bl || bl === 0) return 0
  return ((sfbd - bl) / bl) * 100
}

// Format input angka dengan pemisah ribuan (e.g. 45000 -> 45.000)
export const formatRibuan = (val) => {
  if (val === null || val === undefined || val === '') return ''
  const str = val.toString().replace(/[^0-9]/g, '')
  if (!str) return ''
  return Number(str).toLocaleString('id-ID')
}

// Parse string berformat ribuan kembali ke nilai integer murni
export const parseRibuan = (formattedStr) => {
  if (formattedStr === null || formattedStr === undefined || formattedStr === '') return ''
  const cleaned = formattedStr.toString().replace(/[^0-9]/g, '')
  return cleaned === '' ? '' : cleaned
}

