import { useRoute } from "wouter";
import { useGetEventBySlug, getGetEventBySlugQueryKey, useGetSettings, getGetSettingsQueryKey, useListArticles, getListArticlesQueryKey, useGetOrderByName, getGetOrderByNameQueryKey, useCreateOrder, useReserveOrder, Article } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Plus, Minus, CheckCircle2, Store } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function BuyerPage() {
  const [, params] = useRoute("/:slug");
  const slug = params?.slug;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: event, isLoading: eventLoading } = useGetEventBySlug(slug || "", {
    query: { enabled: !!slug, queryKey: getGetEventBySlugQueryKey(slug || "") }
  });

  const { data: settings } = useGetSettings(event?.id || 0, {
    query: { enabled: !!event?.id, queryKey: getGetSettingsQueryKey(event?.id || 0) }
  });

  const { data: articles } = useListArticles(event?.id || 0, {
    query: { enabled: !!event?.id, queryKey: getListArticlesQueryKey(event?.id || 0) }
  });

  const [orderName, setOrderName] = useState("");
  const [step, setStep] = useState<"name" | "catalog" | "status">("name");
  const [cart, setCart] = useState<Record<number, number>>({});

  const { data: existingOrder } = useGetOrderByName(event?.id || 0, orderName, {
    query: { 
      enabled: !!event?.id && !!orderName && step === "status",
      queryKey: getGetOrderByNameQueryKey(event?.id || 0, orderName),
      refetchInterval: 10000 
    }
  });

  const createOrder = useCreateOrder();
  const reserveOrder = useReserveOrder();

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderName.trim()) return;
    setStep("catalog");
  };

  const updateQuantity = (articleId: number, delta: number, max: number) => {
    setCart(prev => {
      const current = prev[articleId] || 0;
      const next = Math.max(0, Math.min(max, current + delta));
      const newCart = { ...prev };
      if (next === 0) delete newCart[articleId];
      else newCart[articleId] = next;
      return newCart;
    });
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = articles ? Object.entries(cart).reduce((total, [id, qty]) => {
    const article = articles.find(a => a.id === Number(id));
    return total + (article?.prix || 0) * qty;
  }, 0) : 0;

  const handleReserve = async () => {
    if (!event || totalItems === 0) return;
    
    try {
      const items = Object.entries(cart).map(([id, qty]) => ({
        article_id: Number(id),
        quantite: qty
      }));

      const order = await createOrder.mutateAsync({
        eventId: event.id,
        data: { nom_commande: orderName, items }
      });

      await reserveOrder.mutateAsync({ id: order.id });
      setStep("status");
      setCart({});
      
      toast({
        title: "Commande réservée !",
        description: "Présentez-vous à la caisse pour payer."
      });
      
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de réserver la commande. Veuillez réessayer."
      });
    }
  };

  if (eventLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse flex flex-col items-center"><Store size={48} className="text-primary mb-4" /><p className="text-muted-foreground font-medium">Chargement du menu...</p></div></div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center p-4 text-center">Événement introuvable.</div>;
  if (settings && !settings.vente_ouverte) {
    return <div className="min-h-screen flex items-center justify-center p-4 text-center text-xl font-bold">Les ventes sont actuellement fermées.</div>;
  }

  if (step === "name") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <Store size={64} className="mx-auto text-primary" strokeWidth={1.5} />
          <div>
            <h1 className="text-4xl font-black mb-2">{event.nom}</h1>
            <p className="text-muted-foreground text-lg">Entrez un nom pour votre commande</p>
          </div>
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <Input 
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              placeholder="Votre prénom ou surnom"
              className="text-xl py-6 text-center"
              autoFocus
            />
            <Button type="submit" size="lg" className="w-full text-lg h-14" disabled={!orderName.trim()}>
              Voir le Menu
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (step === "status") {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-card border rounded-2xl p-8 text-center shadow-lg">
          <CheckCircle2 size={64} className="mx-auto text-green-500 mb-6" />
          <h2 className="text-2xl font-bold mb-2">✅ Commande réservée !</h2>
          <p className="text-muted-foreground mb-8">
            Présentez-vous à la caisse avec votre nom <strong className="text-foreground">{orderName}</strong> pour payer et valider votre commande.
          </p>
          
          <div className="bg-muted rounded-xl p-4 mb-6">
            <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">Statut en direct</div>
            <div className="text-xl font-bold text-primary">
              {existingOrder?.statut === 'reservee' && "En attente de paiement"}
              {existingOrder?.statut === 'payee' && "Payée - En préparation"}
              {existingOrder?.statut === 'livree_partiellement' && "Partiellement prête"}
              {existingOrder?.statut === 'livree' && "Prête !"}
              {!existingOrder && "Recherche..."}
            </div>
          </div>
          
          <Button variant="outline" onClick={() => { setStep("name"); setOrderName(""); }} className="w-full">
            Nouvelle commande
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b p-4 shadow-sm">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h1 className="text-lg font-bold">{event.nom}</h1>
            <p className="text-sm text-muted-foreground">Commande de: <span className="font-semibold text-foreground">{orderName}</span></p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStep("name")}>Modifier</Button>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {articles?.filter(a => a.disponible).map((article) => (
            <div key={article.id} className="bg-card border rounded-2xl overflow-hidden shadow-sm flex flex-col">
              <div className="aspect-square bg-muted relative">
                {article.image_url ? (
                  <img src={article.image_url} alt={article.nom} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <Store size={32} className="text-primary/40" />
                  </div>
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <div className="font-semibold leading-tight mb-1">{article.nom}</div>
                <div className="text-primary font-bold mb-3">{article.prix.toFixed(2)} €</div>
                
                <div className="mt-auto">
                  {article.stock_disponible > 0 ? (
                    <div className="flex items-center justify-between bg-muted rounded-full p-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full shrink-0" 
                        onClick={() => updateQuantity(article.id, -1, article.stock_disponible)}
                        disabled={!cart[article.id]}
                      >
                        <Minus size={16} />
                      </Button>
                      <span className="font-semibold w-8 text-center">{cart[article.id] || 0}</span>
                      <Button 
                        variant="default" 
                        size="icon" 
                        className="h-8 w-8 rounded-full shrink-0" 
                        onClick={() => updateQuantity(article.id, 1, article.stock_disponible)}
                        disabled={(cart[article.id] || 0) >= article.stock_disponible}
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center text-sm font-medium text-destructive py-2 bg-destructive/10 rounded-full">
                      Épuisé
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {totalItems > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-background/80 backdrop-blur-md border-t shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20">
          <div className="max-w-4xl mx-auto flex gap-4 items-center">
            <div className="flex-1">
              <div className="text-sm text-muted-foreground font-medium mb-0.5">{totalItems} articles</div>
              <div className="text-2xl font-black text-primary leading-none">{totalPrice.toFixed(2)} €</div>
            </div>
            <Button size="lg" className="flex-1 h-14 text-lg shadow-lg hover:-translate-y-1 transition-transform" onClick={handleReserve} disabled={createOrder.isPending || reserveOrder.isPending}>
              {createOrder.isPending ? "Réservation..." : "Réserver & Payer"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}