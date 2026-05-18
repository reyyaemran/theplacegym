"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FocusMissionPanel } from "@/components/login/focus-mission-panel";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();
        if (data.authenticated) {
          router.push(searchParams.get("redirect") || "/dashboard");
        }
      } catch {
        // ignore
      } finally {
        setIsCheckingAuth(false);
      }
    }
    checkAuth();
  }, [router, searchParams]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  const formValid = form.formState.isValid;

  useEffect(() => {
    if (formValid) router.prefetch("/dashboard");
  }, [formValid, router]);

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
        credentials: "same-origin",
      });

      if (!res.ok) {
        let errMsg = "Login failed. Please check your credentials.";
        try {
          const errData = await res.json();
          if (errData?.error) errMsg = errData.error;
        } catch {
          /* ignore */
        }
        toast.error(errMsg);
        return;
      }

      const result = await res.json();
      toast.success(`Welcome back, ${result.staff?.name ?? "User"}!`);
      window.dispatchEvent(new Event("auth-refresh"));

      router.push(searchParams.get("redirect") || "/dashboard");
      router.refresh();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(
        msg.includes("fetch") || msg.includes("Network")
          ? "Connection error. Please check your network and try again."
          : "An error occurred. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
            aria-label="Go to home"
          >
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg font-montserrat">
              <span className="text-sm font-black italic leading-none w-full text-center">
                TP
              </span>
            </div>
            <div className="flex flex-1 flex-col text-left">
              <span className="font-montserrat text-base font-black italic tracking-wide leading-none">
                THE
              </span>
              <span className="font-montserrat text-base font-black italic tracking-wide pl-[0.6em] leading-none -mt-1">
                PLACE
              </span>
            </div>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs space-y-6">
            <h1 className="text-2xl font-bold">Welcome back</h1>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="name@example.com"
                          autoComplete="email"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete="current-password"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-center">
                  <Button
                    type="submit"
                    className="w-auto min-w-24 px-8"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>

      <FocusMissionPanel />
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
