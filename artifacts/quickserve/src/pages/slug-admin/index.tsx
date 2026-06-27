import { useRoute, Link } from "wouter";
import { PasswordGate } from "@/components/password-gate";
import { usePageTitle } from "@/hooks/use-page-title";
import { LoginInputRole, useGetEventBySlug, getGetEventBySlugQueryKey, type Event } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Settings, BarChart3, List, Archive, LogOut, ArrowLeft, AlertTriangle } from "lucide-react";
import { Package as PackageIcon } from "lucide-react";
import { DashboardTab, CommandesTab, StockTab, ConfigTab, SnapshotsTab } from "@/pages/admin";

export default function SlugAdminPage() {
  const [, params] = useRoute("/:slug/admin");
  const slug = params?.slug ?? "";
  usePageTitle(`Admin · ${slug} · QuickServe`);

  const { data: event, isLoading, isError } = useGetEventBySlug(slug, {
    query: { enabled: !!slug, queryKey: getGetEventBySlugQueryKey(slug) }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm animate-pulse">Chargement…</p>
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle size={28} className="text-destructive" />
        </div>
        <h1 className="text-xl font-bold">Événement introuvable</h1>
        <p className="text-muted-foreground text-sm text-center">
          Aucun événement ne correspond au slug <strong>/{slug}</strong>.
        </p>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft size={16} className="mr-2" /> Retour à l'accueil
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <PasswordGate role={LoginInputRole.admin} eventSlug={slug}>
      <SlugAdminContent slug={slug} event={event} />
    </PasswordGate>
  );
}

function SlugAdminContent({ slug, event }: { slug: string; event: Event }) {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b p-4 shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/${slug}`}>
              <Button variant="ghost" size="icon" title="Retour à la page acheteur" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft size={18} />
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-primary font-bold text-xl">
              <Settings size={22} />
              <span className="hidden sm:inline">{event.nom}</span>
              <span className="sm:hidden">Admin</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-full hidden sm:inline">
              /{slug}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Déconnexion">
            <LogOut size={18} />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-6xl mx-auto w-full">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-6 grid grid-cols-5 h-14 bg-muted/50 p-1">
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
            <TabsTrigger value="sauvegardes" className="text-sm h-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Archive size={16} className="mr-1.5" /> Sauvegardes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><DashboardTab eventId={event.id} /></TabsContent>
          <TabsContent value="commandes"><CommandesTab eventId={event.id} /></TabsContent>
          <TabsContent value="stock"><StockTab eventId={event.id} /></TabsContent>
          <TabsContent value="config"><ConfigTab eventId={event.id} hideGlobalAdminPassword /></TabsContent>
          <TabsContent value="sauvegardes"><SnapshotsTab eventId={event.id} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
