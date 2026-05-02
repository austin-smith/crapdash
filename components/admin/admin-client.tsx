'use client';

import { useState, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, FolderOpen, Computer } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/header/page-header';
import { ArrowLeftIcon } from '@/components/ui/animated-icons/arrow-left';
import { AnimateIcon } from '@/components/ui/animated-icons/animate-icon';
import { SlidersHorizontalIcon } from '@/components/ui/animated-icons/sliders-horizontal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PreferencesDialog } from '@/components/layout/header/preferences-dialog';
import { AppearanceProvider } from '@/components/theme/appearance-provider';
import { usePreferences } from '@/hooks/use-preferences';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { SearchBar } from '@/components/layout/header/search-bar';
import { CategoryFormModal } from '@/components/admin/categories/category-form-modal';
import { ServiceFormModal } from '@/components/admin/services/service-form-modal';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { DownloadIcon } from '@/components/ui/animated-icons/download';
import { UploadIcon } from '@/components/ui/animated-icons/upload';
import { importConfig } from '@/lib/actions';
import { DEFAULT_APP_TITLE, type Category, type Service, type Preferences, type IconConfig } from '@/lib/types';
import { AppSettingsCard } from '@/components/admin/app-settings/app-settings-card';
import { PageFooter } from '@/components/layout/footer/page-footer';

// Dynamic imports to avoid SSR for drag-and-drop components
const CategoryList = dynamic(() => import('@/components/admin/categories/category-list').then(m => m.CategoryList), { ssr: false });
const ServiceList = dynamic(() => import('@/components/admin/services/service-list').then(m => m.ServiceList), { ssr: false });

interface AdminClientProps {
  appTitle?: string;
  appLogo?: IconConfig;
  categories: Category[];
  services: Service[];
  initialSettings: Partial<Preferences>;
}

export function AdminClient({ appTitle, appLogo, categories: initialCategories, services: initialServices, initialSettings }: AdminClientProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [services, setServices] = useState<Service[]>(initialServices);
  const [appTitleState, setAppTitleState] = useState<string>(appTitle ?? '');
  const [appLogoState, setAppLogoState] = useState<IconConfig | undefined>(appLogo);
  const { settings, updateSetting } = usePreferences({ initialSettings });
  const [showFooter, setShowFooter] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();
  const [editingService, setEditingService] = useState<Service | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const adminTitle = `${(appTitleState?.trim() || DEFAULT_APP_TITLE)} /admin`;

  useKeyboardShortcuts([
    {
      key: 'k',
      mod: true,
      handler: () => {
        if (document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur();
        } else {
          searchInputRef.current?.focus();
        }
      },
    },
    { key: '.', mod: true, handler: () => setSettingsOpen((o) => !o) },
    {
      key: 'i',
      mod: true,
      handler: () => setShowFooter((prev) => !prev),
    },
  ]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return { categories, services };
    }

    const query = searchQuery.toLowerCase();
    const filteredCategories = categories.filter(
      (category) => category.name.toLowerCase().includes(query)
    );
    const filteredServices = services.filter(
      (service) =>
        service.name.toLowerCase().includes(query) ||
        service.description.toLowerCase().includes(query)
    );

    return {
      categories: filteredCategories,
      services: filteredServices,
    };
  }, [searchQuery, categories, services]);

  const fetchData = async () => {
    try {
      const [categoriesRes, servicesRes] = await Promise.all([
        fetch('/api/data?type=categories'),
        fetch('/api/data?type=services'),
      ]);

      if (categoriesRes.ok && servicesRes.ok) {
        const categoriesData = await categoriesRes.json();
        const servicesData = await servicesRes.json();
        setCategories(categoriesData);
        setServices(servicesData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const handleRefresh = () => {
    fetchData();
    setRefreshKey(k => k + 1);
  };

  const handleAddCategory = () => {
    setEditingCategory(undefined);
    setCategoryModalOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryModalOpen(true);
  };

  const handleAddService = () => {
    setEditingService(undefined);
    setServiceModalOpen(true);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setServiceModalOpen(true);
  };

  const handleCategoryModalClose = (open: boolean) => {
    setCategoryModalOpen(open);
    if (!open) {
      setEditingCategory(undefined);
    }
  };

  const handleServiceModalClose = (open: boolean) => {
    setServiceModalOpen(open);
    if (!open) {
      setEditingService(undefined);
    }
  };

  const openImportPicker = () => {
    if (isImporting) return;
    importInputRef.current?.click();
  };

  const handleImportFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';

    if (!file) return;

    setPendingImportFile(file);
    setImportConfirmOpen(true);
  };

  const handleImportConfirmOpenChange = (open: boolean) => {
    if (isImporting) return;
    setImportConfirmOpen(open);
    if (!open) {
      setPendingImportFile(null);
    }
  };

  const handleConfirmImport = async () => {
    if (!pendingImportFile || isImporting) return;

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', pendingImportFile);

      const result = await importConfig(formData);

      if (!result.success) {
        toast.error(result.errors[0]?.message ?? 'Failed to import configuration');
        return;
      }

      setCategories(result.data.config.categories);
      setServices(result.data.config.services);
      setAppTitleState(result.data.config.appTitle ?? '');
      setAppLogoState(result.data.config.appLogo);
      setRefreshKey((value) => value + 1);
      setPendingImportFile(null);
      setImportConfirmOpen(false);

      toast.success('Configuration imported.');

      const warningCount = result.data.warnings.length;
      if (warningCount > 0) {
        const firstWarning = result.data.warnings[0]?.message;
        toast.warning(
          warningCount === 1
            ? `Imported with 1 warning: ${firstWarning}`
            : `Imported with ${warningCount} warnings. First warning: ${firstWarning}`
        );
      }

      router.refresh();
    } catch (error) {
      console.error('Import config client error:', error);
      toast.error('Failed to import configuration');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <AppearanceProvider appearance={settings.appearance} onAppearanceChange={(appearance) => updateSetting('appearance', appearance)}>
      <PageHeader title={adminTitle} appLogo={appLogoState}>
        <SearchBar ref={searchInputRef} value={searchQuery} onChange={setSearchQuery} />
        <Tooltip>
          <TooltipTrigger asChild>
            <AnimateIcon animateOnHover>
              <Button variant="outline" size="icon-lg" onClick={openImportPicker} disabled={isImporting}>
                <UploadIcon size={18} />
              </Button>
            </AnimateIcon>
          </TooltipTrigger>
          <TooltipContent side="bottom">Import config</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>
            <AnimateIcon animateOnHover>
              <Button variant="outline" size="icon-lg" asChild>
                <a href="/api/config/export" download>
                  <DownloadIcon size={18} />
                </a>
              </Button>
            </AnimateIcon>
          </TooltipTrigger>
          <TooltipContent side="bottom">Export config</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger onClick={() => setSettingsOpen(true)}>
            <AnimateIcon animateOnHover>
              <Button variant="outline" size="icon-lg" asChild>
                <span>
                  <SlidersHorizontalIcon size={18} />
                </span>
              </Button>
            </AnimateIcon>
          </TooltipTrigger>
          <TooltipContent side="bottom">Preferences</TooltipContent>
        </Tooltip>
        <PreferencesDialog settings={settings} onSettingChange={updateSetting} open={settingsOpen} onOpenChange={setSettingsOpen} />
        <Tooltip>
          <TooltipTrigger>
            <AnimateIcon animateOnHover asChild>
              <Button variant="outline" size="icon-lg" asChild>
                <Link href="/">
                  <ArrowLeftIcon size={14} />
                </Link>
              </Button>
            </AnimateIcon>
          </TooltipTrigger>
          <TooltipContent side="bottom">Get back there</TooltipContent>
        </Tooltip>
        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImportFileSelect}
          className="hidden"
        />
      </PageHeader>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="space-y-10">
          {/* App Header Settings */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold font-mono">App Header</h2>
            </div>
            <AppSettingsCard
              appTitle={appTitleState}
              appLogo={appLogoState}
              onChange={(nextTitle, nextLogo) => {
                setAppTitleState(nextTitle ?? '');
                setAppLogoState(nextLogo);
              }}
            />
          </section>

          {/* Categories Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold font-mono">Categories</h2>
              {categories.length > 0 && (
                <Button onClick={handleAddCategory}>
                  <Plus className="h-4 w-4" />
                  Add Category
                </Button>
              )}
            </div>
            {categories.length === 0 ? (
              <Card className="shadow-xs">
                <CardContent className="py-8">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia>
                        <FolderOpen className="size-10 text-primary" />
                      </EmptyMedia>
                      <EmptyTitle>No categories configured</EmptyTitle>
                      <EmptyDescription>Add one to get started.</EmptyDescription>
                    </EmptyHeader>
                    <Button onClick={handleAddCategory}>
                      <Plus className="h-4 w-4" />
                      Add Category
                    </Button>
                  </Empty>
                </CardContent>
              </Card>
            ) : filteredData.categories.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No categories found matching your search.
              </p>
            ) : (
              <CategoryList
                categories={filteredData.categories}
                services={services}
                onEdit={handleEditCategory}
                onDeleted={handleRefresh}
              />
            )}
          </section>

          {/* Services Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold font-mono">Services</h2>
              {services.length > 0 && (
                <Button onClick={handleAddService}>
                  <Plus className="h-4 w-4" />
                  Add Service
                </Button>
              )}
            </div>
            {services.length === 0 ? (
              <Card className="shadow-xs">
                <CardContent className="py-8">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia>
                        <Computer className="size-10 text-primary" />
                      </EmptyMedia>
                      <EmptyTitle>No services configured</EmptyTitle>
                      <EmptyDescription>
                        {categories.length === 0
                          ? 'Create a category to start adding services.'
                          : 'Add a service to see it on your dashboard.'}
                      </EmptyDescription>
                    </EmptyHeader>
                    <Button onClick={handleAddService} disabled={categories.length === 0}>
                      <Plus className="h-4 w-4" />
                      Add Service
                    </Button>
                  </Empty>
                </CardContent>
              </Card>
            ) : filteredData.services.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No services found matching your search.
              </p>
            ) : (
              <ServiceList
                services={filteredData.services}
                categories={categories}
                onEdit={handleEditService}
                onDeleted={handleRefresh}
                cacheKey={refreshKey}
              />
            )}
          </section>

        </div>

        {/* Modals */}
        <CategoryFormModal
          open={categoryModalOpen}
          onOpenChange={handleCategoryModalClose}
          category={editingCategory}
          onSuccess={handleRefresh}
        />

        <ServiceFormModal
          open={serviceModalOpen}
          onOpenChange={handleServiceModalClose}
          service={editingService}
          categories={categories}
          onSuccess={handleRefresh}
          cacheKey={refreshKey}
        />
      </main>
      </AppearanceProvider>

      {showFooter && <PageFooter />}

      <AlertDialog open={importConfirmOpen} onOpenChange={handleImportConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import configuration</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces the current configuration with the selected file.
              {pendingImportFile && (
                <span className="mt-2 block font-mono text-xs text-foreground/80">
                  File: {pendingImportFile.name}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmImport();
              }}
              disabled={!pendingImportFile || isImporting}
            >
              {isImporting ? 'Importing...' : 'Import and replace'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
