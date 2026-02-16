import { MembershipRecord, MembershipType, MembershipStatus, MembershipRecordFilters } from "../types/membership-record";
import { format, differenceInDays } from "date-fns";

const getPaymentTypeLabel = (type: string): string => {
  switch (type) {
    case "cash":
      return "Cash";
    case "card":
      return "Card";
    case "bank_transfer":
      return "KHQR";
    case "online":
      return "Online";
    case "other":
      return "Other";
    default:
      return type;
  }
};

const getMembershipTypeLabel = (type: string): string => {
  switch (type) {
    case "day_pass":
      return "DAY PASS";
    case "1_month":
      return "1 MONTH";
    case "3_month":
      return "3 MONTHS";
    case "6_month":
      return "6 MONTHS";
    case "1_year":
      return "1 YEAR";
    default:
      return type.toUpperCase();
  }
};

// Calculate membership status based on expiry date (same logic as in table columns)
const getMembershipStatus = (
  startDate: string,
  expiryDate: string,
  membershipType?: MembershipType
): MembershipStatus => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysUntilExpiry = differenceInDays(expiry, now);
  
  if (expiry < now) {
    return 'expired';
  }
  
  if (daysUntilExpiry <= 7) {
    return '7_days_left';
  }
  
  if (daysUntilExpiry <= 14) {
    return 'expiring_soon';
  }
  
  const start = new Date(startDate);
  const daysSinceStart = differenceInDays(now, start);
  
  if (daysSinceStart < 30) {
    return 'new_member';
  }
  
  return 'active';
};

const getStatusLabel = (record: MembershipRecord): string => {
  const status = getMembershipStatus(
    record.startDate,
    record.expiryDate,
    record.membershipType
  );
  
  const labels: Record<MembershipStatus, string> = {
    active: "Active",
    expired: "Expired",
    new_member: "New Member",
    renew: "Renew",
    expiring_soon: "Expiring Soon",
    '7_days_left': "7 Days Left",
  };
  
  return labels[status] || status;
};

const getFilterSuffix = (filters?: MembershipRecordFilters): string => {
  if (!filters || !filters.search) {
    return "";
  }
  return "-search";
};

export const exportToExcel = (records: MembershipRecord[]) => {
  // Create CSV content
  const headers = [
    "Invoice",
    "Member ID",
    "Member Name",
    "Membership Type",
    "Start Date",
    "Expiry Date",
    "Payment Type",
    "Payment Remark",
    "Price",
    "Payment Date",
    "Issued By",
    "Assigned",
    "Status",
  ];

  const rows = records.map((record) => {
    const memberId = record.membershipType !== 'day_pass' ? record.memberId : '';
    return [
      record.invoiceNumber,
      memberId,
      record.memberName,
      getMembershipTypeLabel(record.membershipType),
      format(new Date(record.startDate), "MMM dd, yyyy"),
      format(new Date(record.expiryDate), "MMM dd, yyyy"),
      getPaymentTypeLabel(record.paymentType),
      record.paymentRemark || "",
      `$${record.amount.toFixed(2)}`,
      format(new Date(record.paymentDate), "MMM dd, yyyy"),
      record.issuedBy || "",
      record.assignedStaffName || "",
      getStatusLabel(record),
    ];
  });

  // Calculate totals
  const totalRevenue = records.reduce((sum, record) => sum + record.amount, 0);

  // Add summary row
  const summaryRow = [
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    `$${totalRevenue.toFixed(2)}`,
    "",
    "",
    "",
    "",
  ];

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    summaryRow.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
  ].join("\n");

  // Create filename
  const filename = `membership-records-${format(new Date(), "yyyy-MM-dd")}.csv`;

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (records: MembershipRecord[], filters?: MembershipRecordFilters) => {
  // Create filter description
  const filterDescriptions: string[] = [];
  if (filters && filters.search) {
    filterDescriptions.push(`Search: ${filters.search}`);
  }
  const filterText = filterDescriptions.length > 0 
    ? `<p><strong>Filters Applied:</strong> ${filterDescriptions.join(", ")}</p>` 
    : "";

  // Calculate totals
  const totalRevenue = records.reduce((sum, record) => sum + record.amount, 0);

  // Create HTML table for PDF
  const tableRows = records.map((record) => {
    const memberId = record.membershipType !== 'day_pass' ? record.memberId : '';
    const status = getStatusLabel(record);
    return `
      <tr>
        <td>${record.invoiceNumber}</td>
        <td>${memberId}</td>
        <td>${record.memberName}</td>
        <td>${getMembershipTypeLabel(record.membershipType)}</td>
        <td>${format(new Date(record.startDate), "MMM dd, yyyy")}</td>
        <td>${format(new Date(record.expiryDate), "MMM dd, yyyy")}</td>
        <td>${getPaymentTypeLabel(record.paymentType)}</td>
        <td>${record.paymentRemark || ""}</td>
        <td>$${record.amount.toFixed(2)}</td>
        <td>${format(new Date(record.paymentDate), "MMM dd, yyyy")}</td>
        <td>${record.issuedBy || ""}</td>
        <td>${record.assignedStaffName || ""}</td>
        <td>${status}</td>
      </tr>
    `;
  }).join("");

  // Add summary row (13 columns total - 8 empty + amount + 4 empty)
  const summaryRow = `
    <tr class="summary-row">
      <td colspan="8"></td>
      <td>$${totalRevenue.toFixed(2)}</td>
      <td colspan="4"></td>
    </tr>
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Membership Report</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
        <style>
          @page {
            size: landscape;
            margin: 1cm;
          }
          @media print {
            @page {
              size: landscape;
              margin: 1cm;
            }
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            padding: 20px;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 30px;
          }
          .logo-badge {
            background-color: #000;
            color: #fff;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            font-family: 'Montserrat', sans-serif;
          }
          .logo-badge span {
            font-size: 14px;
            font-weight: 900;
            font-style: italic;
            line-height: 1;
          }
          .logo-text {
            display: flex;
            flex-direction: column;
            text-align: left;
            font-family: 'Montserrat', sans-serif;
          }
          .logo-text .logo-line1 {
            font-size: 18px;
            font-weight: 900;
            font-style: italic;
            letter-spacing: 0.05em;
            line-height: 1;
          }
          .logo-text .logo-line2 {
            font-size: 18px;
            font-weight: 900;
            font-style: italic;
            letter-spacing: 0.05em;
            line-height: 1;
            margin-top: -2px;
            padding-left: 0.6em;
          }
          h1 {
            text-align: center;
            margin-bottom: 20px;
            font-family: 'Montserrat', sans-serif;
            font-weight: 900;
            font-style: italic;
            font-size: 24px;
            text-transform: uppercase;
          }
          .info {
            margin-bottom: 15px;
            font-size: 11px;
            color: #666;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          tr.summary-row {
            background-color: #e5e5e5 !important;
            font-weight: bold;
          }
          tr.summary-row td {
            padding: 12px 8px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-badge">
            <span>TP</span>
          </div>
          <div class="logo-text">
            <span class="logo-line1">THE</span>
            <span class="logo-line2">PLACE</span>
          </div>
        </div>
        <h1>Membership Report</h1>
        <div class="info">
          <p>Generated on: ${format(new Date(), "MMM dd, yyyy 'at' HH:mm")}</p>
          <p>Total Records: ${records.length}</p>
          ${filterText}
        </div>
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Member ID</th>
              <th>Member Name</th>
              <th>Membership Type</th>
              <th>Start Date</th>
              <th>Expiry Date</th>
              <th>Payment Type</th>
              <th>Payment Remark</th>
              <th>Price</th>
              <th>Payment Date</th>
              <th>Issued By</th>
              <th>Assigned</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            ${summaryRow}
          </tbody>
        </table>
      </body>
    </html>
  `;

  // Open in new window and trigger print
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

