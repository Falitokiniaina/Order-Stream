import { PasswordGate } from "@/components/password-gate";
import { LoginInputRole } from "@workspace/api-client-react";
import { useListEvents, getListEventsQueryKey, useCreateEvent, useUpdateEvent, useDeleteEvent, useGetDashboard, getGetDashboardQueryKey, useGetSettings, getGetSettingsQueryKey, useUpdateSettings, useListArticles, getListArticlesQueryKey, useCreateArticle, useUpdateArticle, useDeleteArticle } from "@workspace/api-client-react";
import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Settings, BarChart3, Package as PackageIcon, Plus, Save, Trash2, LogOut } from "lucide-react";
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
  const { logout } = useAuth();
  
  // Set default event
  useMemo(() => {
    if (events && events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b p-4 shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 text-primary font-bold text-xl">
            <Settings size={24} />
            Administration QuickServe
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={selectedEventId?.toString()} onValueChange={(v) => setSelectedEventId(Number(v))}>
              <SelectTrigger className="w-[250px] font-semibold">
                <SelectValue placeholder="Sélectionner un événement" />
              </SelectTrigger>
              <SelectContent>
                {events?.map(e => (
                  <SelectItem key={e.id} value={e.id.toString()}>{e.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={logout} title="Déconnexion">
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-6xl mx-auto w-full">
        {selectedEventId ? (
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="mb-6 grid grid-cols-3 h-14 bg-muted/50 p-1">
              <TabsTrigger value="dashboard" className="text-base h-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <BarChart3 size={18} className="mr-2" /> Tableau de bord
              </TabsTrigger>
              <TabsTrigger value="stock" className="text-base h-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <PackageIcon size={18} className="mr-2" /> Stock & Menu
              </TabsTrigger>
              <TabsTrigger value="config" className="text-base h-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <Settings size={18} className="mr-2" /> Configuration
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard"><DashboardTab eventId={selectedEventId} /></TabsContent>
            <TabsContent value="stock"><StockTab eventId={selectedEventId} /></TabsContent>
            <TabsContent value="config"><ConfigTab eventId={selectedEventId} /></TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            Sélectionnez ou créez un événement pour commencer.
          </div>
        )}
      </main>
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-primary text-primary-foreground p-6 rounded-2xl shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-wider opacity-80 mb-2">Chiffre d'affaires</div>
          <div className="text-4xl font-black">{stats.ca_total.toFixed(2)} €</div>
        </div>
        <div className="bg-card border p-6 rounded-2xl shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">En attente</div>
          <div className="text-4xl font-black">{stats.nb_commandes_reservees}</div>
        </div>
        <div className="bg-card border p-6 rounded-2xl shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Livrées</div>
          <div className="text-4xl font-black">{stats.nb_commandes_livrees}</div>
        </div>
        <div className="bg-card border p-6 rounded-2xl shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Expirées</div>
          <div className="text-4xl font-black text-destructive">{stats.nb_commandes_expirees}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-6">Répartition des paiements</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => `${value.toFixed(2)} €`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg mb-6">Top Articles (Ventes)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topArticlesData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                <RechartsTooltip />
                <Bar dataKey="ventes" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StockTab({ eventId }: { eventId: number }) {
  const { data: articles } = useListArticles(eventId, { query: { enabled: !!eventId, queryKey: getListArticlesQueryKey(eventId) } });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateArticle = useUpdateArticle();

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
    } catch(e) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button><Plus size={16} className="mr-2"/> Nouvel Article</Button>
      </div>
      
      <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs border-b">
            <tr>
              <th className="px-4 py-3 font-semibold">Image</th>
              <th className="px-4 py-3 font-semibold">Nom</th>
              <th className="px-4 py-3 font-semibold text-right">Prix</th>
              <th className="px-4 py-3 font-semibold text-right">Stock Actuel</th>
              <th className="px-4 py-3 font-semibold text-center">En Vente</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {articles?.map(article => {
              const isEditing = editingId === article.id;
              return (
                <tr key={article.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="w-12 h-12 bg-muted rounded-md overflow-hidden">
                      {article.image_url && <img src={article.image_url} alt="" className="w-full h-full object-cover"/>}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {isEditing ? <Input value={editForm.nom} onChange={e => setEditForm({...editForm, nom: e.target.value})} className="h-8"/> : article.nom}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-primary">
                    {isEditing ? <Input type="number" step="0.5" value={editForm.prix} onChange={e => setEditForm({...editForm, prix: e.target.value})} className="h-8 w-24 ml-auto text-right"/> : `${article.prix.toFixed(2)} €`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? <Input type="number" value={editForm.stock_total} onChange={e => setEditForm({...editForm, stock_total: e.target.value})} className="h-8 w-24 ml-auto text-right"/> : article.stock_disponible}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isEditing ? <Switch checked={editForm.disponible} onCheckedChange={c => setEditForm({...editForm, disponible: c})} /> : <Switch checked={article.disponible} disabled />}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Annuler</Button>
                        <Button size="sm" onClick={handleSave}><Save size={14} className="mr-1"/> Enregistrer</Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleEditClick(article)}>Modifier</Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
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
    mdp_caisse: "",
    mdp_preparateur: "",
    mdp_admin: ""
  });

  // Sync form when settings load
  useMemo(() => {
    if (settings) {
      setForm(f => ({ ...f, temps_reservation_minutes: settings.temps_reservation_minutes, vente_ouverte: settings.vente_ouverte }));
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      const dataToUpdate: any = {
        temps_reservation_minutes: parseInt(form.temps_reservation_minutes.toString(), 10),
        vente_ouverte: form.vente_ouverte
      };
      if (form.mdp_caisse) dataToUpdate.mdp_caisse = form.mdp_caisse;
      if (form.mdp_preparateur) dataToUpdate.mdp_preparateur = form.mdp_preparateur;
      if (form.mdp_admin) dataToUpdate.mdp_admin = form.mdp_admin;

      await updateSettings.mutateAsync({ id: settings!.id, data: dataToUpdate });
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

        <Button className="w-full" size="lg" onClick={handleSave}>
          Enregistrer la configuration
        </Button>
      </div>
    </div>
  );
}