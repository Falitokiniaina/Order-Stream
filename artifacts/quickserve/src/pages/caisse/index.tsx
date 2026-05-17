import { useRoute } from "wouter";
import { useGetEventBySlug, getGetEventBySlugQueryKey, useListOrders, getListOrdersQueryKey, usePayOrder, useReactivateOrder } from "@workspace/api-client-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { PasswordGate } from "@/components/password-gate";
import { LoginInputRole } from "@workspace/api-client-react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, CreditCard, Banknote, Receipt, CheckCircle, Clock, History, AlertTriangle, RotateCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CaissePage() {
  const [, params] = useRoute("/:slug/caisse");
  const slug = params?.slug;
  usePageTitle(`Caisse · ${slug ?? ""}`);
  return (
    <PasswordGate role={LoginInputRole.caisse} eventSlug={slug}>
      <CaisseContent slug={slug!} />
    </PasswordGate>
  );
}

function CaisseContent({ slug }: { slug: string }) {
  const { data: event } = useGetEventBySlug(slug, { query: { enabled: !!slug, queryKey: getGetEventBySlugQueryKey(slug) } });
  const { data: orders } = useListOrders(event?.id || 0, {
    query: { enabled: !!event?.id, queryKey: getListOrdersQueryKey(event?.id || 0), refetchInterval: 5000 }
  });
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const payOrder = usePayOrder();
  const reactivateOrder = useReactivateOrder();

  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [payment, setPayment] = useState({ cb: 0, especes: 0, cheque: 0 });

  const reservedOrders = useMemo(() => {
    if (!orders) return [];
    let filtered = orders.filter(o => o.statut === "reservee");
    if (search) filtered = filtered.filter(o => o.nom_commande.toLowerCase().includes(search.toLowerCase()));
    return filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [orders, search]);

  const historique = useMemo(() => {
    if (!orders) return [];
    let filtered = orders.filter(o => ["payee", "livree_partiellement", "livree"].includes(o.statut));
    if (search) filtered = filtered.filter(o => o.nom_commande.toLowerCase().includes(search.toLowerCase()));
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, search]);

  const expiredOrders = useMemo(() => {
    if (!orders) return [];
    let filtered = orders.filter(o => o.statut === "expiree");
    if (search) filtered = filtered.filter(o => o.nom_commande.toLowerCase().includes(search.toLowerCase()));
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, search]);

  const handlePayClick = (orderId: number, total: number) => {
    setSelectedOrder(orderId);
    setPayment({ cb: total, especes: 0, cheque: 0 });
  };

  const handlePaymentSubmit = async () => {
    if (!selectedOrder || !event) return;
    try {
      await payOrder.mutateAsync({ id: selectedOrder, data: { paye_cb: payment.cb, paye_especes: payment.especes, paye_cheque: payment.cheque } });
      queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey(event.id) });
      setSelectedOrder(null);
      toast({ title: "Commande encaissée avec succès !" });
    } catch (e) {
      toast({ title: "Erreur lors de l'encaissement", variant: "destructive" });
    }
  };

  const [reactivateErrors, setReactivateErrors] = useState<Record<number, {
    type: "unavailable" | "stock" | "other";
    items?: { article: string; demande?: number; disponible?: number }[];
  }>>({});

  const handleReactivate = async (orderId: number) => {
    if (!event) return;
    setReactivateErrors(prev => { const next = { ...prev }; delete next[orderId]; return next; });
    try {
      await reactivateOrder.mutateAsync({ id: orderId });
      queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey(event.id) });
      toast({ title: "Commande réactivée !", description: "La commande est maintenant réservée." });
    } catch (e: any) {
      const data = e?.response?.data;
      if (data?.unavailable && data.unavailable.length > 0) {
        setReactivateErrors(prev => ({ ...prev, [orderId]: { type: "unavailable", items: data.unavailable } }));
      } else if (data?.details && data.details.length > 0) {
        setReactivateErrors(prev => ({ ...prev, [orderId]: { type: "stock", items: data.details } }));
      } else {
        setReactivateErrors(prev => ({ ...prev, [orderId]: { type: "other" } }));
      }
    }
  };

  const currentOrder = orders?.find(o => o.id === selectedOrder);
  const paymentTotal = payment.cb + payment.especes + payment.cheque;
  const paymentValid = currentOrder && Math.abs(paymentTotal - currentOrder.montant_total) < 0.01;

  if (!event) return <div className="p-8 text-center">Chargement...</div>;

  const statusBadge = (statut: string) => {
    const map: Record<string, string> = {
      payee: "bg-blue-100 text-blue-700",
      livree_partiellement: "bg-purple-100 text-purple-700",
      livree: "bg-green-100 text-green-700",
    };
    const labels: Record<string, string> = {
      payee: "Payée",
      livree_partiellement: "Part. livrée",
      livree: "Livrée",
    };
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[statut] || "bg-muted text-muted-foreground"}`}>{labels[statut] || statut}</span>;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-primary flex items-center gap-2"><Banknote size={24} />Caisse</h1>
            <p className="text-sm text-muted-foreground">{event.nom}</p>
          </div>
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input placeholder="Rechercher un nom..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-background" />
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-5xl mx-auto w-full">
        <Tabs defaultValue="attente">
          <TabsList className="mb-6 h-12 bg-muted/50 p-1">
            <TabsTrigger value="attente" className="h-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Clock size={16} className="mr-2" />
              Réservées à payer
              {reservedOrders.length > 0 && <span className="ml-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">{reservedOrders.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="expirees" className="h-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <AlertTriangle size={16} className="mr-2" />
              Expirées ({expiredOrders.length})
            </TabsTrigger>
            <TabsTrigger value="historique" className="h-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <History size={16} className="mr-2" />
              Historique ({historique.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attente">
            {reservedOrders.length === 0 ? (
              <div className="text-center py-16 bg-card border border-dashed rounded-2xl">
                <CheckCircle size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-lg text-muted-foreground font-medium">Aucune commande en attente.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reservedOrders.map(order => (
                  <div key={order.id} className="bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="text-xl font-black leading-none capitalize">{order.nom_commande}</div>
                      </div>
                      <div className="text-xl font-bold text-primary">{order.montant_total.toFixed(2)} €</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 mb-4 flex-1">
                      <ul className="text-sm space-y-1.5">
                        {order.items?.map(item => (
                          <li key={item.id} className="flex justify-between">
                            <span><span className="font-medium">{item.quantite}x</span> {item.article_nom}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button size="lg" className="w-full font-bold text-base" onClick={() => handlePayClick(order.id, order.montant_total)}>
                      Encaisser
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="historique">
            {historique.length === 0 ? (
              <div className="text-center py-16 bg-card border border-dashed rounded-2xl">
                <History size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-lg text-muted-foreground font-medium">Aucune commande payée pour le moment.</p>
              </div>
            ) : (
              <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Nom</th>
                      <th className="px-4 py-3 text-left font-semibold">Articles</th>
                      <th className="px-4 py-3 text-right font-semibold">Total</th>
                      <th className="px-4 py-3 text-right font-semibold">Paiement</th>
                      <th className="px-4 py-3 text-center font-semibold">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {historique.map(order => (
                      <tr key={order.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-bold capitalize">{order.nom_commande}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {order.items?.map(i => `${i.quantite}x ${i.article_nom}`).join(", ")}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary">{order.montant_total.toFixed(2)} €</td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {(order.paye_cb ?? 0) > 0 && <span className="mr-1">CB: {(order.paye_cb ?? 0).toFixed(2)}€</span>}
                          {(order.paye_especes ?? 0) > 0 && <span className="mr-1">Esp: {(order.paye_especes ?? 0).toFixed(2)}€</span>}
                          {(order.paye_cheque ?? 0) > 0 && <span>Chq: {(order.paye_cheque ?? 0).toFixed(2)}€</span>}
                        </td>
                        <td className="px-4 py-3 text-center">{statusBadge(order.statut)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="expirees">
            {expiredOrders.length === 0 ? (
              <div className="text-center py-16 bg-card border border-dashed rounded-2xl">
                <AlertTriangle size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-lg text-muted-foreground font-medium">Aucune commande expirée.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Vous pouvez réactiver une commande expirée si le stock est suffisant. Sinon, l'acheteur devra créer une nouvelle commande.
                </p>
                {expiredOrders.map(order => {
                  const err = reactivateErrors[order.id];
                  return (
                    <div key={order.id} className="bg-card border border-orange-200 rounded-2xl p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-black text-lg capitalize">{order.nom_commande}</span>
                            <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {order.items?.map(i => `${i.quantite}x ${i.article_nom}`).join(", ")}
                          </div>
                          <div className="font-bold text-primary mt-1">{order.montant_total.toFixed(2)} €</div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                          onClick={() => handleReactivate(order.id)}
                          disabled={reactivateOrder.isPending}
                        >
                          <RotateCcw size={14} className="mr-2" />
                          Réactiver
                        </Button>
                      </div>
                      {err && (
                        <div className="rounded-lg border px-4 py-3 text-sm space-y-1.5 bg-background">
                          {err.type === "unavailable" && (
                            <>
                              <p className="font-semibold text-destructive">Articles retirés de la vente</p>
                              <ul className="space-y-0.5">
                                {err.items?.map((i, idx) => (
                                  <li key={idx} className="flex items-center gap-2 text-muted-foreground">
                                    <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                                    <span><strong>{i.article}</strong> n'est plus proposé à la vente</span>
                                  </li>
                                ))}
                              </ul>
                              <p className="text-xs text-muted-foreground">L'acheteur doit créer une nouvelle commande.</p>
                            </>
                          )}
                          {err.type === "stock" && (
                            <>
                              <p className="font-semibold text-amber-700">Stock insuffisant</p>
                              <ul className="space-y-0.5">
                                {err.items?.map((i, idx) => (
                                  <li key={idx} className="flex items-center gap-2 text-muted-foreground">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                    <span><strong>{i.article}</strong> — demandé : {i.demande}, disponible : {i.disponible}</span>
                                  </li>
                                ))}
                              </ul>
                              <p className="text-xs text-muted-foreground">L'acheteur doit créer une nouvelle commande avec des quantités adaptées.</p>
                            </>
                          )}
                          {err.type === "other" && (
                            <p className="text-destructive font-medium">Réactivation impossible. Vérifiez les stocks ou demandez à l'acheteur de créer une nouvelle commande.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Encaisser : <span className="capitalize">{currentOrder?.nom_commande}</span></DialogTitle>
            <DialogDescription>Total à payer : {currentOrder?.montant_total.toFixed(2)} €</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cb" className="flex items-center gap-2"><CreditCard size={16} /> Carte Bancaire</Label>
              <Input id="cb" type="number" step="0.01" value={payment.cb || ""} onChange={(e) => setPayment(p => ({ ...p, cb: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="especes" className="flex items-center gap-2"><Banknote size={16} /> Espèces</Label>
              <Input id="especes" type="number" step="0.01" value={payment.especes || ""} onChange={(e) => setPayment(p => ({ ...p, especes: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cheque" className="flex items-center gap-2"><Receipt size={16} /> Chèque</Label>
              <Input id="cheque" type="number" step="0.01" value={payment.cheque || ""} onChange={(e) => setPayment(p => ({ ...p, cheque: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className={`p-4 rounded-xl font-bold flex justify-between items-center ${paymentValid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              <span>Total saisi :</span>
              <span className="text-xl">{paymentTotal.toFixed(2)} €</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>Annuler</Button>
            <Button onClick={handlePaymentSubmit} disabled={!paymentValid || payOrder.isPending}>
              {payOrder.isPending ? "Encaissement..." : "Valider l'encaissement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
