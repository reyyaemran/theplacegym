"use client";

export function ApiSettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black italic tracking-tight uppercase font-montserrat">API SETTINGS</h1>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
          <h3 className="text-lg font-semibold">API Configuration</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            Manage your API settings. Generate API keys, set rate limits, and configure webhook endpoints.
          </p>
        </div>
      </div>
    </div>
  );
} 