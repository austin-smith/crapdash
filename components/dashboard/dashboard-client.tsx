'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { SettingsIcon } from '@/components/ui/settings';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PageHeader } from '@/components/layout/page-header';
import { CategorySection } from './category-section';
import { CategoryColumn } from './category-column';
import { SearchBar } from './search-bar';
import { LayoutToggle } from './layout-toggle';
import { useLayout } from '@/hooks/use-layout';
import type { Category, Service } from '@/lib/types';

interface DashboardClientProps {
  categories: Category[];
  services: Service[];
}

export function DashboardClient({ categories, services }: DashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { layout, setLayout, mounted } = useLayout();

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

  return (
    <>
      <PageHeader
        title="Crapdash"
        >
        <SearchBar ref={searchInputRef} value={searchQuery} onChange={setSearchQuery} />
        <LayoutToggle layout={layout} onLayoutChange={setLayout} mounted={mounted} />
        <ThemeToggle />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon-lg" asChild>
              <Link href="/admin">
                <SettingsIcon size={18} />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Settings</TooltipContent>
        </Tooltip>
      </PageHeader>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {filteredData.categories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No services found matching your search.</p>
          </div>
        ) : layout === 'rows' ? (
          <div>
            {filteredData.categories.map((category) => {
              const categoryServices = filteredData.services.filter(
                (s) => s.categoryId === category.id
              );
              return (
                <CategorySection
                  key={category.id}
                  category={category}
                  services={categoryServices}
                />
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredData.categories.map((category) => {
              const categoryServices = filteredData.services.filter(
                (s) => s.categoryId === category.id
              );
              return (
                <CategoryColumn
                  key={category.id}
                  category={category}
                  services={categoryServices}
                />
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
