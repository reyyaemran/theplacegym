"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const ADMIN_EMAIL = "theplaceadmin@theplace.com.kh";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  staffID: z.string().optional(),
  password: z.string().optional(),
}).refine(
  (data) => {
    const isAdmin = data.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    if (isAdmin) {
      return !!data.password && data.password.length > 0;
    } else {
      return !!data.staffID && data.staffID.length > 0;
    }
  },
  {
    message: "Please provide Staff ID or Password",
    path: ["staffID"],
  }
);

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();

        if (data.authenticated) {
          const redirect = searchParams.get("redirect") || "/dashboard";
          router.push(redirect);
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setIsCheckingAuth(false);
      }
    }

    checkAuth();
  }, [router, searchParams]);

  const [isAdminEmail, setIsAdminEmail] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      staffID: "",
      password: "",
    },
  });

  const emailValue = form.watch("email");

  // Detect if admin email is entered
  useEffect(() => {
    const normalizedEmail = emailValue?.toLowerCase().trim();
    const isAdmin = normalizedEmail === ADMIN_EMAIL.toLowerCase();
    setIsAdminEmail(isAdmin);
    
    // Clear the other field when switching
    if (isAdmin) {
      form.setValue("staffID", "");
    } else {
      form.setValue("password", "");
    }
  }, [emailValue, form]);

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);

    try {
      // Prepare request body based on login type
      const requestBody = isAdminEmail
        ? { email: data.email, password: data.password }
        : { email: data.email, staffID: data.staffID };

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Login failed. Please check your credentials.");
        return;
      }

      toast.success(`Welcome back, ${result.staff.name}!`);
      
      // Trigger auth refresh event to update all components
      window.dispatchEvent(new Event('auth-refresh'));
      
      const redirect = searchParams.get("redirect") || "/dashboard";
      router.push(redirect);
      router.refresh();
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      console.error("Login error:", error);
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            {isAdminEmail
              ? "Enter your email and password to access your account"
              : "Enter your email and Staff ID to access your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              {isAdminEmail ? (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="staffID"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staff ID</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter your Staff ID"
                          autoComplete="off"
                          disabled={isLoading}
                          className="font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <Button
                type="submit"
                className="w-full"
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
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

