'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { Plus, FolderOpen, Computer } from 'lucide-react';
import { ArrowLeftIcon } from '@/components/ui/arrow-left';
import { AnimateIcon } from '@/components/ui/animate-icon';
import { SlidersHorizontalIcon } from '@/components/ui/sliders-horizontal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SettingsDialog } from '@/components/dashboard/settings-dialog';
import { useSettings } from '@/hooks/use-settings';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { SearchBar } from '@/components/dashboard/search-bar';
import { CategoryFormModal } from '@/components/admin/category-form-modal';
import { ServiceFormModal } from '@/components/admin/service-form-modal';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { DownloadIcon } from '@/components/ui/download';
import type { Category, Service, DashboardSettings } from '@/lib/types';

// Dynamic imports to avoid SSR for drag-and-drop components
const CategoryList = dynamic(() => import('@/components/admin/category-list').then(m => m.CategoryList), { ssr: false });
const ServiceList = dynamic(() => import('@/components/admin/service-list').then(m => m.ServiceList), { ssr: false });

interface AdminClientProps {
  categories: Category[];
  services: Service[];
  initialSettings: Partial<DashboardSettings>;
}

export function AdminClient({ categories: initialCategories, services: initialServices, initialSettings }: AdminClientProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [services, setServices] = useState<Service[]>(initialServices);
  const { settings, updateSetting } = useSettings({ initialSettings });
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();
  const [editingService, setEditingService] = useState<Service | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  return (
    <>
      <PageHeader title="crapdash /admin">
        <SearchBar ref={searchInputRef} value={searchQuery} onChange={setSearchQuery} />
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
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon-lg" onClick={() => setSettingsOpen(true)}>
              <AnimateIcon animateOnHover>
                <SlidersHorizontalIcon size={18} />
              </AnimateIcon>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Preferences</TooltipContent>
        </Tooltip>
        <SettingsDialog settings={settings} onSettingChange={updateSetting} open={settingsOpen} onOpenChange={setSettingsOpen} />
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
      </PageHeader>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="space-y-10">
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
    </>
  );
}
