import { useRoute } from "wouter";
import { useGetEventBySlug, useListOrders, getListOrdersQueryKey, usePayOrder } from "@workspace/api-client-react";
import { PasswordGate } from "@/components/password-gate";
import { LoginInputRole } from "@workspace/api-client-react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, CreditCard, Banknote, Receipt, CheckCircle, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function CaissePage() {
  const [, params] = useRoute("/:slug/caisse");
  const slug = params?.slug;

  return (
    <PasswordGate role={LoginInputRole.caisse} eventSlug={slug}>
      <CaisseContent slug={slug!} />
    </PasswordGate>
  );
}

function CaisseContent({ slug }: { slug: string }) {
  const { data: event } = useGetEventBySlug(slug, { query: { enabled: !!slug } });
  const { data: orders } = useListOrders(event?.id || 0, { 
    query: { enabled: !!event?.id, queryKey: getListOrdersQueryKey(event?.id || 0), refetchInterval: 5000 } 
  });
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const payOrder = usePayOrder();

  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [payment, setPayment] = useState({ cb: 0, especes: 0, cheque: 0 });

  const reservedOrders = useMemo(() => {
    if (!orders) return [];
    let filtered = orders.filter(o => o.statut === 'reservee');
    if (search) {
      filtered = filtered.filter(o => o.nom_commande.toLowerCase().includes(search.toLowerCase()));
    }
    return filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [orders, search]);

  const handlePayClick = (orderId: number, total: number) => {
    setSelectedOrder(orderId);
    setPayment({ cb: total, especes: 0, cheque: 0 });
  };

  const handlePaymentSubmit = async () => {
    if (!selectedOrder || !event) return;
    try {
      await payOrder.mutateAsync({
        id: selectedOrder,
        data: {
          paye_cb: payment.cb,
          paye_especes: payment.especes,
          paye_cheque: payment.cheque
        }
      });
      queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey(event.id) });
      setSelectedOrder(null);
      toast({ title: "Commande encaissée avec succès !", variant: "default" });
    } catch (e) {
      toast({ title: "Erreur lors de l'encaissement", variant: "destructive" });
    }
  };

  const currentOrder = orders?.find(o => o.id === selectedOrder);
  const paymentTotal = payment.cb + payment.especes + payment.cheque;
  const paymentValid = currentOrder && Math.abs(paymentTotal - currentOrder.montant_total) < 0.01;

  if (!event) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-primary flex items-center gap-2">
              <Banknote size={24} />
              Caisse
            </h1>
            <p className="text-sm text-muted-foreground">{event.nom}</p>
          </div>
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              placeholder="Rechercher un nom..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-5xl mx-auto w-full">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock size={18} className="text-secondary" />
            Commandes en attente de paiement ({reservedOrders.length})
          </h2>
        </div>

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
                      {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <div className="text-xl font-black leading-none">{order.nom_commande}</div>
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
                
                <Button 
                  size="lg" 
                  className="w-full font-bold text-base" 
                  onClick={() => handlePayClick(order.id, order.montant_total)}
                >
                  Encaisser
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Encaisser : {currentOrder?.nom_commande}</DialogTitle>
            <DialogDescription>Total à payer : {currentOrder?.montant_total.toFixed(2)} €</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cb" className="flex items-center gap-2">
                <CreditCard size={16} /> Carte Bancaire
              </Label>
              <Input 
                id="cb" 
                type="number" 
                step="0.01" 
                value={payment.cb || ""} 
                onChange={(e) => setPayment(p => ({ ...p, cb: parseFloat(e.target.value) || 0 }))} 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="especes" className="flex items-center gap-2">
                <Banknote size={16} /> Espèces
              </Label>
              <Input 
                id="especes" 
                type="number" 
                step="0.01" 
                value={payment.especes || ""} 
                onChange={(e) => setPayment(p => ({ ...p, especes: parseFloat(e.target.value) || 0 }))} 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cheque" className="flex items-center gap-2">
                <Receipt size={16} /> Chèque
              </Label>
              <Input 
                id="cheque" 
                type="number" 
                step="0.01" 
                value={payment.cheque || ""} 
                onChange={(e) => setPayment(p => ({ ...p, cheque: parseFloat(e.target.value) || 0 }))} 
              />
            </div>
            
            <div className={`p-4 rounded-xl font-bold flex justify-between items-center ${paymentValid ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
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