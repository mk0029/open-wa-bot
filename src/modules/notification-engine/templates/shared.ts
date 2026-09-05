import { formatCustomerName } from "./helpers"

const SEP = "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501"

export function greetingText(customerOrName: unknown): string {
  return `Dear ${formatCustomerName(customerOrName)},`
}

export function secureAccountSection(loginUrl?: string): string | null {
  if (!loginUrl) return null
  return [
    SEP,
    "\uD83D\uDD10 Your Secure Account",
    SEP,
    "",
    "Click the link below to log in and securely access your account.",
    "",
    loginUrl,
  ].join("\n")
}

export function footerText(): string {
  return [
    SEP,
    "",
    "Thank you for choosing us.",
    "",
    "If you have any questions, simply reply to this message.",
    "",
    "\u2014 Jambh Electricals",
  ].join("\n")
}

export function composeMessage({ title, greeting, bodyParts = [], loginUrl }: {
  title: string
  greeting: string
  bodyParts?: (string | null | false | undefined)[]
  loginUrl?: string
}): string {
  const lines: string[] = [
    title,
    "",
    greeting,
    "",
    ...bodyParts.filter((p) => p !== undefined && p !== null && p !== false),
  ]
  if (loginUrl) {
    lines.push("")
    const section = secureAccountSection(loginUrl)
    if (section) lines.push(section)
  }
  lines.push("")
  lines.push(footerText())
  return lines.join("\n")
}

export function billReminderCompose({ customerName: cName, title, introLines, billCount, totalAmount, billDetails, actionLine, loginUrl }: {
  customerName: unknown
  title: string
  introLines: string | string[]
  billCount: number
  totalAmount: string
  billDetails: string
  actionLine: string
  loginUrl?: string
}): string {
  const lines: string[] = [
    `Dear ${formatCustomerName(cName)},`,
    "",
    `\uD83D\uDD14 ${title}`,
    "",
    ...(Array.isArray(introLines) ? introLines : [introLines]).filter(Boolean),
    "",
    `${SEP}`,
    "\uD83D\uDCCA Summary",
    `${SEP}`,
    "",
    `Total Pending Amount`,
    totalAmount,
    "",
    `Number of Pending Bills`,
    `${billCount}`,
    "",
    `${SEP}`,
    "\uD83E\uDDFE Bill Details",
    `${SEP}`,
    "",
    billDetails,
    "",
    `${SEP}`,
    "",
    `\uD83D\uDCA1 ${actionLine}`,
  ]
  if (loginUrl) {
    lines.push("", "\uD83D\uDD10 View & pay your bills securely here:", loginUrl)
  }
  lines.push("", "Thank you for choosing us.", "", "\u2014 Jambh Electrical Services")
  return lines.join("\n")
}
