import { useRoute } from "wouter";
import {
  useGetEventBySlug, getGetEventBySlugQueryKey,
  useGetSettings, getGetSettingsQueryKey,
  useListArticles, getListArticlesQueryKey,
  useGetOrderByName, getGetOrderByNameQueryKey,
  useCreateOrder, useReserveOrder, useCancelReservation, useUpdateOrderItems, useReactivateOrder, useSaveDeviceInfo,
  getOrderByName, Order
} from "@workspace/api-client-react";
import { collectDeviceInfo } from "@/lib/collect-device-info";
import { formatOrderRef } from "@/lib/utils";
import { usePageTitle } from "@/hooks/use-page-title";
import { useState, useEffect, useRef } from "react";
import { useInView } from "@/hooks/use-in-view";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, ArrowRight, ChefHat, CheckCircle2, Clock, Plus, Minus, RotateCcw, ShoppingBag, Store, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export default function BuyerPage() {
  const [, params] = useRoute("/:slug");
  const slug = params?.slug;
  usePageTitle(`${slug ?? ""} · QuickServe`);
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
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [reactivateError, setReactivateError] = useState<{
    type: "unavailable" | "stock" | "other";
    items?: { article: string; demande?: number; disponible?: number }[];
  } | null>(null);

  const { data: liveOrder } = useGetOrderByName(event?.id || 0, orderName, {
    query: {
      enabled: !!event?.id && !!orderName && step === "status",
      queryKey: getGetOrderByNameQueryKey(event?.id || 0, orderName),
      refetchInterval: (query) => {
        const s = (query.state.data as typeof liveOrder)?.statut;
        if (s === "livree" || s === "expiree") return false;
        if (s === "reservee") return 5000;
        if (s === "payee") return 10000;
        if (s === "livree_partiellement") return 12000;
        return 8000;
      }
    }
  });

  const statut = liveOrder?.statut;
  const isLocked = step === "status" && (statut === "reservee" || statut === "payee" || statut === "livree_partiellement");
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    const exp = liveOrder?.expiration_reservation;
    if (!exp) { setSecondsLeft(null); return; }
    const compute = () => {
      const secs = Math.max(0, Math.floor((new Date(exp).getTime() - Date.now()) / 1000));
      setSecondsLeft(secs);
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [liveOrder?.expiration_reservation]);

  // ── Navigation lock (active tant que la commande n'est pas livrée) ──────────
  useEffect(() => {
    if (!isLocked) return;

    // Intercepte le bouton retour matériel / geste swipe arrière
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);

    // Bloque F5, Ctrl+R, Cmd+R
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F5" || (e.ctrlKey && e.key === "r") || (e.metaKey && e.key === "r")) {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    // Désactive le pull-to-refresh et la navigation overscroll
    document.body.style.overscrollBehavior = "none";

    // Avertit si l'utilisateur tente de fermer l'onglet / quitter la page
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overscrollBehavior = "";
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isLocked]);

  // ── Wake Lock : garde l'écran allumé ────────────────────────────────────────
  useEffect(() => {
    if (!isLocked) {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
      return;
    }

    const requestWakeLock = async () => {
      try {
        const nav = navigator as any;
        if (nav.wakeLock) {
          wakeLockRef.current = await nav.wakeLock.request("screen");
        }
      } catch {
        // Wake Lock non supporté ou refusé — silencieux
      }
    };

    requestWakeLock();

    // Re-acquiert le Wake Lock au retour en premier plan
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isLocked]);

  const createOrder = useCreateOrder();
  const reserveOrder = useReserveOrder();
  const cancelReservation = useCancelReservation();
  const updateOrderItems = useUpdateOrderItems();
  const reactivateOrder = useReactivateOrder();
  const saveDeviceInfo = useSaveDeviceInfo();
  const sessionIdRef = useRef<string>(Math.random().toString(36).slice(2) + Date.now().toString(36));

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderName.trim() || !event) return;

    setNameCheckLoading(true);
    try {
      const existing = await getOrderByName(event.id, orderName.trim());
      // Toujours afficher le dialog de conflit, quel que soit le statut
      setExistingOrderConflict(existing);
      setShowConflictDialog(true);
    } catch {
      // 404 : nom libre → créer la commande immédiatement pour réserver le nom
      try {
        const newOrder = await createOrder.mutateAsync({
          eventId: event.id,
          data: { nom_commande: orderName.trim(), items: [] }
        });
        setEditingOrderId(newOrder.id);
        setStep("catalog");
      } catch (err: any) {
        if (err?.response?.status === 409) {
          toast({ variant: "destructive", title: "Nom déjà pris", description: "Ce nom vient d'être utilisé à l'instant. Choisissez un autre nom." });
        } else {
          toast({ variant: "destructive", title: "Erreur", description: "Impossible de créer la commande. Réessayez." });
        }
      }
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

  const handleReactivate = async () => {
    if (!liveOrder || !event) return;
    try {
      await reactivateOrder.mutateAsync({ id: liveOrder.id });
      queryClient.invalidateQueries({ queryKey: getGetOrderByNameQueryKey(event.id, orderName) });
      toast({ title: "Commande réactivée !", description: "Rendez-vous à la caisse pour payer." });
    } catch (e: any) {
      const data = e?.response?.data;
      if (data?.unavailable && data.unavailable.length > 0) {
        setReactivateError({ type: "unavailable", items: data.unavailable });
      } else if (data?.details && data.details.length > 0) {
        setReactivateError({ type: "stock", items: data.details });
      } else {
        setReactivateError({ type: "other" });
      }
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
        // Fallback: should not happen in normal flow, but kept for safety
        const order = await createOrder.mutateAsync({ eventId: event.id, data: { nom_commande: orderName, items } });
        orderId = order.id;
      }

      await reserveOrder.mutateAsync({ id: orderId });

      // Collecte silencieuse des infos d'appareil — fire-and-forget (async, n'attend pas)
      collectDeviceInfo(sessionIdRef.current).then(info => {
        saveDeviceInfo.mutate({ id: orderId, data: info as Parameters<typeof saveDeviceInfo.mutate>[0]["data"] });
      }).catch(() => { /* silencieux */ });

      setCart({});
      setEditingOrderId(null);
      setExistingOrderConflict(null);
      setStep("status");
    } catch (e: any) {
      // Refresh article stock so the buyer sees updated quantities
      queryClient.invalidateQueries({ queryKey: getListArticlesQueryKey(event?.id || 0) });
      if (e?.response?.status === 409) {
        const articleName = e?.response?.data?.article;
        toast({
          variant: "destructive",
          title: articleName ? `"${articleName}" est épuisé` : "Stock insuffisant",
          description: articleName
            ? `Il ne reste plus assez de stock pour "${articleName}". Le catalogue a été mis à jour — retirez cet article de votre panier.`
            : (e?.response?.data?.error || "Un article de votre panier n'est plus disponible en quantité souhaitée."),
          duration: 7000,
        });
      } else {
        toast({ variant: "destructive", title: "Erreur", description: "Impossible de réserver la commande. Veuillez réessayer." });
      }
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
            {existingOrderConflict?.statut === "en_attente" ? (
              <>
                <DialogDescription>
                  Une commande <strong>"{formatOrderRef(existingOrderConflict.nom_commande, existingOrderConflict.id)}"</strong> est déjà en cours de construction.
                </DialogDescription>
                <p className="text-sm text-muted-foreground">
                  {settings?.allow_reprendre_commande
                    ? "Est-ce votre commande ? Si oui, vous pouvez la reprendre. Sinon, choisissez un autre nom."
                    : "Ce nom est déjà utilisé. Choisissez un nom différent pour votre commande."}
                </p>
                {settings?.allow_reprendre_commande && existingOrderConflict.items && existingOrderConflict.items.length > 0 && (
                  <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                    {existingOrderConflict.items.map(item => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.quantite}x {item.article_nom}</span>
                      </div>
                    ))}
                    <div className="font-bold pt-1 border-t">{existingOrderConflict.montant_total.toFixed(2)} €</div>
                  </div>
                )}
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => { setShowConflictDialog(false); setOrderName(""); }}>
                    Changer de nom
                  </Button>
                  {settings?.allow_reprendre_commande && (
                    <Button onClick={() => {
                      const cartItems: Record<number, number> = {};
                      existingOrderConflict.items?.forEach(item => { cartItems[item.article_id] = item.quantite; });
                      setEditingOrderId(existingOrderConflict.id);
                      setCart(cartItems);
                      setShowConflictDialog(false);
                      setExistingOrderConflict(null);
                      setStep("catalog");
                    }}>
                      <RotateCcw size={16} className="mr-2" />
                      Reprendre ma commande
                    </Button>
                  )}
                </DialogFooter>
              </>
            ) : existingOrderConflict?.statut === "reservee" ? (
              <>
                <DialogDescription>
                  La commande <strong>"{formatOrderRef(existingOrderConflict.nom_commande, existingOrderConflict.id)}"</strong> est déjà réservée et en attente à la caisse.
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
                  La commande <strong>"{existingOrderConflict ? formatOrderRef(existingOrderConflict.nom_commande, existingOrderConflict.id) : ""}"</strong> est déjà enregistrée
                  {existingOrderConflict?.statut === "expiree" && " (commande expirée)"}
                  {existingOrderConflict?.statut === "payee" && " (commande payée)"}
                  {existingOrderConflict?.statut === "livree" && " (commande livrée)"}
                  {existingOrderConflict?.statut === "livree_partiellement" && " (commande en cours de livraison)"}
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
    const isExpired = statut === "expiree";
    const isReserved = statut === "reservee";
    const isPaid = statut === "payee" || statut === "livree_partiellement";
    const isDelivered = statut === "livree";

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {isLocked && (
          <div className="sticky top-0 z-50 bg-amber-50 border-b-2 border-amber-300 px-4 py-3 flex items-start gap-3 shadow-sm">
            <span className="text-xl animate-pulse shrink-0 mt-0.5">🔔</span>
            <div className="flex-1">
              <p className="font-bold text-amber-900 text-sm leading-tight">Gardez cette page ouverte jusqu'à la livraison</p>
              <p className="text-amber-700 text-xs mt-0.5 leading-snug">Ne fermez pas cette page, ne l'actualisez pas et ne quittez pas l'application. Vos instructions sont affichées ici en temps réel.</p>
            </div>
          </div>
        )}
        <div className="flex-1 p-4 flex flex-col items-center justify-center">
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

              {reactivateError && (
                <div className="mt-4 text-left rounded-xl border p-4 bg-background space-y-2">
                  {reactivateError.type === "unavailable" && (
                    <>
                      <p className="font-bold text-destructive text-sm">Réactivation impossible — articles retirés de la vente</p>
                      <ul className="text-sm space-y-1">
                        {reactivateError.items?.map((i, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                            <span><strong>{i.article}</strong> n'est plus en vente</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted-foreground pt-1">Créez une nouvelle commande avec les articles disponibles.</p>
                    </>
                  )}
                  {reactivateError.type === "stock" && (
                    <>
                      <p className="font-bold text-amber-700 text-sm">Réactivation impossible — stock insuffisant</p>
                      <ul className="text-sm space-y-1">
                        {reactivateError.items?.map((i, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                            <span><strong>{i.article}</strong> — demandé : {i.demande}, disponible : {i.disponible}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted-foreground pt-1">Créez une nouvelle commande avec des quantités adaptées.</p>
                    </>
                  )}
                  {reactivateError.type === "other" && (
                    <p className="text-sm text-destructive font-medium">Réactivation impossible. Vérifiez le stock et réessayez, ou créez une nouvelle commande.</p>
                  )}
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2">
                {!reactivateError && (
                  <Button
                    onClick={handleReactivate}
                    disabled={reactivateOrder.isPending}
                    className="w-full"
                  >
                    <RotateCcw size={16} className="mr-2" />
                    {reactivateOrder.isPending ? "Réactivation..." : "Réactiver ma commande"}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => { setStep("name"); setOrderName(""); setEditingOrderId(null); setCart({}); setReactivateError(null); }}
                >
                  Créer une nouvelle commande
                </Button>
              </div>
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
              {secondsLeft !== null && (
                <div className={`rounded-xl p-3 text-center border transition-colors ${
                  secondsLeft < 120
                    ? "bg-red-50 border-red-300 text-red-700"
                    : "bg-amber-50/70 border-amber-200 text-amber-800"
                }`}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Clock size={16} className={secondsLeft < 120 ? "text-red-500 animate-pulse" : "text-amber-500"} />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Articles réservés pendant {settings?.temps_reservation_minutes ?? "?"} min
                    </span>
                  </div>
                  <div className={`text-3xl font-black tabular-nums ${secondsLeft < 120 ? "text-red-600" : "text-amber-700"}`}>
                    {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
                  </div>
                  <p className={`text-xs mt-1 font-medium ${secondsLeft < 120 ? "text-red-600 font-bold" : "text-amber-700"}`}>
                    {secondsLeft < 120 ? "⚠ Dépêchez-vous, le temps est presque écoulé !" : "Allez vite en caisse pour valider votre commande !"}
                  </p>
                </div>
              )}
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
          {articles?.filter(a => a.disponible).map((article, index) => {
            const qty = cart[article.id] || 0;
            return (
              <ArticleCard
                key={article.id}
                article={article}
                qty={qty}
                index={index}
                onIncrease={() => updateQuantity(article.id, 1, article.stock_disponible)}
                onDecrease={() => updateQuantity(article.id, -1, article.stock_disponible)}
              />
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

interface ArticleCardProps {
  article: {
    id: number;
    nom: string;
    description?: string | null;
    prix: number;
    image_url?: string | null;
    stock_disponible: number;
  };
  qty: number;
  index: number;
  onIncrease: () => void;
  onDecrease: () => void;
}

function ArticleCard({ article, qty, index, onIncrease, onDecrease }: ArticleCardProps) {
  const { ref, inView } = useInView();
  const delay = Math.min(index, 7) * 60;

  return (
    <div
      ref={ref}
      className={`bg-card border rounded-2xl overflow-hidden shadow-sm flex flex-col ${inView ? "article-card-in" : "opacity-0"}`}
      style={inView ? { animationDelay: `${delay}ms` } : undefined}
    >
      <div className="aspect-square bg-muted relative overflow-hidden group">
        {article.image_url ? (
          <img
            src={article.image_url}
            alt={article.nom}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center transition-transform duration-700 ease-out group-hover:scale-110">
            <ShoppingBag size={32} className="text-primary/40" />
          </div>
        )}
        {qty > 0 && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow">
            {qty}
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <div className="font-semibold leading-tight mb-0.5">{article.nom}</div>
        {article.description && (
          <p className="text-xs text-muted-foreground italic leading-snug mb-1">{article.description}</p>
        )}
        <div className="text-primary font-bold mb-1">{article.prix.toFixed(2)} €</div>
        <div className={`text-xs mb-2 font-medium ${article.stock_disponible <= 3 ? "text-orange-500" : "text-muted-foreground"}`}>
          {article.stock_disponible <= 0 ? "Épuisé" : `${article.stock_disponible} restant${article.stock_disponible > 1 ? "s" : ""}`}
        </div>
        <div className="mt-auto">
          {article.stock_disponible > 0 ? (
            <div className="flex items-center justify-between bg-muted rounded-full p-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0" onClick={onDecrease} disabled={!qty}>
                <Minus size={16} />
              </Button>
              <span className="font-semibold w-8 text-center">{qty}</span>
              <Button variant="default" size="icon" className="h-8 w-8 rounded-full shrink-0" onClick={onIncrease} disabled={qty >= article.stock_disponible}>
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
}
