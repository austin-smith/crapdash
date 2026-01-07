'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Computer } from 'lucide-react';
import { SettingsIcon } from '@/components/ui/animated-icons/settings';
import { SlidersHorizontalIcon } from '@/components/ui/animated-icons/sliders-horizontal';
import { AnimateIcon } from '@/components/ui/animated-icons/animate-icon';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/header/page-header';
import { CategoryLayout } from './category-layout';
import { SearchBar } from '../layout/header/search-bar';
import { PreferencesDialog } from '../layout/header/preferences-dialog';
import { AppearanceProvider } from '@/components/theme/appearance-provider';
import { usePreferences } from '@/hooks/use-preferences';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ServiceFormModal } from '@/components/admin/services/service-form-modal';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { deleteService } from '@/lib/actions';
import { LAYOUTS, type Category, type Service, type Preferences } from '@/lib/types';

interface DashboardClientProps {
  categories: Category[];
  services: Service[];
  initialSettings: Partial<Preferences>;
}

export function DashboardClient({ categories, services, initialSettings }: DashboardClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { settings, updateSetting } = usePreferences({ initialSettings });

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Cache key to bust icon cache on updates
  const [cacheKey, setCacheKey] = useState(0);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Settings dialog state
  const [settingsOpen, setSettingsOpen] = useState(false);

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
  ]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return { categories, services };
    }

    const query = searchQuery.toLowerCase();
    const filteredServices = services.filter(
      (service) =>
        service.name.toLowerCase().includes(query) ||
        service.description.toLowerCase().includes(query)
    );

    const categoryIdsWithServices = new Set(filteredServices.map((s) => s.categoryId));
    const filteredCategories = categories.filter(
      (cat) =>
        categoryIdsWithServices.has(cat.id) ||
        cat.name.toLowerCase().includes(query)
    );

    return {
      categories: filteredCategories,
      services: filteredServices,
    };
  }, [searchQuery, categories, services]);

  const handleEditService = useCallback((service: Service) => {
    setEditingService(service);
    setEditModalOpen(true);
  }, []);

  const handleEditSuccess = useCallback(() => {
    setEditModalOpen(false);
    setEditingService(null);
    setCacheKey((k) => k + 1);
    router.refresh();
  }, [router]);

  const handleDeleteService = useCallback((service: Service) => {
    setDeletingService(service);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingService) return;

    setIsDeleting(true);
    setDeleteError(null);

    const result = await deleteService(deletingService.id);

    if (result.success) {
      toast.success('Service deleted');
      setDeleteDialogOpen(false);
      setDeletingService(null);
      router.refresh();
    } else {
      setDeleteError(result.errors[0]?.message || 'Failed to delete service');
    }

    setIsDeleting(false);
  }, [deletingService, router]);

  return (
    <AppearanceProvider appearance={settings.appearance} onAppearanceChange={(appearance) => updateSetting('appearance', appearance)}>
      <PageHeader title="crapdash">
        <SearchBar ref={searchInputRef} value={searchQuery} onChange={setSearchQuery} />
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
            <AnimateIcon animateOnHover>
              <Button variant="outline" size="icon-lg" asChild>
                <Link href="/admin">
                  <SettingsIcon size={18} />
                </Link>
              </Button>
            </AnimateIcon>
          </TooltipTrigger>
          <TooltipContent side="bottom">Admin</TooltipContent>
        </Tooltip>
      </PageHeader>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {services.length === 0 ? (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia>
                <Computer className="size-10 text-primary" />
              </EmptyMedia>
              <EmptyTitle>No services configured</EmptyTitle>
              <EmptyDescription>Add categories and services to get started.</EmptyDescription>
            </EmptyHeader>
            <AnimateIcon animateOnHover asChild>
              <Button asChild>
                <Link href="/admin">
                  <SettingsIcon size={16} />
                  Go to Admin
                </Link>
              </Button>
            </AnimateIcon>
          </Empty>
        ) : filteredData.categories.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">
            No services found matching your search.
          </p>
        ) : (
          <div
            className={
              settings.layout === LAYOUTS.COLUMNS
                ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'flex flex-col gap-12'
            }
          >
            {filteredData.categories.map((category) => {
              const categoryServices = filteredData.services.filter(
                (s) => s.categoryId === category.id
              );
              return (
                <CategoryLayout
                  key={category.id}
                  category={category}
                  services={categoryServices}
                  layout={settings.layout}
                  expandOnHover={settings.expandOnHover}
                  onEditService={handleEditService}
                  onDeleteService={handleDeleteService}
                  cacheKey={cacheKey}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Service Modal */}
      <ServiceFormModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        service={editingService ?? undefined}
        categories={categories}
        onSuccess={handleEditSuccess}
        cacheKey={cacheKey}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName={deletingService?.name ?? ''}
        itemType="service"
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        error={deleteError}
      />
    </AppearanceProvider>
  );
}
