import { renderNotificationTemplate } from "./engine"
import { cleanText, money, dateText, customerName } from "./helpers"
import { composeMessage, greetingText, footerText } from "./shared"

export type TemplateResult = {
  templateName: string
  language: string
  message: string
}

type BuilderFn = (payload: Record<string, any>) => TemplateResult | null

const builders: Record<string, BuilderFn> = {}

function register(eventType: string, fn: BuilderFn) {
  builders[eventType] = fn
}

register("customer.request.created", (payload) => {
  const name = payload.customerName || payload.name || "Customer"
  const phone = payload.phone || payload.customerPhone || "N/A"
  const requestType = payload.requestType || "self_registration"
  const message = composeMessage({
    title: "New Customer Registration Request",
    greeting: "Hello Admin,",
    bodyParts: [
      `${name} has submitted a new registration request.`,
      "",
      `Phone: ${phone}`,
      `Type: ${requestType}`,
      "Status: Pending",
      "",
      "Please review and approve from the admin panel.",
    ],
  })
  return { templateName: "customer.request.created", language: "en", message }
})

register("customer.created", (payload) => {
  const loginUrl = cleanText(payload.loginUrl || process.env.WA_LOGIN_URL || process.env.LOGIN_URL || "")
  const shop = payload.shopName || "Jambh Electricals"
  const name = customerName(payload)
  const message = renderNotificationTemplate("accountCreated", {
    customer: { name },
    shopName: shop,
    loginUrl,
  })
  return { templateName: "customer.created", language: "en", message }
})

register("bill.created", (payload) => renderBilling("billing.created", payload))
register("billing.created", (payload) => renderBilling("billing.created", payload))
register("billing.created.unpaid", (payload) => renderBilling("billing.created.unpaid", payload))
register("billing.created.partial", (payload) => renderBilling("billing.created.partial", payload))
register("billing.created.paid", (payload) => renderBilling("billing.created.paid", payload))
register("billing.created.zero_balance", (payload) => renderBilling("billing.created.zero_balance", payload))
register("billing.updated", (payload) => renderBilling("billing.updated", payload))
register("billing.deleted", (payload) => renderBilling("billing.deleted", payload))
register("bill.updated", (payload) => renderBilling("billing.updated", payload))
register("bill.deleted", (payload) => renderBilling("billing.deleted", payload))

register("bill.cancelled", (payload) => {
  return {
    templateName: "bill.cancelled",
    language: "en",
    message: renderNotificationTemplate("billCancelled", {
      customer: { name: payload.customerName || payload.customer?.name },
      billNumber: cleanText(payload.billNumber || payload.billId, "-"),
      cancellationReason: cleanText(payload.cancellationReason || payload.reason || "No reason provided"),
      cancelledDate: payload.cancelledAt || payload.updatedAt || new Date().toISOString(),
      totalAmount: Number(payload.totalAmount || 0),
      paidAmount: Number(payload.paidAmount || 0),
      balanceAmount: Number(payload.balanceAmount || 0),
      shopName: cleanText(payload.shopName || "Jambh Electricals"),
    }),
  }
})

register("billing.payment.partial", (payload) => renderPayment("billing.payment.partial", payload))
register("billing.payment.updated", (payload) => renderPayment("billing.payment.partial", payload))
register("bill.payment.updated", (payload) => renderPayment("billing.payment.partial", payload))
register("billing.payment.removed", (payload) => renderPayment("billing.payment.removed", payload))
register("bill.paid", (payload) => renderPayment("billing.payment.paid", payload))
register("billing.payment.paid", (payload) => renderPayment("billing.payment.paid", payload))
register("billing.multiPaid", (payload) => renderPayment("billing.multiPaid", payload))
register("billing.bulkPaid", (payload) => renderPayment("billing.bulkPaid", payload))

register("bill.reminder.due", (payload) => {
  const bills = (payload.bills || []).map((b: any) => ({
    billNumber: b.billNumber || b.billId,
    totalAmount: Number(b.totalAmount || 0),
    paidAmount: Number(b.paidAmount || 0),
    balanceAmount: Number(b.balanceAmount || 0),
    dueDate: b.dueDate,
  }))
  const totalPending = bills.reduce((s: number, b: any) => s + b.balanceAmount, 0)
  return {
    templateName: "bill.reminder.due",
    language: "en",
    message: renderNotificationTemplate("groupedReminder", {
      customer: { name: payload.customerName || payload.customer?.name },
      bills,
      totalPendingAmount: totalPending,
      dueDate: payload.dueDate,
      shopName: cleanText(payload.shopName || "Jambh Electricals"),
    }),
  }
})

register("workTask.created", (payload) => renderWorkTask("workTask.created", payload))
register("workTask.updated", (payload) => renderWorkTask("workTask.updated", payload))
register("workTask.completed", (payload) => renderWorkTask("workTask.completed", payload))
register("workTask.cancelled", (payload) => renderWorkTask("workTask.cancelled", payload))

register("workTask.hold", (payload) => {
  return {
    templateName: "workTask.hold",
    language: "en",
    message: renderNotificationTemplate("workTaskUpdate", {
      customer: { name: payload.customerName || payload.customer?.name },
      title: cleanText(payload.title || "Work task"),
      status: "On Hold",
      holdReason: cleanText(payload.holdReason || "No reason provided"),
      technicianName: cleanText(payload.assignedTechnicianName || ""),
      dueDate: payload.dueAt || payload.dueDate,
      shopName: cleanText(payload.shopName || "Jambh Electricals"),
    }),
  }
})

register("urgentWork.created", (payload) => {
  return {
    templateName: "urgentWork.created",
    language: "en",
    message: renderNotificationTemplate("workTaskUpdate", {
      customer: { name: payload.customerName || payload.customer?.name },
      title: cleanText(payload.title || "Urgent work request"),
      status: "Urgent",
      description: cleanText(payload.description || ""),
      shopName: cleanText(payload.shopName || "Jambh Electricals"),
    }),
  }
})

register("urgentWork.updated", (payload) => {
  return {
    templateName: "urgentWork.updated",
    language: "en",
    message: renderNotificationTemplate("workTaskUpdate", {
      customer: { name: payload.customerName || payload.customer?.name },
      title: cleanText(payload.title || "Urgent work request"),
      status: cleanText(payload.status || "Updated"),
      shopName: cleanText(payload.shopName || "Jambh Electricals"),
    }),
  }
})

register("urgentWork.completed", (payload) => {
  return {
    templateName: "urgentWork.completed",
    language: "en",
    message: renderNotificationTemplate("workTaskUpdate", {
      customer: { name: payload.customerName || payload.customer?.name },
      title: cleanText(payload.title || "Urgent work request"),
      status: "Completed",
      completionNotes: cleanText(payload.completionNotes || ""),
      technicianName: cleanText(payload.assignedTechnicianName || ""),
      shopName: cleanText(payload.shopName || "Jambh Electricals"),
    }),
  }
})

register("urgentWork.cancelled", (payload) => {
  return {
    templateName: "urgentWork.cancelled",
    language: "en",
    message: renderNotificationTemplate("workTaskUpdate", {
      customer: { name: payload.customerName || payload.customer?.name },
      title: cleanText(payload.title || "Urgent work request"),
      status: "Cancelled",
      cancellationReason: cleanText(payload.cancellationReason || payload.reason || "No reason provided"),
      shopName: cleanText(payload.shopName || "Jambh Electricals"),
    }),
  }
})

register("toolRent.created", (payload) => renderToolRent("toolRent.created", payload))
register("toolRent.updated", (payload) => renderToolRent("toolRent.updated", payload))

register("toolRent.returned", (payload) => {
  return {
    templateName: "toolRent.returned",
    language: "en",
    message: renderNotificationTemplate("toolRentUpdate", {
      customer: { name: payload.customerName || payload.customer?.name },
      toolName: cleanText(payload.toolName || payload.itemName || "Tool"),
      status: "Returned",
      returnedDate: payload.returnedAt || payload.updatedAt || new Date().toISOString(),
      totalAmount: Number(payload.totalAmount || 0),
      paidAmount: Number(payload.paidAmount || 0),
      balanceAmount: Number(payload.balanceAmount || 0),
      shopName: cleanText(payload.shopName || "Jambh Electricals"),
    }),
  }
})

register("toolRent.overdue", (payload) => renderToolRent("toolRent.overdue", payload))

register("toolRent.paid", (payload) => {
  return {
    templateName: "toolRent.paid",
    language: "en",
    message: renderNotificationTemplate("toolRentUpdate", {
      customer: { name: payload.customerName || payload.customer?.name },
      toolName: cleanText(payload.toolName || payload.itemName || "Tool"),
      status: "Paid",
      totalAmount: Number(payload.totalAmount || 0),
      paidAmount: Number(payload.paidAmount || 0),
      balanceAmount: Number(payload.balanceAmount || 0),
      shopName: cleanText(payload.shopName || "Jambh Electricals"),
    }),
  }
})

register("scheduled.goodMorning", (payload) => {
  return {
    templateName: "scheduled.goodMorning",
    language: "en",
    message: renderNotificationTemplate("goodMorning", {
      customer: { name: payload.customerName || payload.customer?.name || "Customer" },
      shopName: cleanText(payload.shopName || "Jambh Electricals"),
      festivalGreeting: payload.festivalGreeting || "",
    }),
  }
})

register("scheduled.festivalGreeting", (payload) => {
  return {
    templateName: "scheduled.festivalGreeting",
    language: "en",
    message: renderNotificationTemplate("goodMorning", {
      customer: { name: payload.customerName || payload.customer?.name || "Customer" },
      shopName: cleanText(payload.shopName || "Jambh Electricals"),
      festivalGreeting: cleanText(payload.festivalName || payload.festivalGreeting || "festival"),
    }),
  }
})

function renderBilling(eventType: string, payload: Record<string, any>): TemplateResult | null {
  const subtotal = Number(payload.totalAmount ?? payload.grandTotal ?? payload.netTotal ?? payload.totalPayable ?? 0)
  const discount = Number(payload.discount || 0)
  const finalTotal = Number(payload.finalTotal ?? Math.max(0, subtotal - discount))
  const amountPaid = Number(payload.totalPaid ?? payload.paidAmount ?? 0)
  const remainingBalance = Math.max(0, Number(payload.balance ?? payload.balanceAmount ?? (finalTotal - amountPaid)))

  const input = {
    customer: payload.customer || { name: payload.customerName },
    billNumber: cleanText(payload.billNo || payload.billNumber || payload.billId, "-"),
    totalAmount: subtotal,
    subtotal,
    discount,
    finalTotal,
    amountPaid,
    balanceAmount: remainingBalance,
    remainingBalance,
    paymentStatus: payload.paymentStatus || "unpaid",
    isFullyPaid: payload.isFullyPaid === true || remainingBalance <= 0.01,
    dueDate: payload.dueDate,
    serviceName: payload.serviceType || payload.serviceName || "",
    technicianName: payload.technicianName || payload.technician || "",
    shopName: payload.shopName,
    loginUrl: payload.loginUrl || "",
  }

  if (eventType.startsWith("billing.created")) {
    return { templateName: "billing.created", language: "en", message: renderNotificationTemplate("billCreated", input) }
  }
  if (eventType === "billing.updated") return { templateName: "billing.updated", language: "en", message: renderNotificationTemplate("billUpdated", input) }
  if (eventType === "billing.deleted") return { templateName: "billing.deleted", language: "en", message: renderNotificationTemplate("billDeleted", input) }
  return null
}

function renderPayment(eventType: string, payload: Record<string, any>): TemplateResult | null {
  const customerObj = payload.customer || {}
  const billNo = cleanText(payload.billNo || payload.billNumber || payload.billId, "-")
  const totalAmt = Number(payload.totalAmount ?? payload.grandTotal ?? 0)
  const paidAmt = Number(payload.totalPaid ?? payload.paidAmount ?? 0)
  const paidNow = Number(payload.paidNow ?? payload.amount ?? payload.paymentAmount ?? 0)
  const balanceAmt = Math.max(0, Number(payload.balance ?? payload.balanceAmount ?? (totalAmt - paidAmt)))

  const input = {
    customer: { name: customerObj.name || payload.customerName, nickname: customerObj.nickname || payload.customerNickname || payload.customerName },
    shopName: cleanText(payload.shopName || "Jambh Electricals"),
    billNumber: billNo,
    amount: paidNow,
    paidAmount: paidAmt,
    totalAmount: totalAmt,
    discount: Number(payload.discount || 0),
    balanceAmount: balanceAmt,
    dueDate: payload.dueDate,
    serviceName: payload.serviceType || payload.serviceName || "",
    technicianName: payload.technicianName || payload.technician || "",
  }

  if (eventType === "billing.multiPaid" || eventType === "billing.bulkPaid") {
    const billsList = (payload.bills || []).map((b: any) => ({
      billNumber: b.billNumber || b.billId,
      billId: b.billId || b._id,
      totalAmount: Number(b.totalAmount || 0),
      paidAmount: Number(b.paidAmount || 0),
      balanceAmount: Number(b.balanceAmount || 0),
      status: b.paymentStatus || (Number(b.balanceAmount || 0) <= 0 ? "paid" : "partial"),
    }))
    const totalP = billsList.reduce((s: number, b: any) => s + b.paidAmount, 0)
    const totalOutstandingBefore = Number(payload.totalOutstandingBefore || 0) || totalP + billsList.reduce((s: number, b: any) => s + b.balanceAmount, 0)
    const remaining = Number(payload.remainingBalance || 0) || Math.max(0, totalOutstandingBefore - totalP)
    const fullyPaidCount = Number(payload.fullyPaidCount || 0) || billsList.filter((b: any) => b.status === "paid" || b.balanceAmount <= 0).length
    const partialCount = Number(payload.partialCount || 0) || (billsList.length - fullyPaidCount)
    return {
      templateName: "payment.multiPaid",
      language: "en",
      message: renderNotificationTemplate("multiPaymentSuccessful", {
        customer: { name: customerObj.name || payload.customerName, nickname: customerObj.nickname || payload.customerNickname || payload.customerName },
        shopName: cleanText(payload.shopName || "Jambh Electricals"),
        totalPaid: totalP,
        remainingBalance: remaining,
        totalOutstandingBefore,
        fullyPaidCount,
        partialCount,
        bills: billsList,
        paymentMode: cleanText(payload.paymentMode || payload.paymentMethod || payload.method, "-"),
        paymentReference: cleanText(payload.paymentReference || payload.reference || payload.transactionId || payload.idempotencyKey, ""),
      }),
    }
  }

  if (eventType === "billing.payment.partial") return { templateName: "payment.partial", language: "en", message: renderNotificationTemplate("partialPaymentReminder", input) }
  if (eventType === "billing.payment.paid") return { templateName: "payment.paid", language: "en", message: renderNotificationTemplate("paymentReceived", input) }
  if (eventType === "billing.payment.removed" || eventType === "billing.payment.updated") return { templateName: "payment.removed", language: "en", message: renderNotificationTemplate("paymentReceived", input) }
  return null
}

function renderWorkTask(eventType: string, payload: Record<string, any>): TemplateResult | null {
  const title = cleanText(payload.title || payload.taskTitle || payload.requestTitle, "Service Request")
  const name = cleanText(payload.customerName || payload.customer?.name, "Valued Customer")
  const tech = cleanText(payload.assignedTechnicianName || payload.technicianName || payload.technician?.name, "Technician")
  const reqId = payload.requestId || payload.taskId || payload._id || ""
  const due = payload.dueAt ? dateText(payload.dueAt, true) : payload.dueDate || ""

  let status = ""
  let extra: Record<string, any> = {}

  if (eventType === "workTask.created") { status = "Created"; extra = { description: cleanText(payload.description || "") } }
  else if (eventType === "workTask.updated") { status = "Updated"; extra = { description: cleanText(payload.description || "") } }
  else if (eventType === "workTask.completed") { status = "Completed"; extra = { completionNotes: cleanText(payload.completionNotes || "") } }
  else if (eventType === "workTask.cancelled") { status = "Cancelled"; extra = { cancellationReason: cleanText(payload.cancellationReason || payload.reason || "No reason provided") } }
  else return null

  return {
    templateName: eventType,
    language: "en",
    message: renderNotificationTemplate("workTaskUpdate", {
      customer: { name },
      title,
      status,
      technicianName: tech,
      dueDate: due,
      shopName: cleanText(payload.shopName || "Jambh Electricals"),
      ...extra,
    }),
  }
}

function renderToolRent(eventType: string, payload: Record<string, any>): TemplateResult | null {
  const name = cleanText(payload.customerName || payload.customer?.name, "Customer")
  const shop = cleanText(payload.shopName || "Jambh Electricals")
  const tool = cleanText(payload.toolName || payload.tool?.toolName, "Tool")

  if (eventType === "toolRent.created") {
    const message = [
      "\uD83E\uDDF0 Tool Rental Confirmed", "",
      `Hello ${name},`, "",
      "Your Tool Rental has been successfully confirmed.", "",
      "\uD83D\uDCCB Rental Details", "",
      `\u2022 Tool: ${tool}`,
      `\u2022 Rental Start: ${dateText(payload.rentStartTime || payload.startDate, true)}`,
      `\u2022 Return Date: ${dateText(payload.dueDate || payload.expectedReturnTime || payload.returnDate, true)}`,
      `\u2022 Rental Charges: ${money(payload.rentAmount)}`,
      `\u2022 Security Deposit: ${money(payload.depositAmount)}`, "",
      "Please return the tool on or before the scheduled return date to avoid additional charges.", "",
      "If you need to extend your rental period, kindly contact us before the due date.", "",
      `Thank you for choosing ${shop}.`, "",
      `\u2014 ${shop} Team`,
    ].join("\n")
    return { templateName: "toolRent.created", language: payload.language || "hi-en", message }
  }

  if (eventType === "toolRent.updated") {
    const message = [
      "\uD83D\uDD04 Tool Rental Updated", "",
      `Hello ${name},`, "",
      "Your Tool Rental details have been updated.", "",
      "\uD83D\uDCCB Updated Rental Details", "",
      `\u2022 Tool: ${tool}`,
      payload.rentStartTime || payload.startDate ? `\u2022 Rental Start: ${dateText(payload.rentStartTime || payload.startDate, true)}` : null,
      payload.dueDate || payload.expectedReturnTime ? `\u2022 Return Date: ${dateText(payload.dueDate || payload.expectedReturnTime, true)}` : null,
      payload.rentAmount ? `\u2022 Rental Charges: ${money(payload.rentAmount)}` : null,
      payload.status ? `\u2022 Status: ${cleanText(payload.status)}` : null, "",
      `If you have any questions, please contact ${shop}.`, "",
      `\u2014 ${shop} Team`,
    ].filter(Boolean).join("\n")
    return { templateName: "toolRent.updated", language: payload.language || "hi-en", message }
  }

  if (eventType === "toolRent.overdue") {
    const daysOverdue = payload.daysOverdue ? ` (${payload.daysOverdue} days overdue)` : ""
    const message = [
      "\u26A0\uFE0F Tool Rental Overdue", "",
      `Hello ${name},`, "",
      "This is a reminder that your rented tool is now overdue.", "",
      "\uD83D\uDCCB Rental Details", "",
      `\u2022 Tool: ${tool}`,
      `\u2022 Due Date: ${dateText(payload.dueDate || payload.expectedReturnTime, true)}${daysOverdue}`,
      payload.overdueFine ? `\u2022 Overdue Fine: ${money(payload.overdueFine)}` : null, "",
      "Please return the tool as soon as possible to avoid additional charges.", "",
      `Thank you for your cooperation.`, "",
      `\u2014 ${shop} Team`,
    ].filter(Boolean).join("\n")
    return { templateName: "toolRent.overdue", language: payload.language || "hi-en", message }
  }

  return null
}

const aliases: Record<string, string> = {
  "customer-created": "customer.created",
  "customer-request-created": "customer.request.created",
  "bill-created": "bill.created",
  "bill-updated": "bill.updated",
  "bill-deleted": "bill.deleted",
  "bill-cancelled": "bill.cancelled",
  "bill-payment-updated": "bill.payment.updated",
  "bill-paid": "bill.paid",
  "bill-reminder-due": "bill.reminder.due",
  "billing-created": "billing.created",
  "billing-updated": "billing.updated",
  "billing-deleted": "billing.deleted",
  "billing-payment-partial": "billing.payment.partial",
  "billing-payment-paid": "billing.payment.paid",
  "billing-payment-updated": "billing.payment.updated",
  "billing-payment-removed": "billing.payment.removed",
  "billing-multi-paid": "billing.multiPaid",
  "billing-bulk-paid": "billing.bulkPaid",
  "work-request-created": "urgentWork.created",
  "work-request-updated": "urgentWork.updated",
  "work-request-done": "urgentWork.completed",
  "work-request-cancelled": "urgentWork.cancelled",
}

function normalizeEventType(eventType: string): string {
  if (builders[eventType]) return eventType
  if (aliases[eventType]) return aliases[eventType]
  const dotted = eventType.replace(/-/g, ".")
  if (builders[dotted]) return dotted
  return eventType
}

export function resolveEventTemplate(eventType: string, payload: Record<string, any> = {}): TemplateResult | null {
  const normalized = normalizeEventType(eventType)
  const builder = builders[normalized]
  if (!builder) return null
  return builder(payload)
}

export const SUPPORTED_EVENT_TYPES = Object.keys(builders)
