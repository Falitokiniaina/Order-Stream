import { useRoute } from "wouter";
import { formatOrderRef } from "@/lib/utils";
import { useGetEventBySlug, getGetEventBySlugQueryKey, useListOrders, getListOrdersQueryKey, useDeliverOrderPartial, useGetOrdersSummary, getGetOrdersSummaryQueryKey } from "@workspace/api-client-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { PasswordGate } from "@/components/password-gate";
import { LoginInputRole } from "@workspace/api-client-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChefHat, Check, Package, Search, ListTodo, ClipboardList } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

export default function PreparateurPage() {
  const [, params] = useRoute("/:slug/preparateur");
  const slug = params?.slug;
  usePageTitle(`Préparateur · ${slug ?? ""}`);

  return (
    <PasswordGate role={LoginInputRole.preparateur} eventSlug={slug}>
      <PreparateurContent slug={slug!} />
    </PasswordGate>
  );
}

function PreparateurContent({ slug }: { slug: string }) {
  const { data: event } = useGetEventBySlug(slug, { query: { enabled: !!slug, queryKey: getGetEventBySlugQueryKey(slug) } });
  const { data: orders } = useListOrders(event?.id || 0, { 
    query: { enabled: !!event?.id, queryKey: getListOrdersQueryKey(event?.id || 0), refetchInterval: 10000 } 
  });
  const { data: summary } = useGetOrdersSummary(event?.id || 0, {
    query: { enabled: !!event?.id, queryKey: getGetOrdersSummaryQueryKey(event?.id || 0), refetchInterval: 10000 }
  });

  const [searchHistory, setSearchHistory] = useState("");
  const [searchToPrepare, setSearchToPrepare] = useState("");
  const [selectedOrderForPartial, setSelectedOrderForPartial] = useState<number | null>(null);
  const [showArticlesPopup, setShowArticlesPopup] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deliverPartial = useDeliverOrderPartial();

  const allToPrepare = useMemo(() => {
    if (!orders) return [];
    return orders.filter(o => o.statut === 'payee' || o.statut === 'livree_partiellement');
  }, [orders]);

  const toPrepare = useMemo(() => {
    let list = allToPrepare;
    if (searchToPrepare) {
      list = list.filter(o => o.nom_commande.toLowerCase().includes(searchToPrepare.toLowerCase()));
    }
    return list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [allToPrepare, searchToPrepare]);

  const articlesToPrepare = useMemo(() => {
    const map = new Map<number, { nom: string; quantite: number }>();
    allToPrepare.forEach(order => {
      order.items?.forEach(item => {
        if (item.statut_livraison === 'non_livre') {
          const prev = map.get(item.article_id) || { nom: item.article_nom ?? "", quantite: 0 };
          map.set(item.article_id, { nom: item.article_nom ?? prev.nom, quantite: prev.quantite + item.quantite });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => b.quantite - a.quantite);
  }, [allToPrepare]);

  const history = useMemo(() => {
    if (!orders) return [];
    let h = orders.filter(o => o.statut === 'livree');
    if (searchHistory) {
      h = h.filter(o => o.nom_commande.toLowerCase().includes(searchHistory.toLowerCase()));
    }
    return h.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 50);
  }, [orders, searchHistory]);

  const openPartialDelivery = (orderId: number) => {
    const order = orders?.find(o => o.id === orderId);
    if (!order) return;
    const nonLivre = order.items?.filter(i => i.statut_livraison === 'non_livre').map(i => i.id) || [];
    setSelectedItems(nonLivre);
    setSelectedOrderForPartial(orderId);
  };

  const handleDeliverPartialSubmit = async () => {
    if (!selectedOrderForPartial || !event) return;
    try {
      await deliverPartial.mutateAsync({
        id: selectedOrderForPartial,
        data: { item_ids: selectedItems }
      });
      queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey(event.id) });
      queryClient.invalidateQueries({ queryKey: getGetOrdersSummaryQueryKey(event.id) });
      setSelectedOrderForPartial(null);
      toast({ title: "Livraison partielle validée" });
    } catch (e) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const toggleItem = (id: number) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const currentOrder = orders?.find(o => o.id === selectedOrderForPartial);

  if (!event) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-black flex items-center gap-2">
              <ChefHat size={28} />
              Préparation
            </h1>
            <div className="text-primary-foreground/80 text-sm font-medium">{event.nom}</div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-primary-foreground/10 rounded-lg p-3 text-center">
              <div className="text-3xl font-black">{allToPrepare.length}</div>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-80">NB commandes à livrer</div>
            </div>
            <button
              className="bg-primary-foreground/10 rounded-lg p-3 text-center hover:bg-primary-foreground/20 transition-colors cursor-pointer group"
              onClick={() => setShowArticlesPopup(true)}
            >
              <div className="text-3xl font-black">{summary?.articles_a_preparer || 0}</div>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-80 flex items-center justify-center gap-1">
                <ClipboardList size={12} className="group-hover:scale-110 transition-transform" />
                Articles à préparer
              </div>
            </button>
            <div className="bg-primary-foreground/10 rounded-lg p-3 text-center">
              <div className="text-3xl font-black">{summary?.livrees_aujourd_hui || 0}</div>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Livrées (Aujourd'hui)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-6xl mx-auto w-full">
        <Tabs defaultValue="todo" className="w-full">
          <TabsList className="mb-6 w-full max-w-md mx-auto grid grid-cols-2">
            <TabsTrigger value="todo" className="text-base"><ListTodo size={18} className="mr-2" /> À Préparer</TabsTrigger>
            <TabsTrigger value="history" className="text-base"><Check size={18} className="mr-2" /> Historique</TabsTrigger>
          </TabsList>
          
          <TabsContent value="todo">
            <div className="mb-4 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Rechercher un nom..."
                value={searchToPrepare}
                onChange={(e) => setSearchToPrepare(e.target.value)}
                className="pl-10"
              />
            </div>
            {toPrepare.length === 0 ? (
              <div className="text-center py-20 bg-card border rounded-2xl">
                <ChefHat size={64} className="mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-xl text-muted-foreground font-medium">Aucune commande à préparer.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {toPrepare.map(order => (
                  <div key={order.id} className="bg-card border-2 border-secondary/20 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                    <div className="bg-secondary/10 p-4 border-b border-secondary/20 flex justify-between items-center">
                      <div className="text-xl font-black text-foreground capitalize">{formatOrderRef(order.nom_commande, order.id)}</div>
                      <div className="text-xs font-bold text-secondary uppercase bg-secondary/20 px-2 py-1 rounded-full">
                        {order.statut === 'livree_partiellement' ? 'Partiel' : 'Nouveau'}
                      </div>
                    </div>
                    
                    <div className="p-4 flex-1">
                      <ul className="space-y-3">
                        {order.items?.map(item => (
                          <li key={item.id} className={`flex items-start gap-3 ${item.statut_livraison === 'livre' ? 'opacity-40' : ''}`}>
                            <div className={`font-black text-lg w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.statut_livraison === 'livre' ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'}`}>
                              {item.quantite}
                            </div>
                            <div className="pt-1">
                              <span className="font-semibold text-lg leading-tight block">{item.article_nom}</span>
                              {item.statut_livraison === 'livre' && <span className="text-xs font-bold text-green-600">Déjà livré</span>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="p-4 bg-muted/30 border-t grid grid-cols-2 gap-2">
                      <Button variant="outline" className="font-bold border-2" onClick={() => openPartialDelivery(order.id)}>
                        <Package size={16} className="mr-2" /> Partiel
                      </Button>
                      <Button className="font-bold shadow-md hover:scale-105 transition-transform" onClick={() => openPartialDelivery(order.id)}>
                        <Check size={16} className="mr-2" /> Tout Livrer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="history">
            <div className="mb-4 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input 
                placeholder="Rechercher dans l'historique..." 
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="bg-card border rounded-xl overflow-hidden">
              {history.map(order => (
                <div key={order.id} className="p-4 border-b last:border-0 flex justify-between items-center hover:bg-muted/50">
                  <div>
                    <div className="font-bold text-lg capitalize">{formatOrderRef(order.nom_commande, order.id)}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.items?.map(i => `${i.quantite}x ${i.article_nom}`).join(", ")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-600 flex items-center justify-end gap-1">
                      <Check size={14} /> Livrée
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(order.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              ))}
              {history.length === 0 && <div className="p-8 text-center text-muted-foreground">Aucune commande trouvée.</div>}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedOrderForPartial} onOpenChange={(open) => !open && setSelectedOrderForPartial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Livraison Partielle : {currentOrder ? formatOrderRef(currentOrder.nom_commande, currentOrder.id) : ""}</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">Sélectionnez les articles que vous allez livrer maintenant.</p>
            <div className="space-y-3 bg-muted/50 p-4 rounded-xl border">
              {currentOrder?.items?.map(item => {
                const delivered = item.statut_livraison === 'livre';
                return (
                  <div key={item.id} className={`flex items-center space-x-3 ${delivered ? 'opacity-50' : ''}`}>
                    <Checkbox 
                      id={`item-${item.id}`} 
                      checked={delivered || selectedItems.includes(item.id)}
                      onCheckedChange={() => !delivered && toggleItem(item.id)}
                      disabled={delivered}
                      className={delivered ? 'cursor-not-allowed' : ''}
                    />
                    <label 
                      htmlFor={`item-${item.id}`} 
                      className={`text-base font-medium leading-none flex-1 ${delivered ? 'line-through text-muted-foreground cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className="font-bold">{item.quantite}x</span> {item.article_nom}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrderForPartial(null)}>Annuler</Button>
            <Button onClick={handleDeliverPartialSubmit} disabled={selectedItems.length === 0 || deliverPartial.isPending}>
              Valider la livraison
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showArticlesPopup} onOpenChange={setShowArticlesPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList size={20} className="text-primary" />
              Articles à préparer
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {articlesToPrepare.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Aucun article à préparer.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-muted-foreground uppercase text-xs tracking-wider">
                    <th className="pb-2 text-left font-semibold">Article</th>
                    <th className="pb-2 text-right font-semibold">Quantité à préparer</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {articlesToPrepare.map((a, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="py-3 font-medium">{a.nom}</td>
                      <td className="py-3 text-right">
                        <span className="bg-primary text-primary-foreground font-black text-lg px-3 py-1 rounded-full">
                          {a.quantite}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t">
                  <tr>
                    <td className="pt-3 font-bold text-muted-foreground">Total</td>
                    <td className="pt-3 text-right font-black text-primary text-lg">
                      {articlesToPrepare.reduce((s, a) => s + a.quantite, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowArticlesPopup(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}