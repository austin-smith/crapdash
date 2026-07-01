'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Computer } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ServiceFormModal } from '@/components/admin/services/service-form-modal';
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { SettingsIcon } from '@/components/ui/animated-icons/settings';
import { SlidersHorizontalIcon } from '@/components/ui/animated-icons/sliders-horizontal';
import { AnimateIcon } from '@/components/ui/animated-icons/animate-icon';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/header/page-header';
import { SearchBar } from '@/components/layout/header/search-bar';
import { PreferencesDialog } from '@/components/layout/header/preferences-dialog';
import { PageFooter } from '@/components/layout/footer/page-footer';
import { AppearanceProvider } from '@/components/theme/appearance-provider';
import { usePreferences } from '@/hooks/use-preferences';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { deleteService } from '@/lib/actions';
import { DASHBOARD_SERVICE_ID_ATTRIBUTE, getDashboardServiceElementId } from '@/lib/dashboard-dom';
import { getDashboardSearchResult } from '@/lib/dashboard-search';
import { getNextSpatialItemId, type SpatialDirection, type SpatialItem } from '@/lib/spatial-navigation';
import { DEFAULT_APP_TITLE, LAYOUTS, type Category, type Service, type Preferences, type IconConfig } from '@/lib/types';
import { CategoryLayout } from './category-layout';

interface DashboardClientProps {
  appTitle?: string;
  appLogo?: IconConfig;
  categories: Category[];
  services: Service[];
  initialSettings: Partial<Preferences>;
}

function getActiveServiceId(
  searchResult: ReturnType<typeof getDashboardSearchResult>,
  selectedServiceId: string | null
): string | null {
  if (!searchResult.isSearching || searchResult.launchServices.length === 0) {
    return null;
  }

  if (selectedServiceId && searchResult.launchServices.some((service) => service.id === selectedServiceId)) {
    return selectedServiceId;
  }

  return searchResult.launchServices[0]?.id ?? null;
}

function getSpatialDirection(key: string): SpatialDirection | null {
  if (key === 'ArrowUp') return 'up';
  if (key === 'ArrowDown') return 'down';
  if (key === 'ArrowLeft') return 'left';
  if (key === 'ArrowRight') return 'right';

  return null;
}

function getVisibleServiceItems(): SpatialItem[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(`[${DASHBOARD_SERVICE_ID_ATTRIBUTE}]`)
  ).flatMap((element) => {
    const id = element.getAttribute(DASHBOARD_SERVICE_ID_ATTRIBUTE);
    const rect = element.getBoundingClientRect();

    if (!id || rect.width === 0 || rect.height === 0) {
      return [];
    }

    return [{
      id,
      rect: {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    }];
  });
}

export function DashboardClient({ appTitle, appLogo, categories, services, initialSettings }: DashboardClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectedServiceIdRef = useRef<string | null>(null);
  const { settings, updateSetting } = usePreferences({ initialSettings });
  const [showFooter, setShowFooter] = useState(false);

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
  const titleText = appTitle?.trim() || DEFAULT_APP_TITLE;

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

  const searchResult = useMemo(() => getDashboardSearchResult({
    categories,
    services,
    query: searchQuery,
  }), [categories, services, searchQuery]);

  const activeServiceId = useMemo(() => {
    return getActiveServiceId(searchResult, selectedServiceId);
  }, [searchResult, selectedServiceId]);

  const activeService = useMemo(() => {
    if (!activeServiceId) return null;
    return searchResult.launchServices.find((service) => service.id === activeServiceId) ?? null;
  }, [activeServiceId, searchResult]);

  const searchAssistiveText = searchResult.isSearching
    ? activeService
      ? `${activeService.name} selected. Press Enter to open.`
      : 'No services found.'
    : undefined;

  const updateSelectedServiceId = useCallback((serviceId: string | null) => {
    selectedServiceIdRef.current = serviceId;
    setSelectedServiceId(serviceId);
  }, []);

  const handleSearchChange = useCallback((nextQuery: string) => {
    setSearchQuery(nextQuery);
    updateSelectedServiceId(null);
  }, [updateSelectedServiceId]);

  const focusService = useCallback((serviceId: string) => {
    requestAnimationFrame(() => {
      const element = document.getElementById(getDashboardServiceElementId(serviceId));
      if (!element) return;

      element.focus({ preventScroll: true });
      element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }, []);

  const moveServiceSelection = useCallback((direction: SpatialDirection, currentServiceId: string | null) => {
    const nextServiceId = getNextSpatialItemId({
      items: getVisibleServiceItems(),
      currentId: currentServiceId,
      direction,
    });

    if (!nextServiceId) {
      return;
    }

    updateSelectedServiceId(nextServiceId);
    focusService(nextServiceId);
  }, [focusService, updateSelectedServiceId]);

  const handleSearchKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    const currentQuery = event.currentTarget.value;

    if (event.key === 'Escape') {
      if (currentQuery.length > 0) {
        event.preventDefault();
        setSearchQuery('');
        updateSelectedServiceId(null);
      }
      return;
    }

    const currentSearchResult = getDashboardSearchResult({
      categories,
      services,
      query: currentQuery,
    });
    const currentActiveServiceId = getActiveServiceId(
      currentSearchResult,
      selectedServiceIdRef.current
    );
    const currentActiveService = currentActiveServiceId
      ? currentSearchResult.launchServices.find((service) => service.id === currentActiveServiceId) ?? null
      : null;

    if (!currentSearchResult.isSearching || currentSearchResult.launchServices.length === 0) {
      return;
    }

    const direction = getSpatialDirection(event.key);
    if (direction === 'down' || direction === 'up') {
      event.preventDefault();
      moveServiceSelection(direction, currentActiveServiceId);
      return;
    }

    if (event.key === 'Enter' && currentActiveService) {
      event.preventDefault();
      window.open(currentActiveService.url, '_blank', 'noopener,noreferrer');
    }
  }, [categories, moveServiceSelection, services, updateSelectedServiceId]);

  const handleServiceNavigationKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing) return;

    if (event.key === 'Escape' && searchQuery.length > 0) {
      event.preventDefault();
      setSearchQuery('');
      updateSelectedServiceId(null);
      requestAnimationFrame(() => searchInputRef.current?.focus());
      return;
    }

    const direction = getSpatialDirection(event.key);
    if (!direction || !searchResult.isSearching || searchResult.launchServices.length === 0) {
      return;
    }

    const serviceElement = (event.target as HTMLElement).closest<HTMLElement>(
      `[${DASHBOARD_SERVICE_ID_ATTRIBUTE}]`
    );
    const currentServiceId = serviceElement?.getAttribute(DASHBOARD_SERVICE_ID_ATTRIBUTE)
      ?? selectedServiceIdRef.current
      ?? activeServiceId;

    event.preventDefault();
    moveServiceSelection(direction, currentServiceId);
  }, [
    activeServiceId,
    moveServiceSelection,
    searchQuery.length,
    searchResult.isSearching,
    searchResult.launchServices.length,
    updateSelectedServiceId,
  ]);

  const handleFocusService = useCallback((service: Service) => {
    if (searchResult.isSearching) {
      updateSelectedServiceId(service.id);
    }
  }, [searchResult.isSearching, updateSelectedServiceId]);

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
      <PageHeader title={titleText} appLogo={appLogo}>
        <SearchBar
          ref={searchInputRef}
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          assistiveText={searchAssistiveText}
          ariaLabel="Search services"
        />
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
        ) : searchResult.groups.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">
            No services found matching your search.
          </p>
        ) : (
          <div
            onKeyDown={handleServiceNavigationKeyDown}
            className={
              settings.layout === LAYOUTS.COLUMNS
                ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'flex flex-col gap-12'
            }
          >
            {searchResult.groups.map(({ category, services: categoryServices }) => (
              <CategoryLayout
                key={category.id}
                category={category}
                services={categoryServices}
                layout={settings.layout}
                expandOnHover={settings.expandOnHover}
                onEditService={handleEditService}
                onDeleteService={handleDeleteService}
                onFocusService={handleFocusService}
                cacheKey={cacheKey}
                searchTokens={searchResult.tokens}
                selectedServiceId={activeServiceId}
              />
            ))}
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

      {showFooter && <PageFooter />}
    </AppearanceProvider>
  );
}
