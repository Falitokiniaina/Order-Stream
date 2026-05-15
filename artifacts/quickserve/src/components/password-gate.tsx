import { useState } from "react";
import { useLogin, LoginInputRole } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface PasswordGateProps {
  role: LoginInputRole;
  eventSlug?: string;
  children: React.ReactNode;
}

export function PasswordGate({ role, eventSlug, children }: PasswordGateProps) {
  const { isAuthenticated, loading, login: localLogin } = useAuth(role, eventSlug);
  const [password, setPassword] = useState("");
  const loginMutation = useLogin();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { password, role, eventSlug: eventSlug || null } },
      {
        onSuccess: (res) => {
          if (res.success) {
            localLogin(role, eventSlug);
            toast({ title: "Connecté avec succès" });
          } else {
            toast({ title: "Mot de passe incorrect", variant: "destructive" });
          }
        },
        onError: () => {
          toast({ title: "Erreur de connexion", variant: "destructive" });
        },
      }
    );
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card rounded-xl shadow-lg border p-6 text-center">
        <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={24} />
        </div>
        <h1 className="text-xl font-bold mb-2">Accès {role}</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Veuillez entrer le mot de passe pour accéder à cette section.
        </p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <Input 
            type="password" 
            placeholder="Mot de passe" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Vérification..." : "Accéder"}
          </Button>
        </form>
      </div>
    </div>
  );
}