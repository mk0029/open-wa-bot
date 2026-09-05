export function cleanText(value: unknown, fallback = ""): string {
  return String(value ?? fallback)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function formatCurrency(value: unknown): string {
  const n = toNumber(value)
  const hasDecimals = Math.round(n * 100) % 100 !== 0
  return `\u20b9${n.toLocaleString("en-IN", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`
}

export function money(value: unknown): string {
  return formatCurrency(value)
}

export function formatDate(value: string | Date | undefined | null): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  })
}

export function dateText(value: string | Date | undefined | null, withTime = false): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return cleanText(value, "-")
  const options: Intl.DateTimeFormatOptions = withTime
    ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }
    : { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }
  return new Intl.DateTimeFormat("en-GB", options).format(d)
}

export function formatCustomerName(customerOrName: unknown): string {
  if (typeof customerOrName === "string") return customerOrName.trim() || "Customer"
  return String((customerOrName as any)?.name || "Customer").trim() || "Customer"
}

export function customerName(payload: Record<string, any>): string {
  return cleanText(payload?.customer?.name || payload?.customerName, "Customer")
}

export function shopName(payload: Record<string, any>, brandName?: string): string {
  return cleanText(payload?.shopName || brandName, "Jambh Electricals")
}

export function greetingByTime(customerOrName: unknown, date = new Date()): string {
  const name = formatCustomerName(customerOrName)
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", { hour: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }).format(date),
  )
  if (hour >= 5 && hour < 12) return `Good Morning, ${name}.`
  if (hour >= 12 && hour < 17) return `Good Afternoon, ${name}.`
  if (hour >= 17 && hour < 22) return `Good Evening, ${name}.`
  return `Dear ${name},`
}

export function signature(): string {
  return "Jambh Electricals"
}

export function generateBillId(bill: Record<string, any>): string {
  return bill?.billNumber || bill?.billId || bill?._id || "Invoice"
}

export function pendingAmount(bill: Record<string, any>): number {
  if (typeof bill?.balanceAmount === "number") return Math.max(0, bill.balanceAmount)
  return Math.max(0, toNumber(bill?.totalAmount) - toNumber(bill?.paidAmount))
}

export function totalOutstanding(bills: Record<string, any>[] = []): number {
  return (Array.isArray(bills) ? bills : []).reduce((sum, bill) => sum + pendingAmount(bill), 0)
}

export function billDetailLine(bill: Record<string, any>, index: number): string {
  const lines: (string | null | false)[] = [
    `${index}. ${generateBillId(bill)}`,
    `   Amount: ${formatCurrency(pendingAmount(bill))}`,
    bill.serviceName || bill.service || bill.serviceType
      ? `   Service: ${bill.serviceName || bill.service || bill.serviceType}`
      : null,
    bill.dueDate ? `   Due: ${formatDate(bill.dueDate)}` : null,
    bill.technicianName || bill.technician
      ? `   Technician: ${bill.technicianName || bill.technician}`
      : null,
  ]
  const items = bill.items || []
  if (items.length > 0) {
    for (const item of items) {
      const label = item.name || item.description || ""
      const price = item.price ? ` \u2014 ${formatCurrency(item.price)}` : ""
      lines.push(`   \u2022 ${label}${price}`)
    }
  }
  const billNotes = bill.notes || bill.note || ""
  if (billNotes) {
    lines.push(`   Note: ${billNotes}`)
  }
  return lines.filter((p) => p !== undefined && p !== null && p !== false).join("\n")
}

export function formatInvoiceList(bills: Record<string, any>[] = []): string {
  const list = Array.isArray(bills) ? bills : []
  const heading = list.length === 1 ? "Outstanding Invoice" : "Outstanding Invoices"
  const lines: string[] = [heading, ""]
  for (const bill of list.slice(0, 5)) {
    lines.push(`\u2022 ${generateBillId(bill)} \u2014 ${formatCurrency(pendingAmount(bill))}`)
  }
  if (list.length > 5) {
    lines.push(`...and ${list.length - 5} more outstanding invoices.`)
  }
  return lines.join("\n")
}
