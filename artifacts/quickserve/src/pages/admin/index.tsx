import { PasswordGate } from "@/components/password-gate";
import { LoginInputRole } from "@workspace/api-client-react";
import {
  useListEvents, getListEventsQueryKey,
  useCreateEvent, useUpdateEvent,
  useGetDashboard, getGetDashboardQueryKey,
  useGetSettings, getGetSettingsQueryKey, useUpdateSettings,
  useListArticles, getListArticlesQueryKey,
  useCreateArticle, useUpdateArticle, useDeleteArticle,
  useListOrders, getListOrdersQueryKey
} from "@workspace/api-client-react";
import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from "recharts";
import { Settings, BarChart3, Package as PackageIcon, Plus, Save, Trash2, LogOut, CalendarPlus, List, Search, Camera, Info } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function AdminPage() {
  return (
    <PasswordGate role={LoginInputRole.admin}>
      <AdminContent />
    </PasswordGate>
  );
}

function AdminContent() {
  const { data: events } = useListEvents();
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [showNewEventDialog, setShowNewEventDialog] = useState(false);
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createEvent = useCreateEvent();

  const [newEventForm, setNewEventForm] = useState({ nom: "", slug_url: "" });

  useMemo(() => {
    if (events && events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const handleCreateEvent = async () => {
    if (!newEventForm.nom.trim() || !newEventForm.slug_url.trim()) return;
    try {
      const created = await createEvent.mutateAsync({
        data: { nom: newEventForm.nom, slug_url: newEventForm.slug_url, actif: true }
      });
      queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
      setSelectedEventId(created.id);
      setShowNewEventDialog(false);
      setNewEventForm({ nom: "", slug_url: "" });
      toast({ title: "Événement créé !", description: `Slug : /${created.slug_url}` });
    } catch (e) {
      toast({ title: "Erreur lors de la création", variant: "destructive" });
    }
  };

  const slugify = (str: string) =>
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b p-4 shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 text-primary font-bold text-xl">
            <Settings size={24} />
            Administration QuickServe
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedEventId?.toString()} onValueChange={(v) => setSelectedEventId(Number(v))}>
              <SelectTrigger className="w-[220px] font-semibold">
                <SelectValue placeholder="Sélectionner un événement" />
              </SelectTrigger>
              <SelectContent>
                {events?.map(e => (
                  <SelectItem key={e.id} value={e.id.toString()}>{e.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setShowNewEventDialog(true)}>
              <CalendarPlus size={16} className="mr-2" /> Nouvel événement
            </Button>
            <Button variant="ghost" size="icon" onClick={logout} title="Déconnexion">
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-6xl mx-auto w-full">
        {selectedEventId ? (
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="mb-6 grid grid-cols-4 h-14 bg-muted/50 p-1">
              <TabsTrigger value="dashboard" className="text-sm h-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <BarChart3 size={16} className="mr-1.5" /> Tableau de bord
              </TabsTrigger>
              <TabsTrigger value="commandes" className="text-sm h-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <List size={16} className="mr-1.5" /> Commandes
              </TabsTrigger>
              <TabsTrigger value="stock" className="text-sm h-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <PackageIcon size={16} className="mr-1.5" /> Stock & Menu
              </TabsTrigger>
              <TabsTrigger value="config" className="text-sm h-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <Settings size={16} className="mr-1.5" /> Configuration
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard"><DashboardTab eventId={selectedEventId} /></TabsContent>
            <TabsContent value="commandes"><CommandesTab eventId={selectedEventId} /></TabsContent>
            <TabsContent value="stock"><StockTab eventId={selectedEventId} /></TabsContent>
            <TabsContent value="config"><ConfigTab eventId={selectedEventId} /></TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <CalendarPlus size={48} className="mx-auto mb-4 text-muted-foreground/40" />
            <p className="text-lg font-medium mb-4">Aucun événement trouvé</p>
            <Button onClick={() => setShowNewEventDialog(true)}>
              <CalendarPlus size={16} className="mr-2" /> Créer le premier événement
            </Button>
          </div>
        )}
      </main>

      <Dialog open={showNewEventDialog} onOpenChange={setShowNewEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel événement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Nom de l'événement</Label>
              <Input
                placeholder="Festival de l'été 2026"
                value={newEventForm.nom}
                onChange={e => setNewEventForm({ nom: e.target.value, slug_url: slugify(e.target.value) })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Slug URL</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">/</span>
                <Input
                  placeholder="festival-ete-2026"
                  value={newEventForm.slug_url}
                  onChange={e => setNewEventForm({ ...newEventForm, slug_url: slugify(e.target.value) })}
                />
              </div>
              <p className="text-xs text-muted-foreground">Adresse d'accès acheteur : <strong>/{newEventForm.slug_url || "..."}</strong></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewEventDialog(false)}>Annuler</Button>
            <Button onClick={handleCreateEvent} disabled={!newEventForm.nom.trim() || !newEventForm.slug_url.trim() || createEvent.isPending}>
              {createEvent.isPending ? "Création..." : "Créer l'événement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DashboardTab({ eventId }: { eventId: number }) {
  const { data: stats } = useGetDashboard(eventId, { query: { enabled: !!eventId, queryKey: getGetDashboardQueryKey(eventId), refetchInterval: 30000 } });

  if (!stats) return <div>Chargement des statistiques...</div>;

  const paymentData = [
    { name: "CB", value: stats.ca_cb, color: "hsl(var(--chart-1))" },
    { name: "Espèces", value: stats.ca_especes, color: "hsl(var(--chart-2))" },
    { name: "Chèques", value: stats.ca_cheque, color: "hsl(var(--chart-3))" }
  ].filter(d => d.value > 0);

  const topArticlesData = stats.top_articles.map(a => ({
    name: a.nom,
    ventes: a.total_vendu,
    ca: a.chiffre_affaires
  }));

  const statusConfig = [
    { key: "nb_commandes_en_attente",          label: "En attente",         color: "text-muted-foreground", desc: "Panier créé par l'acheteur, pas encore réservé." },
    { key: "nb_commandes_reservees",            label: "Réservée",           color: "text-amber-600",        desc: "Stock bloqué, commande en attente à la caisse." },
    { key: "nb_commandes_expirees",             label: "Expirée",            color: "text-destructive",      desc: "La réservation n'a pas été payée à temps (timer automatique)." },
    { key: "nb_commandes_payees",               label: "Payée",              color: "text-blue-600",         desc: "Commande réglée par le caissier, en attente de préparation." },
    { key: "nb_commandes_livrees_partiellement",label: "Livrée part.",       color: "text-orange-500",       desc: "Certains articles remis, d'autres encore en attente de livraison." },
    { key: "nb_commandes_livrees",              label: "Livrée",             color: "text-green-600",        desc: "Commande complètement remise au client par le préparateur." },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        {/* CA Card */}
        <div className="bg-primary text-primary-foreground p-6 rounded-2xl shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-wider opacity-80 mb-1">Chiffre d'affaires</div>
          <div className="text-4xl font-black mb-4">{stats.ca_total.toFixed(2)} €</div>
          <div className="grid grid-cols-3 gap-2 border-t border-primary-foreground/20 pt-4">
            {[
              { label: "CB",       value: stats.ca_cb },
              { label: "Espèces", value: stats.ca_especes },
              { label: "Chèques", value: stats.ca_cheque },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-lg font-black">{value.toFixed(2)} €</div>
                <div className="text-xs font-semibold opacity-70 uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Nbr Commandes Card */}
        <div className="bg-card border p-6 rounded-2xl shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Nbr Commandes</div>
          <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-3 gap-3">
              {statusConfig.map(({ key, label, color, desc }) => (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center bg-muted/40 hover:bg-muted/70 rounded-xl p-3 cursor-default transition-colors">
                      <div className={`text-3xl font-black ${color}`}>{stats[key]}</div>
                      <div className="text-xs font-semibold text-muted-foreground mt-1 text-center leading-tight">{label}</div>
                      <Info size={11} className="text-muted-foreground/40 mt-1" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px] text-center text-xs">
                    <p className="font-semibold mb-0.5">{label}</p>
                    <p>{desc}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-6">Répartition des paiements</h3>
          {paymentData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Aucune vente pour le moment</div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => `${value.toFixed(2)} €`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-6">Top Articles (Ventes)</h3>
          {topArticlesData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Aucune vente pour le moment</div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topArticlesData} layout="vertical" margin={{ top: 5, right: 50, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                  <RechartsTooltip formatter={(v: number, name: string) => [name === "ventes" ? `${v} vendus` : `${v.toFixed(2)} €`, name === "ventes" ? "Quantité" : "CA"]} />
                  <Bar dataKey="ventes" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="ventes" position="right" style={{ fontSize: 12, fontWeight: "bold", fill: "hsl(var(--foreground))" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StockTab({ eventId }: { eventId: number }) {
  const { data: articles } = useListArticles(eventId, { query: { enabled: !!eventId, queryKey: getListArticlesQueryKey(eventId) } });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showNewArticleDialog, setShowNewArticleDialog] = useState(false);
  const [newArticleForm, setNewArticleForm] = useState({ nom: "", prix: "", stock_total: "", disponible: true });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateArticle = useUpdateArticle();
  const createArticle = useCreateArticle();
  const deleteArticle = useDeleteArticle();

  const handleEditClick = (article: any) => {
    setEditingId(article.id);
    setEditForm({ ...article });
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      await updateArticle.mutateAsync({
        id: editingId,
        data: {
          nom: editForm.nom,
          prix: parseFloat(editForm.prix),
          stock_total: parseInt(editForm.stock_total, 10),
          disponible: editForm.disponible
        }
      });
      queryClient.invalidateQueries({ queryKey: getListArticlesQueryKey(eventId) });
      setEditingId(null);
      toast({ title: "Article mis à jour" });
    } catch (e) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cet article ?")) return;
    try {
      await deleteArticle.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListArticlesQueryKey(eventId) });
      toast({ title: "Article supprimé" });
    } catch (e) {
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  const handleImageUpload = async (articleId: number, file: File) => {
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      await new Promise<void>(resolve => { img.onload = () => resolve(); });
      const MAX = 400;
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      await updateArticle.mutateAsync({ id: articleId, data: { image_url: dataUrl } });
      queryClient.invalidateQueries({ queryKey: getListArticlesQueryKey(eventId) });
      toast({ title: "Image mise à jour" });
    } catch (e) {
      toast({ title: "Erreur lors de l'upload", variant: "destructive" });
    }
  };

  const handleCreateArticle = async () => {
    if (!newArticleForm.nom.trim() || !newArticleForm.prix || !newArticleForm.stock_total) return;
    try {
      await createArticle.mutateAsync({
        eventId,
        data: {
          nom: newArticleForm.nom,
          prix: parseFloat(newArticleForm.prix),
          stock_total: parseInt(newArticleForm.stock_total, 10),
          disponible: newArticleForm.disponible
        }
      });
      queryClient.invalidateQueries({ queryKey: getListArticlesQueryKey(eventId) });
      setShowNewArticleDialog(false);
      setNewArticleForm({ nom: "", prix: "", stock_total: "", disponible: true });
      toast({ title: "Article créé !" });
    } catch (e) {
      toast({ title: "Erreur lors de la création", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowNewArticleDialog(true)}>
          <Plus size={16} className="mr-2" /> Nouvel article
        </Button>
      </div>

      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs border-b">
            <tr>
              <th className="px-4 py-3 font-semibold w-12">Image</th>
              <th className="px-4 py-3 font-semibold">Nom</th>
              <th className="px-4 py-3 font-semibold text-right">Prix</th>
              <th className="px-4 py-3 font-semibold text-right">Stock total</th>
              <th className="px-4 py-3 font-semibold text-right">Dispo.</th>
              <th className="px-4 py-3 font-semibold text-center">En vente</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {articles?.map(article => {
              const isEditing = editingId === article.id;
              return (
                <tr key={article.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <label className="cursor-pointer group relative block w-10 h-10 rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors">
                      {article.image_url ? (
                        <img src={article.image_url} alt={article.nom} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Camera size={16} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera size={14} className="text-white" />
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) { handleImageUpload(article.id, f); e.target.value = ""; } }}
                      />
                    </label>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {isEditing
                      ? <Input value={editForm.nom} onChange={e => setEditForm({ ...editForm, nom: e.target.value })} className="h-8" />
                      : article.nom}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-primary">
                    {isEditing
                      ? <Input type="number" step="0.5" value={editForm.prix} onChange={e => setEditForm({ ...editForm, prix: e.target.value })} className="h-8 w-24 ml-auto text-right" />
                      : `${article.prix.toFixed(2)} €`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing
                      ? <Input type="number" value={editForm.stock_total} onChange={e => setEditForm({ ...editForm, stock_total: e.target.value })} className="h-8 w-24 ml-auto text-right" />
                      : article.stock_total}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {article.stock_disponible}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isEditing
                      ? <Switch checked={editForm.disponible} onCheckedChange={c => setEditForm({ ...editForm, disponible: c })} />
                      : <Switch checked={article.disponible} disabled />}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Annuler</Button>
                        <Button size="sm" onClick={handleSave} disabled={updateArticle.isPending}>
                          <Save size={14} className="mr-1" /> Enregistrer
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(article)}>Modifier</Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(article.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={showNewArticleDialog} onOpenChange={setShowNewArticleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel article</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Nom de l'article</Label>
              <Input placeholder="Bière pression" value={newArticleForm.nom} onChange={e => setNewArticleForm({ ...newArticleForm, nom: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Prix (€)</Label>
                <Input type="number" step="0.5" min="0" placeholder="2.50" value={newArticleForm.prix} onChange={e => setNewArticleForm({ ...newArticleForm, prix: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Stock initial</Label>
                <Input type="number" min="0" placeholder="100" value={newArticleForm.stock_total} onChange={e => setNewArticleForm({ ...newArticleForm, stock_total: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="dispo" checked={newArticleForm.disponible} onCheckedChange={c => setNewArticleForm({ ...newArticleForm, disponible: c })} />
              <Label htmlFor="dispo">Disponible à la vente</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewArticleDialog(false)}>Annuler</Button>
            <Button onClick={handleCreateArticle} disabled={!newArticleForm.nom.trim() || !newArticleForm.prix || !newArticleForm.stock_total || createArticle.isPending}>
              {createArticle.isPending ? "Création..." : "Créer l'article"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CommandesTab({ eventId }: { eventId: number }) {
  const { data: orders } = useListOrders(eventId, {
    query: { enabled: !!eventId, queryKey: getListOrdersQueryKey(eventId), refetchInterval: 15000 }
  });
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<string>("tous");

  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders.filter(o => {
      const matchSearch = !search || o.nom_commande.toLowerCase().includes(search.toLowerCase());
      const matchStatut = filterStatut === "tous" || o.statut === filterStatut;
      return matchSearch && matchStatut;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, search, filterStatut]);

  const statutColors: Record<string, string> = {
    en_attente: "bg-gray-100 text-gray-700",
    reservee: "bg-amber-100 text-amber-700",
    payee: "bg-blue-100 text-blue-700",
    livree_partiellement: "bg-purple-100 text-purple-700",
    livree: "bg-green-100 text-green-700",
    expiree: "bg-red-100 text-red-700",
  };
  const statutLabels: Record<string, string> = {
    en_attente: "En attente",
    reservee: "Réservée",
    payee: "Payée",
    livree_partiellement: "Part. livrée",
    livree: "Livrée",
    expiree: "Expirée",
  };

  const totalCA = filtered.filter(o => ["payee", "livree_partiellement", "livree"].includes(o.statut)).reduce((s, o) => s + o.montant_total, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Rechercher un nom..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Tous les statuts</SelectItem>
            {Object.entries(statutLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{filtered.length}</span> commande{filtered.length !== 1 ? "s" : ""}
          {totalCA > 0 && <span className="ml-2 text-primary font-bold">· {totalCA.toFixed(2)} € encaissés</span>}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed rounded-2xl">
          <List size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">Aucune commande trouvée.</p>
        </div>
      ) : (
        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Heure</th>
                <th className="px-4 py-3 text-left font-semibold">Nom</th>
                <th className="px-4 py-3 text-left font-semibold">Articles</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 text-right font-semibold">Paiement</th>
                <th className="px-4 py-3 text-center font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(order => (
                <tr key={order.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(order.created_at).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 font-bold capitalize">{order.nom_commande}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                    {order.items?.map(i => `${i.quantite}× ${i.article_nom}`).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-primary">{order.montant_total.toFixed(2)} €</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                    {(order.paye_cb ?? 0) > 0 && <span className="mr-1">CB {(order.paye_cb ?? 0).toFixed(2)}€</span>}
                    {(order.paye_especes ?? 0) > 0 && <span className="mr-1">Esp {(order.paye_especes ?? 0).toFixed(2)}€</span>}
                    {(order.paye_cheque ?? 0) > 0 && <span>Chq {(order.paye_cheque ?? 0).toFixed(2)}€</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statutColors[order.statut] || "bg-muted text-muted-foreground"}`}>
                      {statutLabels[order.statut] || order.statut}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ConfigTab({ eventId }: { eventId: number }) {
  const { data: settings } = useGetSettings(eventId, { query: { enabled: !!eventId, queryKey: getGetSettingsQueryKey(eventId) } });
  const updateSettings = useUpdateSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({
    temps_reservation_minutes: settings?.temps_reservation_minutes || 15,
    vente_ouverte: settings?.vente_ouverte ?? true,
    allow_reprendre_commande: settings?.allow_reprendre_commande ?? false,
    mdp_caisse: "",
    mdp_preparateur: "",
    mdp_admin: ""
  });

  useMemo(() => {
    if (settings) {
      setForm(f => ({ ...f, temps_reservation_minutes: settings.temps_reservation_minutes, vente_ouverte: settings.vente_ouverte, allow_reprendre_commande: settings.allow_reprendre_commande }));
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      const dataToUpdate: any = {
        temps_reservation_minutes: parseInt(form.temps_reservation_minutes.toString(), 10),
        vente_ouverte: form.vente_ouverte,
        allow_reprendre_commande: form.allow_reprendre_commande
      };
      if (form.mdp_caisse) dataToUpdate.mdp_caisse = form.mdp_caisse;
      if (form.mdp_preparateur) dataToUpdate.mdp_preparateur = form.mdp_preparateur;
      if (form.mdp_admin) dataToUpdate.mdp_admin = form.mdp_admin;

      await updateSettings.mutateAsync({ eventId, data: dataToUpdate });
      queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey(eventId) });
      setForm(f => ({ ...f, mdp_caisse: "", mdp_preparateur: "", mdp_admin: "" }));
      toast({ title: "Configuration sauvegardée" });
    } catch (e) {
      toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" });
    }
  };

  if (!settings) return null;

  return (
    <div className="max-w-2xl bg-card border rounded-2xl p-6 shadow-sm">
      <h3 className="text-xl font-bold mb-6">Paramètres de l'événement</h3>

      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border">
          <div>
            <Label className="text-base font-bold">Ouverture des ventes (Acheteurs)</Label>
            <p className="text-sm text-muted-foreground">Permet de suspendre temporairement les nouvelles commandes.</p>
          </div>
          <Switch checked={form.vente_ouverte} onCheckedChange={(c) => setForm({ ...form, vente_ouverte: c })} />
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border">
          <div>
            <Label className="text-base font-bold">Reprendre une commande en cours</Label>
            <p className="text-sm text-muted-foreground">Permet à un acheteur de reprendre sa commande s'il entre un nom déjà utilisé. Si désactivé, tout nom existant bloque l'accès.</p>
          </div>
          <Switch checked={form.allow_reprendre_commande} onCheckedChange={(c) => setForm({ ...form, allow_reprendre_commande: c })} />
        </div>

        <div className="grid gap-2">
          <Label>Temps de réservation avant expiration (minutes)</Label>
          <Input type="number" value={form.temps_reservation_minutes} onChange={e => setForm({ ...form, temps_reservation_minutes: Number(e.target.value) })} />
        </div>

        <div className="pt-6 border-t">
          <h4 className="font-bold mb-4">Mots de passe</h4>
          <p className="text-sm text-muted-foreground mb-4">Laissez vide pour ne pas modifier.</p>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Mot de passe Caisse</Label>
              <Input type="password" placeholder="***" value={form.mdp_caisse} onChange={e => setForm({ ...form, mdp_caisse: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Mot de passe Préparateur</Label>
              <Input type="password" placeholder="***" value={form.mdp_preparateur} onChange={e => setForm({ ...form, mdp_preparateur: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Mot de passe Admin (Général)</Label>
              <Input type="password" placeholder="***" value={form.mdp_admin} onChange={e => setForm({ ...form, mdp_admin: e.target.value })} />
            </div>
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={handleSave} disabled={updateSettings.isPending}>
          Enregistrer la configuration
        </Button>
      </div>
    </div>
  );
}
