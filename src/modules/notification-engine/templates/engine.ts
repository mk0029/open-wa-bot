import { composeMessage, greetingText, billReminderCompose } from "./shared"
import {
  formatCurrency,
  formatDate,
  formatCustomerName,
  generateBillId,
  pendingAmount,
  totalOutstanding,
  billDetailLine,
} from "./helpers"

const templates: Record<string, (input: Record<string, any>) => string> = {}
const SEP = "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501"

function register(name: string, fn: (input: Record<string, any>) => string, aliases: string[] = []) {
  templates[name] = fn
  for (const alias of aliases) {
    templates[alias] = fn
  }
}

register("welcome", (input) => {
  return composeMessage({
    title: "Welcome to Jambh Electricals",
    greeting: greetingText(input.customer),
    bodyParts: [
      "We are delighted to welcome you to Jambh Electricals.",
      "",
      "It is our privilege to serve you with reliable electrical services and products. Our team is committed to delivering quality and professionalism in every interaction.",
    ],
    loginUrl: input.loginUrl,
  })
})

register("accountCreated", (input) => {
  const shop = input.shopName || "Jambh Electricals"
  const name = formatCustomerName(input.customer)
  const loginUrl = input.loginUrl
  const lines: (string | null | false)[] = [
    `\uD83C\uDF89 Welcome to ${shop}!`,
    "",
    `Hello ${name},`,
    "",
    "Your customer account has been created successfully.",
    "",
    "You can now securely access your account to:",
    "\u2022 View your Bills and payment history",
    "\u2022 Make secure online payments",
    "\u2022 Track your service requests",
    "\u2022 Monitor work progress and orders",
    "\u2022 Update your profile information",
  ]
  if (loginUrl) {
    lines.push("", "\uD83D\uDD10 Access Your Account", "", loginUrl)
  }
  lines.push("", `Thank you for choosing ${shop}. We look forward to serving you.`, "", `\u2014 ${shop} Team`)
  return lines.filter(Boolean).join("\n")
})

register("billCreated", (input) => {
  const bill = input.bill || input
  const shop = input.shopName || "Jambh Electricals"
  const name = formatCustomerName(input.customer)
  const subtotal = Number(input.subtotal ?? bill.totalAmount ?? input.totalAmount ?? 0)
  const discount = Number(input.discount ?? 0)
  const finalTotal = Number(input.finalTotal ?? Math.max(0, subtotal - discount))
  const amountPaid = Number(input.amountPaid ?? bill.paidAmount ?? input.paidAmount ?? 0)
  const remainingBalance = Number(
    input.remainingBalance ?? bill.balanceAmount ?? input.balanceAmount ?? Math.max(0, finalTotal - amountPaid),
  )
  const isFullyPaid = input.isFullyPaid === true || (finalTotal > 0 && remainingBalance <= 0.01) || finalTotal === 0
  const paymentStatus = input.paymentStatus || (isFullyPaid ? "paid" : amountPaid > 0 ? "partial" : "unpaid")
  const isZeroBalance = finalTotal === 0 || (discount >= subtotal && amountPaid === 0)
  const loginUrl = input.loginUrl
  const serviceName = bill.serviceName || input.serviceName || ""
  const technicianName = bill.technicianName || input.technicianName || input.technician || ""
  const dueDate = bill.dueDate || input.dueDate || ""
  const billId = generateBillId(bill)

  const title = isZeroBalance
    ? "\u2705 Bill Created"
    : isFullyPaid
      ? "\u2705 New Bill Created"
      : paymentStatus === "partial"
        ? "\u2705 Bill Created \u2014 Partial Payment"
        : "\uD83D\uDCCB Bill Created"
  const intro = isZeroBalance
    ? "Your bill has been created successfully."
    : isFullyPaid
      ? "Your bill has been created and the full payment has been received successfully."
      : paymentStatus === "partial"
        ? "Your bill has been created and a partial payment has been received."
        : "A new bill has been created in your account."
  const action = isZeroBalance
    ? "No payment is required for this bill."
    : isFullyPaid
      ? "Your payment has been successfully recorded. We appreciate your prompt payment."
      : paymentStatus === "partial"
        ? "Please complete the remaining payment at your earliest convenience."
        : "Please review the details and complete the payment by the due date."

  return [
    title, "", `Dear **${name}**,`, "", intro, "",
    `${SEP}`, "\uD83E\uDDFE Bill Details", `${SEP}`, "",
    `Bill ID`, billId, "",
    serviceName ? `Service` : null, serviceName ? serviceName : null, serviceName ? "" : null,
    technicianName ? `Technician` : null, technicianName ? technicianName : null, technicianName ? "" : null,
    dueDate ? `Due Date` : null, dueDate ? formatDate(dueDate) : null, dueDate ? "" : null,
    `${SEP}`, "\uD83D\uDCB3 Payment Summary", `${SEP}`, "",
    `Total Amount`, formatCurrency(subtotal), "",
    discount > 0 ? `Discount` : null, discount > 0 ? `-${formatCurrency(discount)}` : null, discount > 0 ? "" : null,
    discount > 0 && finalTotal > 0 ? `Final Total` : null, discount > 0 && finalTotal > 0 ? formatCurrency(finalTotal) : null, discount > 0 && finalTotal > 0 ? "" : null,
    `Amount Paid`, formatCurrency(amountPaid), "",
    `Remaining Balance`, isZeroBalance ? "\u20B90" : formatCurrency(remainingBalance), "",
    `${SEP}`, "",
    action, "",
    loginUrl ? `\uD83D\uDD10 View & Pay Online` : null, loginUrl ? loginUrl : null, loginUrl ? "" : null,
    `Thank you for choosing **${shop}**.`, "",
    `\u2014 ${shop} Team`,
  ].filter(Boolean).join("\n")
})

register("billUpdated", (input) => {
  const bill = input.bill || input
  const shop = input.shopName || "Jambh Electricals"
  const name = formatCustomerName(input.customer)
  const discount = Number(bill.discount ?? input.discount ?? 0)
  const finalTotal = Number(bill.finalTotal ?? input.finalTotal ?? 0)
  const serviceName = bill.serviceName || input.serviceName || "-"
  const technicianName = bill.technicianName || input.technicianName || input.technician || ""
  const outstandingBalance = formatCurrency(bill.balanceAmount ?? input.balanceAmount ?? bill.totalAmount ?? input.totalAmount)

  return [
    "\uD83D\uDCDD Bill Updated", "",
    `Dear **${name}**,`, "",
    "Your bill has been updated to reflect recent changes.", "",
    `${SEP}`, "\uD83E\uDDFE Bill Details", `${SEP}`, "",
    `Bill No`, generateBillId(bill), "",
    `Service`, serviceName, "",
    `Total Amount`, formatCurrency(bill.totalAmount || input.totalAmount), "",
    discount > 0 ? `Discount` : null, discount > 0 ? `-${formatCurrency(discount)}` : null, discount > 0 ? "" : null,
    discount > 0 && finalTotal > 0 ? `Final Total` : null, discount > 0 && finalTotal > 0 ? formatCurrency(finalTotal) : null, discount > 0 && finalTotal > 0 ? "" : null,
    `Outstanding Balance`, outstandingBalance, "",
    technicianName ? `Assigned Technician` : null, technicianName ? technicianName : null, technicianName ? "" : null,
    `${SEP}`, "",
    "Please review the updated bill details.", "",
    "If you have any questions regarding these changes, simply reply to this message or contact our support team.", "",
    `Thank you for choosing **${shop}**.`, "",
    `\u2014 ${shop} Team`,
  ].filter(Boolean).join("\n")
})

register("billDeleted", (input) => {
  const bill = input.bill || input
  const shop = input.shopName || "Jambh Electricals"
  const name = formatCustomerName(input.customer)
  const serviceName = bill.serviceName || input.serviceName || ""

  return [
    "\u274C Bill Cancelled", "",
    `Dear **${name}**,`, "",
    "We would like to inform you that the following bill has been cancelled and is no longer active.", "",
    `${SEP}`, "\uD83E\uDDFE Bill Details", `${SEP}`, "",
    `Bill No`, generateBillId(bill), "",
    serviceName ? `Service` : null, serviceName ? serviceName : null, serviceName ? "" : null,
    `Bill Amount`, formatCurrency(bill.totalAmount || input.totalAmount), "",
    `${SEP}`, "",
    "If this cancellation was unexpected or you have any questions, simply reply to this message or contact our support team.", "",
    `Thank you for choosing **${shop}**.`, "",
    `\u2014 ${shop} Team`,
  ].filter(Boolean).join("\n")
})

register("paymentSuccessful", (input) => {
  const bill = input.bill || input
  const customer = input.customer || {}
  const customerDisplayName = String(customer.name || "Customer").trim()
  const shop = input.shopName || "Jambh Electricals"
  const paidAmount = formatCurrency(bill.paidAmount || input.paidAmount || input.amount || 0)
  const totalAmount = formatCurrency(bill.totalAmount || input.totalAmount || 0)
  const discount = Number(bill.discount || input.discount || 0)
  const remaining = formatCurrency(pendingAmount(bill) || input.balanceAmount || 0)

  return [
    "\u2705 Payment Received Successfully", "",
    `Dear **${customerDisplayName}**,`, "",
    "Thank you! We have successfully received your payment.", "",
    `${SEP}`, "\uD83E\uDDFE Bill Details", `${SEP}`, "",
    `Bill ID`, generateBillId(bill), "",
    `${SEP}`, "\uD83D\uDCB3 Payment Summary", `${SEP}`, "",
    `Total Amount`, totalAmount, "",
    discount > 0 ? `Discount` : null, discount > 0 ? `-${formatCurrency(discount)}` : null, discount > 0 ? "" : null,
    `Amount Paid`, paidAmount, "",
    `Remaining Balance`, remaining, "",
    `${SEP}`, "",
    "Thank you for your payment.", "",
    "If you have any questions, simply reply to this message.",
    `**Team ${shop}**`,
  ].filter(Boolean).join("\n")
}, ["paymentReceived"])

register("paymentPartial", (input) => {
  const bill = input.bill || input
  const customer = input.customer || {}
  const customerDisplayName = String(customer.name || "Customer").trim()
  const shop = input.shopName || "Jambh Electricals"
  const paidAmount = formatCurrency(bill.paidAmount || input.paidAmount || input.amount || 0)
  const totalAmount = formatCurrency(bill.totalAmount || input.totalAmount || 0)
  const discount = Number(bill.discount || input.discount || 0)
  const remaining = formatCurrency(pendingAmount(bill) || input.balanceAmount || 0)

  return [
    "\u2705 Partial Payment Received", "",
    `Dear **${customerDisplayName}**,`, "",
    "Thank you! We have successfully received your partial payment.", "",
    `${SEP}`, "\uD83E\uDDFE Bill Details", `${SEP}`, "",
    `Bill ID`, generateBillId(bill), "",
    `${SEP}`, "\uD83D\uDCB3 Payment Summary", `${SEP}`, "",
    `Total Amount`, totalAmount, "",
    discount > 0 ? `Discount` : null, discount > 0 ? `-${formatCurrency(discount)}` : null, discount > 0 ? "" : null,
    `Amount Paid`, paidAmount, "",
    `Remaining Balance`, remaining, "",
    `${SEP}`, "",
    "Please complete the remaining payment at your earliest convenience.", "",
    "If you have any questions, simply reply to this message.",
    `**Team ${shop}**`,
  ].filter(Boolean).join("\n")
}, ["partialPaymentReminder"])

register("multiPaymentSuccessful", (input) => {
  const customer = input.customer || {}
  const customerDisplayName = String(customer.name || "Customer").trim()
  const shop = input.shopName || "Jambh Electricals"
  const bills = input.bills || []
  const totalPaid = formatCurrency(input.totalPaid || 0)
  const totalOutstandingBefore = formatCurrency(input.totalOutstandingBefore || input.remainingBalance + input.totalPaid || 0)
  const remainingOutstanding = formatCurrency(input.remainingBalance || 0)
  const fullyPaidCount = Number(input.fullyPaidCount) || bills.filter((b: any) => b.status === "paid" || (b.balanceAmount || 0) <= 0).length
  const partialCount = Number(input.partialCount) || bills.length - fullyPaidCount
  const paymentMode = input.paymentMode || "N/A"
  const paymentReference = input.paymentReference || ""
  const billLines = bills.map((b: any) => `\u2022 ${b.billNumber || b.billId || "Bill"} \u2014 ${formatCurrency(b.paidAmount || 0)}`).join("\n")

  return [
    "\u2705 Payment Received Successfully", "",
    `Dear **${customerDisplayName}**,`, "",
    "Thank you! We have successfully received your payment.", "",
    `${SEP}`, "\uD83D\uDCB3 Payment Summary", `${SEP}`, "",
    `Amount Paid`, totalPaid, "",
    `Bills Covered`, `${bills.length} Bills`, "",
    `Payment Mode`, paymentMode, "",
    paymentReference ? `Reference` : null, paymentReference ? paymentReference : null, paymentReference ? "" : null,
    `${SEP}`, "\uD83E\uDDFE Bills Included", `${SEP}`, "",
    billLines, "",
    `${SEP}`, "\uD83D\uDCCA Overall Account Status", `${SEP}`, "",
    `Total Outstanding Before Payment`, totalOutstandingBefore, "",
    `Total Amount Paid`, totalPaid, "",
    `Remaining Outstanding`, remainingOutstanding, "",
    `Bills Fully Paid`, `${fullyPaidCount}`, "",
    `Bills Partially Paid`, `${partialCount}`, "",
    `${SEP}`, "",
    "Thank you for your payment.", "",
    "If you have any questions, simply reply to this message.",
    `**Team ${shop}**`,
  ].filter(Boolean).join("\n")
}, ["multiPaid", "bulkPaid"])

register("paymentReminder", (input) => {
  const bills = input.bills || (input.bill ? [input.bill] : [input])
  const count = bills.length
  const total = totalOutstanding(bills)
  const billDetails = bills.map((b: any, i: number) => billDetailLine(b, i + 1)).join("\n\n")
  return billReminderCompose({
    customerName: input.customer,
    title: "Payment Reminder \u2013 Pending Bills",
    introLines: `We noticed that you have ${count} pending bills with us.`,
    billCount: count,
    totalAmount: formatCurrency(total),
    billDetails,
    actionLine: "Please clear the pending amount at your earliest convenience.",
    loginUrl: input.loginUrl,
  })
})

register("paymentDueToday", (input) => {
  const bills = input.bills || (input.bill ? [input.bill] : [input])
  const count = bills.length
  const total = totalOutstanding(bills)
  const billDetails = bills.map((b: any, i: number) => billDetailLine(b, i + 1)).join("\n\n")
  return billReminderCompose({
    customerName: input.customer,
    title: "Payment Due Today \u2013 Pending Bills",
    introLines: ["This is a polite reminder that your payment is due today."],
    billCount: count,
    totalAmount: formatCurrency(total),
    billDetails,
    actionLine: "Please clear the pending amount at your convenience today.",
    loginUrl: input.loginUrl,
  })
}, ["dueTodayReminder"])

register("paymentUpcoming", (input) => {
  const bills = input.bills || (input.bill ? [input.bill] : [input])
  const bill = bills[0] || input
  const count = bills.length
  const total = totalOutstanding(bills)
  const billDetails = bills.map((b: any, i: number) => billDetailLine(b, i + 1)).join("\n\n")
  return billReminderCompose({
    customerName: input.customer,
    title: "Payment Reminder \u2013 Upcoming Due",
    introLines: [`This is a friendly reminder that your payment is due on ${formatDate(bill.dueDate || input.dueDate)}.`],
    billCount: count,
    totalAmount: formatCurrency(total),
    billDetails,
    actionLine: "Please clear the pending amount on or before the due date.",
    loginUrl: input.loginUrl,
  })
}, ["upcomingDueReminder"])

register("paymentOverdue", (input) => {
  const bills = input.bills || (input.bill ? [input.bill] : [input])
  const bill = bills[0] || input
  const count = bills.length
  const total = totalOutstanding(bills)
  const billDetails = bills.map((b: any, i: number) => billDetailLine(b, i + 1)).join("\n\n")
  return billReminderCompose({
    customerName: input.customer,
    title: "Payment Overdue \u2013 Action Required",
    introLines: [`We noticed that you have ${count} overdue bills with us.`],
    billCount: count,
    totalAmount: formatCurrency(total),
    billDetails,
    actionLine: "Please clear the overdue amount at your earliest convenience to avoid any disruption in service.",
    loginUrl: input.loginUrl,
  })
}, ["overdueReminder"])

register("groupedReminder", (input) => {
  const bills = input.bills || []
  const count = bills.length
  const total = totalOutstanding(bills)
  const billDetails = bills.map((bill: any, i: number) => billDetailLine(bill, i + 1)).join("\n\n")
  return billReminderCompose({
    customerName: input.customer,
    title: "Payment Reminder \u2013 Pending Bills",
    introLines: `We noticed that you have ${count} pending bills with us.`,
    billCount: count,
    totalAmount: formatCurrency(total),
    billDetails,
    actionLine: "Please clear the pending amount at your earliest convenience.",
    loginUrl: input.loginUrl,
  })
})

register("creditReminder", (input) => {
  return composeMessage({
    title: "\uD83D\uDCB3 Credit Reminder",
    greeting: greetingText(input.customer),
    bodyParts: [
      `${SEP}`, "Outstanding Balance", `${SEP}`, "",
      formatCurrency(input.outstandingAmount || input.amount || 0), "",
      `${SEP}`, "",
      "We kindly request you to review your account and complete the pending payment at your earliest convenience.",
    ],
    loginUrl: input.loginUrl,
  })
}, ["creditLimitReminder"])

register("orderCreated", (input) => {
  return composeMessage({
    title: "Order Confirmed",
    greeting: greetingText(input.customer),
    bodyParts: [
      "Your order has been confirmed successfully.", "",
      "Order Details", "",
      input.orderNumber || input.orderId ? `\u2022 Order ID: ${input.orderNumber || input.orderId}` : null,
      input.itemCount ? `\u2022 Items: ${input.itemCount}` : null,
      input.totalAmount ? `\u2022 Total Amount: ${formatCurrency(input.totalAmount)}` : null,
      input.orderDate ? `\u2022 Order Date: ${formatDate(input.orderDate)}` : null,
      input.deliveryDate ? `\u2022 Estimated Delivery: ${formatDate(input.deliveryDate)}` : null, "",
      "We will keep you updated on the progress of your order.",
    ],
    loginUrl: input.loginUrl,
  })
}, ["orderConfirmation"])

register("orderUpdated", (input) => {
  return composeMessage({
    title: "Order Updated",
    greeting: greetingText(input.customer),
    bodyParts: [
      "Your order status has been updated.", "",
      "Order Details", "",
      input.orderNumber || input.orderId ? `\u2022 Order ID: ${input.orderNumber || input.orderId}` : null,
      input.status ? `\u2022 Status: ${input.status}` : null,
      input.updatedDate ? `\u2022 Updated on: ${formatDate(input.updatedDate)}` : null, "",
      "If you have any questions, please reply to this message.",
    ],
    loginUrl: input.loginUrl,
  })
})

register("orderCancelled", (input) => {
  return composeMessage({
    title: "Order Cancelled",
    greeting: greetingText(input.customer),
    bodyParts: [
      "Your order has been cancelled as requested.", "",
      "Order Details", "",
      input.orderNumber || input.orderId ? `\u2022 Order ID: ${input.orderNumber || input.orderId}` : null,
      input.cancelledDate ? `\u2022 Cancelled on: ${formatDate(input.cancelledDate)}` : null, "",
      "If you have any questions regarding this cancellation, please reply to this message.",
    ],
  })
})

register("orderDelivered", (input) => {
  return composeMessage({
    title: "Order Delivered",
    greeting: greetingText(input.customer),
    bodyParts: [
      "Your order has been successfully delivered.", "",
      "Order Details", "",
      input.orderNumber || input.orderId ? `\u2022 Order ID: ${input.orderNumber || input.orderId}` : null,
      input.deliveryDate ? `\u2022 Delivered on: ${formatDate(input.deliveryDate)}` : null, "",
      "We hope you are satisfied with your purchase. If you have any feedback, we would love to hear from you.",
    ],
    loginUrl: input.loginUrl,
  })
}, ["deliveryUpdate"])

register("appointmentReminder", (input) => {
  return composeMessage({
    title: "Appointment Reminder",
    greeting: greetingText(input.customer),
    bodyParts: [
      "This is a reminder regarding your upcoming appointment.", "",
      "Appointment Details", "",
      input.appointmentDate ? `\u2022 Date: ${formatDate(input.appointmentDate)}` : null,
      input.appointmentTime ? `\u2022 Time: ${input.appointmentTime}` : null,
      input.serviceName ? `\u2022 Service: ${input.serviceName}` : null,
      input.technician ? `\u2022 Technician: ${input.technician}` : null,
      input.location ? `\u2022 Location: ${input.location}` : null, "",
      "Please ensure availability at the scheduled time. If you need to reschedule, kindly reply to this message.",
    ],
  })
})

register("serviceReminder", (input) => {
  return composeMessage({
    title: "Service Reminder",
    greeting: greetingText(input.customer),
    bodyParts: [
      "This is a friendly reminder that your service is due.", "",
      "Service Details", "",
      input.serviceName ? `\u2022 Service: ${input.serviceName}` : null,
      input.lastServiceDate ? `\u2022 Last Service: ${formatDate(input.lastServiceDate)}` : null,
      input.dueDate ? `\u2022 Due Date: ${formatDate(input.dueDate)}` : null,
      input.technician ? `\u2022 Technician: ${input.technician}` : null, "",
      "Please reply to this message to schedule your service appointment.",
    ],
    loginUrl: input.loginUrl,
  })
})

register("thankYou", (input) => {
  return composeMessage({
    title: "Thank You",
    greeting: greetingText(input.customer),
    bodyParts: [
      "Thank you for choosing Us.", "",
      "We truly value your trust and look forward to serving you again.", "",
      "If you have any feedback or questions, simply reply to this message and our team will be happy to assist you.",
    ],
  })
})

register("paymentFailed", (input) => {
  const bill = input.bill || input
  const billId = generateBillId(bill)
  return composeMessage({
    title: "\u274C Payment Failed",
    greeting: greetingText(input.customer),
    bodyParts: [
      `${SEP}`, "Payment Details", `${SEP}`, "",
      billId !== "Bill" ? `Bill ID` : null, billId !== "Bill" ? billId : null, billId !== "Bill" ? "" : null,
      "We were unable to process your payment.", "",
      "Please try again or contact us for assistance.",
    ],
    loginUrl: input.loginUrl,
  })
})

register("customerDetails", (input) => {
  return composeMessage({
    title: "Customer Details",
    greeting: greetingText(input.customer),
    bodyParts: [
      "Your customer details have been shared.",
      input.customer?.location ? `Location: ${input.customer.location}` : null, "",
      "Please contact us if any information needs to be updated.",
    ],
  })
})

register("workRequest", (input) => {
  return composeMessage({
    title: "Work Request Update",
    greeting: greetingText(input.customer),
    bodyParts: [
      "Your work request details have been shared.",
      `Request: ${input.request?.requestId || input.request?._id || "-"}`,
      input.request?.title || input.request?.serviceType ? `Work: ${input.request.title || input.request.serviceType}` : null,
      input.request?.status ? `Status: ${input.request.status}` : null,
      input.request?.priority ? `Priority: ${input.request.priority}` : null, "",
      "We will keep you updated.",
    ],
    loginUrl: input.loginUrl,
  })
})

register("billCancelled", (input) => {
  const shop = input.shopName || "Jambh Electricals"
  const name = formatCustomerName(input.customer)
  return composeMessage({
    title: `\u274C Bill Cancelled - ${shop}`,
    greeting: `Dear ${name},`,
    bodyParts: [
      `${SEP}`, "Cancellation Details", `${SEP}`, "",
      input.billNumber ? `Bill No` : null, input.billNumber ? input.billNumber : null, input.billNumber ? "" : null,
      input.cancellationReason ? `Reason` : null, input.cancellationReason ? input.cancellationReason : null, input.cancellationReason ? "" : null,
      input.totalAmount ? `Original Amount` : null, input.totalAmount ? formatCurrency(input.totalAmount) : null, input.totalAmount ? "" : null,
      input.paidAmount > 0 ? `Amount Already Paid` : null, input.paidAmount > 0 ? formatCurrency(input.paidAmount) : null, input.paidAmount > 0 ? "" : null,
      input.balanceAmount > 0 ? `Refund/Adjustment Due` : null, input.balanceAmount > 0 ? formatCurrency(input.balanceAmount) : null, input.balanceAmount > 0 ? "" : null,
      `${SEP}`, "",
      "If you have any questions, please contact us.",
    ],
  })
})

register("goodMorning", (input) => {
  const shop = input.shopName || "Jambh Electricals"
  const name = formatCustomerName(input.customer)
  return composeMessage({
    title: `☀️ ${input.festivalGreeting ? "Festival Greetings" : "Good Morning"} - ${shop}`,
    greeting: input.festivalGreeting ? `${input.festivalGreeting}, ${name}!` : `Good morning, ${name}! ☀️`,
    bodyParts: [
      `${shop} wishes you a wonderful and productive day.`,
      "",
      "For electrical items, repairs, bills, or service support, you can reply to this message anytime.",
    ],
  })
})

register("toolRentUpdate", (input) => {
  const shop = input.shopName || "Jambh Electricals"
  const name = formatCustomerName(input.customer)
  return composeMessage({
    title: `Tool Rental Update - ${shop} Bot`,
    greeting: `Dear ${name},`,
    bodyParts: [
      `Tool: ${input.toolName || "Tool"}`,
      `Status: ${input.status || "Updated"}`,
      input.returnedDate ? `Returned On: ${new Date(input.returnedDate).toLocaleDateString("en-IN")}` : null,
      input.totalAmount > 0 ? `Total Amount: ${formatCurrency(input.totalAmount)}` : null,
      input.paidAmount > 0 ? `Paid Amount: ${formatCurrency(input.paidAmount)}` : null,
      input.balanceAmount > 0 ? `Balance Due: ${formatCurrency(input.balanceAmount)}` : null, "",
    ],
  })
})

register("workTaskUpdate", (input) => {
  const shop = input.shopName || "Jambh Electricals"
  const name = formatCustomerName(input.customer)
  return composeMessage({
    title: `Work Update - ${shop}`,
    greeting: `Dear ${name},`,
    bodyParts: [
      `Task: ${input.title || "Work Task"}`,
      `Status: ${input.status || "Updated"}`,
      input.technicianName ? `Technician: ${input.technicianName}` : null,
      input.description ? `Details: ${input.description}` : null,
      input.completionNotes ? `Completion Notes: ${input.completionNotes}` : null,
      input.cancellationReason ? `Cancellation Reason: ${input.cancellationReason}` : null,
      input.holdReason ? `Hold Reason: ${input.holdReason}` : null,
      input.dueDate ? `Due Date: ${new Date(input.dueDate).toLocaleDateString("en-IN")}` : null, "",
      "Thank you for your patience.",
    ],
  })
})

export function renderNotificationTemplate(type: string, input: Record<string, any> = {}): string {
  const renderer = templates[type]
  if (!renderer) throw new Error(`Unknown notification template: ${type}`)
  return renderer(input)
}
