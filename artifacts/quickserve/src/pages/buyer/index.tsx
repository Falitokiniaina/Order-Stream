import { useRoute } from "wouter";
import {
  useGetEventBySlug, getGetEventBySlugQueryKey,
  useGetSettings, getGetSettingsQueryKey,
  useListArticles, getListArticlesQueryKey,
  useGetOrderByName, getGetOrderByNameQueryKey,
  useCreateOrder, useReserveOrder, useCancelReservation, useUpdateOrderItems,
  getOrderByName, Order
} from "@workspace/api-client-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, ArrowRight, ChefHat, CheckCircle2, Clock, Plus, Minus, RotateCcw, ShoppingBag, Store, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

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
  const [nameCheckLoading, setNameCheckLoading] = useState(false);

  const [existingOrderConflict, setExistingOrderConflict] = useState<Order | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);

  const { data: liveOrder } = useGetOrderByName(event?.id || 0, orderName, {
    query: {
      enabled: !!event?.id && !!orderName && step === "status",
      queryKey: getGetOrderByNameQueryKey(event?.id || 0, orderName),
      refetchInterval: 8000
    }
  });

  const createOrder = useCreateOrder();
  const reserveOrder = useReserveOrder();
  const cancelReservation = useCancelReservation();
  const updateOrderItems = useUpdateOrderItems();

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderName.trim() || !event) return;

    setNameCheckLoading(true);
    try {
      const existing = await getOrderByName(event.id, orderName.trim());
      setExistingOrderConflict(existing);
      setShowConflictDialog(true);
    } catch {
      setStep("catalog");
    } finally {
      setNameCheckLoading(false);
    }
  };

  const handleReopenReserved = async () => {
    if (!existingOrderConflict) return;
    try {
      await cancelReservation.mutateAsync({ id: existingOrderConflict.id });
      const cartItems: Record<number, number> = {};
      existingOrderConflict.items?.forEach(item => {
        cartItems[item.article_id] = item.quantite;
      });
      setEditingOrderId(existingOrderConflict.id);
      setCart(cartItems);
      setShowConflictDialog(false);
      setExistingOrderConflict(null);
      setStep("catalog");
      toast({ title: "Commande rouverte", description: "Modifiez vos articles puis cliquez sur Réserver." });
    } catch {
      toast({ title: "Erreur", description: "Impossible de rouvrir la commande.", variant: "destructive" });
    }
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
      const items = Object.entries(cart).map(([id, qty]) => ({ article_id: Number(id), quantite: qty }));

      let orderId: number;

      if (editingOrderId) {
        await updateOrderItems.mutateAsync({ id: editingOrderId, data: { nom_commande: orderName, items } });
        orderId = editingOrderId;
      } else {
        const order = await createOrder.mutateAsync({ eventId: event.id, data: { nom_commande: orderName, items } });
        orderId = order.id;
      }

      await reserveOrder.mutateAsync({ id: orderId });
      setCart({});
      setEditingOrderId(null);
      setExistingOrderConflict(null);
      setStep("status");
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Impossible de réserver la commande. Veuillez réessayer.";
      toast({ variant: "destructive", title: "Erreur", description: msg });
    }
  };

  if (eventLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse flex flex-col items-center">
        <Store size={48} className="text-primary mb-4" />
        <p className="text-muted-foreground font-medium">Chargement du menu...</p>
      </div>
    </div>
  );
  if (!event) return <div className="min-h-screen flex items-center justify-center p-4 text-center">Événement introuvable.</div>;
  if (settings && !settings.vente_ouverte) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div className="max-w-md">
          <XCircle size={64} className="mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-black mb-2">Ventes fermées</h1>
          <p className="text-muted-foreground">Les commandes ne sont pas acceptées pour le moment. Revenez plus tard.</p>
        </div>
      </div>
    );
  }

  if (step === "name") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <Store size={64} className="mx-auto text-primary" strokeWidth={1.5} />
          <div>
            <h1 className="text-4xl font-black mb-4">{event.nom}</h1>
            <div className="bg-primary/10 border border-primary/30 rounded-2xl px-6 py-4 inline-block">
              <p className="text-primary text-xl font-black">Entrez un nom pour votre commande</p>
            </div>
          </div>
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <Input
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              placeholder="Exemple : votre prénom ou surnom"
              className="text-xl py-6 text-center"
              autoFocus
            />
            <Button type="submit" size="lg" className="w-full text-lg h-14" disabled={!orderName.trim() || nameCheckLoading}>
              {nameCheckLoading ? "Vérification..." : "Voir le Menu"}
            </Button>
          </form>
        </div>

        <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle size={20} className="text-amber-500" />
                Nom déjà utilisé
              </DialogTitle>
            </DialogHeader>
            {existingOrderConflict?.statut === "reservee" ? (
              <>
                <DialogDescription>
                  La commande <strong>"{existingOrderConflict.nom_commande}"</strong> est déjà réservée et en attente à la caisse.
                </DialogDescription>
                <p className="text-sm text-muted-foreground">Voulez-vous annuler la réservation en cours et modifier votre commande ?</p>
                <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                  {existingOrderConflict.items?.map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.quantite}x {item.article_nom}</span>
                    </div>
                  ))}
                  <div className="font-bold pt-1 border-t">{existingOrderConflict.montant_total.toFixed(2)} €</div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => { setShowConflictDialog(false); setOrderName(""); }}>
                    Changer de nom
                  </Button>
                  <Button onClick={handleReopenReserved} disabled={cancelReservation.isPending}>
                    <RotateCcw size={16} className="mr-2" />
                    {cancelReservation.isPending ? "Réouverture..." : "Modifier la commande"}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogDescription>
                  Le nom <strong>"{existingOrderConflict?.nom_commande}"</strong> est déjà enregistré dans le système
                  {existingOrderConflict?.statut === "expiree" && " (commande expirée)"}
                  {existingOrderConflict?.statut === "en_attente" && " (commande en cours)"}
                  {existingOrderConflict?.statut === "payee" && " (commande payée)"}
                  {existingOrderConflict?.statut === "livree" && " (commande livrée)"}
                  .
                </DialogDescription>
                <p className="text-sm text-muted-foreground">Choisissez un nom différent pour votre commande.</p>
                <DialogFooter>
                  <Button onClick={() => { setShowConflictDialog(false); setOrderName(""); }}>
                    Changer de nom
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (step === "status") {
    const statut = liveOrder?.statut;
    const isExpired = statut === "expiree";
    const isReserved = statut === "reservee";
    const isPaid = statut === "payee" || statut === "livree_partiellement";
    const isDelivered = statut === "livree";

    return (
      <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center mb-2">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Commande de</p>
            <h1 className="text-5xl font-black text-primary uppercase tracking-tight">{orderName}</h1>
          </div>

          {isExpired && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6 text-center">
              <XCircle size={56} className="mx-auto text-destructive mb-3" />
              <h2 className="text-2xl font-black text-destructive mb-2">Commande expirée</h2>
              <p className="text-muted-foreground">Votre réservation n'a pas été payée à temps.</p>
              <Button className="mt-4 w-full" onClick={() => { setStep("name"); setOrderName(""); }}>
                Créer une nouvelle commande
              </Button>
            </div>
          )}

          {isReserved && (
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock size={24} className="text-amber-600" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-semibold uppercase">Statut actuel</div>
                  <div className="font-bold text-lg">En attente de paiement</div>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <ArrowRight size={24} className="mx-auto text-amber-600 mb-2" />
                <p className="font-black text-amber-900 text-lg">RENDEZ-VOUS À LA CAISSE</p>
                <p className="text-sm text-amber-700 mt-1">Donnez votre nom <strong>{orderName}</strong> au caissier</p>
              </div>
            </div>
          )}

          {isPaid && (
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <ChefHat size={24} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-semibold uppercase">Statut actuel</div>
                  <div className="font-bold text-lg">{statut === "livree_partiellement" ? "Partiellement prête" : "En préparation"}</div>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <ChefHat size={24} className="mx-auto text-blue-600 mb-2" />
                <p className="font-black text-blue-900 text-lg">RENDEZ-VOUS AU PRÉPARATEUR</p>
                <p className="text-sm text-blue-700 mt-1">Votre commande <strong>{orderName}</strong> est en cours de préparation</p>
              </div>
            </div>
          )}

          {isDelivered && (
            <div className="bg-card border rounded-2xl p-6 shadow-sm text-center">
              <CheckCircle2 size={56} className="mx-auto text-green-500 mb-3" />
              <h2 className="text-2xl font-black text-green-600 mb-2">Commande prête !</h2>
              <p className="text-muted-foreground">Bon appétit !</p>
            </div>
          )}

          {!statut && (
            <div className="bg-card border rounded-2xl p-6 text-center">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4 mx-auto" />
                <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
              </div>
              <p className="text-muted-foreground mt-4 text-sm">Synchronisation en cours...</p>
            </div>
          )}

          {liveOrder?.items && liveOrder.items.length > 0 && (
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Détail de votre commande</p>
              <ul className="space-y-1 text-sm">
                {liveOrder.items.map(item => (
                  <li key={item.id} className="flex justify-between">
                    <span>{item.quantite}x {item.article_nom}</span>
                    <span className="text-muted-foreground">{(item.prix_unitaire * item.quantite).toFixed(2)} €</span>
                  </li>
                ))}
                <li className="flex justify-between font-bold pt-1 border-t">
                  <span>Total</span>
                  <span>{liveOrder.montant_total.toFixed(2)} €</span>
                </li>
              </ul>
            </div>
          )}

          {!isExpired && !isDelivered && (
            <Button variant="outline" className="w-full" onClick={() => { setStep("name"); setOrderName(""); }}>
              Nouvelle commande
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-36">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Commande de</p>
              <h1 className="text-2xl font-black text-primary leading-tight">{orderName}</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep("name")}>Modifier le nom</Button>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {articles?.filter(a => a.disponible).map((article) => {
            const qty = cart[article.id] || 0;
            const stockLeft = article.stock_disponible - qty;
            return (
              <div key={article.id} className="bg-card border rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="aspect-square bg-muted relative">
                  {article.image_url ? (
                    <img src={article.image_url} alt={article.nom} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <ShoppingBag size={32} className="text-primary/40" />
                    </div>
                  )}
                  {qty > 0 && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                      {qty}
                    </div>
                  )}
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <div className="font-semibold leading-tight mb-0.5">{article.nom}</div>
                  <div className="text-primary font-bold mb-1">{article.prix.toFixed(2)} €</div>
                  <div className={`text-xs mb-2 font-medium ${article.stock_disponible <= 3 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                    {article.stock_disponible <= 0 ? 'Épuisé' : `${article.stock_disponible} restant${article.stock_disponible > 1 ? 's' : ''}`}
                  </div>

                  <div className="mt-auto">
                    {article.stock_disponible > 0 ? (
                      <div className="flex items-center justify-between bg-muted rounded-full p-1">
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 rounded-full shrink-0"
                          onClick={() => updateQuantity(article.id, -1, article.stock_disponible)}
                          disabled={!qty}
                        >
                          <Minus size={16} />
                        </Button>
                        <span className="font-semibold w-8 text-center">{qty}</span>
                        <Button
                          variant="default" size="icon"
                          className="h-8 w-8 rounded-full shrink-0"
                          onClick={() => updateQuantity(article.id, 1, article.stock_disponible)}
                          disabled={qty >= article.stock_disponible}
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
            );
          })}
        </div>
      </div>

      {totalItems > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-4 bg-background/90 backdrop-blur-md border-t shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20">
          <div className="max-w-4xl mx-auto flex gap-4 items-center">
            <div className="flex-1">
              <div className="text-sm text-muted-foreground font-medium mb-0.5">{totalItems} article{totalItems > 1 ? 's' : ''}</div>
              <div className="text-2xl font-black text-primary leading-none">{totalPrice.toFixed(2)} €</div>
            </div>
            <Button
              size="lg"
              className="flex-1 h-14 text-lg shadow-lg hover:-translate-y-1 transition-transform"
              onClick={handleReserve}
              disabled={createOrder.isPending || reserveOrder.isPending}
            >
              {createOrder.isPending || reserveOrder.isPending ? "Réservation..." : "Réserver & Payer"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
