import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { motion } from "framer-motion";

const loginSchema = z.object({
  code: z.string().min(4, "Code is required"),
});

export default function Login() {
  const { t } = useI18n();
  const [_, setLocation] = useLocation();
  
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      code: "",
    },
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        if (data.success) {
          toast.success("Authentication successful");
          setLocation("/dashboard");
        }
      },
      onError: () => {
        toast.error(t("login.invalid"));
      }
    }
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data });
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background terminal decor */}
      <div className="absolute inset-0 pointer-events-none opacity-5 flex flex-col font-mono text-xs text-primary leading-none overflow-hidden select-none whitespace-nowrap z-0">
        {Array.from({ length: 100 }).map((_, i) => (
          <div key={i}>{Array.from({ length: 50 }).map(() => Math.random().toString(36).substring(2, 10)).join(" ")}</div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 w-full max-w-md p-8 border border-border bg-card/80 backdrop-blur-sm"
      >
        <div className="mb-10 text-center">
          <h1 className="font-mono text-4xl font-bold text-primary tracking-widest mb-2">
            ALPHA_CYBER
          </h1>
          <p className="text-muted-foreground font-mono text-sm tracking-wider uppercase">
            {t("login.subtitle")}
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-mono text-primary uppercase tracking-widest block">
              {t("login.accessCode")}
            </label>
            <input 
              {...form.register("code")}
              type="password"
              autoComplete="off"
              spellCheck="false"
              className="w-full bg-background border border-border p-3 font-mono text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
            {form.formState.errors.code && (
              <p className="text-destructive text-xs font-mono mt-1">
                {form.formState.errors.code.message}
              </p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loginMutation.isPending}
            className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary p-3 font-mono uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loginMutation.isPending ? "Authenticating..." : t("login.submit")}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
