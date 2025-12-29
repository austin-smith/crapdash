'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { SettingsIcon } from '@/components/ui/settings';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PageHeader } from '@/components/layout/page-header';
import { CategorySection } from './category-section';
import { SearchBar } from './search-bar';
import type { Category, Service } from '@/lib/types';

interface DashboardClientProps {
  categories: Category[];
  services: Service[];
}

export function DashboardClient({ categories, services }: DashboardClientProps) {
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
        // description="Dashboard for u"
        >
        <SearchBar ref={searchInputRef} value={searchQuery} onChange={setSearchQuery} />
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
      ) : (
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
      )}
      </main>
    </>
  );
}
