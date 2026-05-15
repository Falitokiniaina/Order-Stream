import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Flame } from "lucide-react";

export default function Landing() {
  const [slug, setSlug] = useState("");
  const [, setLocation] = useLocation();

  const handleGo = (e: React.FormEvent) => {
    e.preventDefault();
    if (slug.trim()) {
      setLocation(`/${slug.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="flex justify-center text-primary">
          <Flame size={64} strokeWidth={1.5} />
        </div>
        
        <div>
          <h1 className="text-4xl font-black text-foreground mb-4">QuickServe</h1>
          <p className="text-lg text-muted-foreground">
            Le gestionnaire de commandes ultra-rapide pour votre stand.
          </p>
        </div>

        <form onSubmit={handleGo} className="bg-card shadow-lg rounded-2xl p-6 border flex flex-col gap-4">
          <h2 className="font-semibold text-left">Rejoindre un événement</h2>
          <Input 
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Ex: festival-2024"
            className="text-lg py-6"
          />
          <Button type="submit" size="lg" className="w-full text-lg">
            Accéder au menu
          </Button>
        </form>

        <div className="pt-8 text-sm text-muted-foreground">
          <button onClick={() => setLocation('/admin')} className="hover:text-primary transition-colors">
            Accès Administrateur
          </button>
        </div>
      </div>
    </div>
  );
}