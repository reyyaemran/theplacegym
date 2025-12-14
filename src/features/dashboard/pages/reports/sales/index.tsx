"use client";

export function SalesReportPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black italic tracking-tight uppercase font-montserrat">SALES REPORT</h1>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
          <h3 className="text-lg font-semibold">Sales Performance Reports</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            View detailed reports on sales performance. Track revenue trends, top-selling products, and sales goals.
          </p>
        </div>
      </div>
    </div>
  );
} 