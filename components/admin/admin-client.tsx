'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { Separator } from '@/components/ui/separator';
import { Plus, FolderOpen, Computer } from 'lucide-react';
import { ArrowLeftIcon } from '@/components/ui/arrow-left';
import { AnimateIcon } from '@/components/ui/animate-icon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { SearchBar } from '@/components/dashboard/search-bar';
import { CategoryList } from '@/components/admin/category-list';
import { ServiceList } from '@/components/admin/service-list';
import { CategoryFormModal } from '@/components/admin/category-form-modal';
import { ServiceFormModal } from '@/components/admin/service-form-modal';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import type { Category, Service } from '@/lib/types';

interface AdminClientProps {
  categories: Category[];
  services: Service[];
}

export function AdminClient({ categories: initialCategories, services: initialServices }: AdminClientProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [services, setServices] = useState<Service[]>(initialServices);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();
  const [editingService, setEditingService] = useState<Service | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      <PageHeader
        title="crapdash admin"
      >
        <SearchBar ref={searchInputRef} value={searchQuery} onChange={setSearchQuery} />
        <ThemeToggle />
        <Tooltip>
          <TooltipTrigger asChild>
            <AnimateIcon animateOnHover asChild>
              <Button variant="outline" size="icon-lg" asChild>
                <Link href="/">
                  <ArrowLeftIcon size={14} />
                </Link>
              </Button>
            </AnimateIcon>
          </TooltipTrigger>
          <TooltipContent side="bottom">Back to Dashboard</TooltipContent>
        </Tooltip>
      </PageHeader>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Categories Section */}
          <section>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Categories</CardTitle>
                  {categories.length > 0 && (
                    <Button onClick={handleAddCategory}>
                      <Plus className="h-4 w-4" />
                      Add Category
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Separator className="mb-4" />
                {categories.length === 0 ? (
                  <Empty className="py-8">
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
              </CardContent>
            </Card>
          </section>

          {/* Services Section */}
          <section>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Services</CardTitle>
                  {services.length > 0 && (
                    <Button onClick={handleAddService}>
                      <Plus className="h-4 w-4" />
                      Add Service
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Separator className="mb-4" />
                {services.length === 0 ? (
                  <Empty className="py-8">
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
                  />
                )}
              </CardContent>
            </Card>
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
        />
      </main>
    </>
  );
}
