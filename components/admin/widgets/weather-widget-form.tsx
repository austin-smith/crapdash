'use client';

import { useState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { searchWeatherLocations } from '@/lib/actions';
import { getDefaultWeatherUnits } from '@/lib/widgets';
import { WEATHER_UNITS, WIDGET_TYPES, type WeatherLocation, type WeatherUnits } from '@/lib/types';
import { WidgetFormFooter, type WidgetFormProps } from './widget-form-shared';

const UNIT_OPTIONS = [
  { value: WEATHER_UNITS.IMPERIAL, label: '°F, mph' },
  { value: WEATHER_UNITS.METRIC, label: '°C, km/h' },
] as const;

function formatCoordinate(value: number): string {
  return String(Math.round(value * 10_000) / 10_000);
}

function parseCoordinate(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function WeatherWidgetForm({ widget, errors, isSubmitting, onSubmit, onCancel }: WidgetFormProps<typeof WIDGET_TYPES.WEATHER>) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WeatherLocation[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [name, setName] = useState(widget?.location.name ?? '');
  const [latitude, setLatitude] = useState(widget ? String(widget.location.latitude) : '');
  const [longitude, setLongitude] = useState(widget ? String(widget.location.longitude) : '');
  const [units, setUnits] = useState<WeatherUnits>(() => widget?.units ?? getDefaultWeatherUnits(navigator.language));
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const fieldErrors = { ...errors, ...localErrors };

  const handleSearch = async () => {
    if (isSearching) return;
    setIsSearching(true);
    setSearchError(null);

    const result = await searchWeatherLocations(query);
    if (result.success) {
      setResults(result.data);
    } else {
      setResults(null);
      setSearchError(result.errors[0]?.message ?? 'Location search failed');
    }

    setIsSearching(false);
  };

  const handleSelectLocation = (location: WeatherLocation) => {
    setName(location.name);
    setLatitude(formatCoordinate(location.latitude));
    setLongitude(formatCoordinate(location.longitude));
    setResults(null);
    setQuery('');
    setLocalErrors({});
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const parsedLatitude = parseCoordinate(latitude);
    const parsedLongitude = parseCoordinate(longitude);
    const nextErrors: Record<string, string> = {};
    if (parsedLatitude === null) nextErrors['location.latitude'] = 'Latitude must be a number';
    if (parsedLongitude === null) nextErrors['location.longitude'] = 'Longitude must be a number';
    setLocalErrors(nextErrors);
    if (parsedLatitude === null || parsedLongitude === null) return;

    onSubmit({
      type: WIDGET_TYPES.WEATHER,
      location: { name: name.trim(), latitude: parsedLatitude, longitude: parsedLongitude },
      units,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field data-invalid={!!searchError}>
        <FieldLabel htmlFor="weather-location-search">Find a place</FieldLabel>
        <div className="flex gap-2">
          <Input
            id="weather-location-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void handleSearch();
              }
            }}
            placeholder="City or postal code"
            disabled={isSubmitting}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleSearch()}
            disabled={isSubmitting || isSearching || query.trim().length < 2}
          >
            {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Search
          </Button>
        </div>
        {searchError && <FieldError>{searchError}</FieldError>}
        {results && (
          results.length === 0 ? (
            <FieldDescription>No places found. Try a different search or enter coordinates below.</FieldDescription>
          ) : (
            <ul className="divide-y rounded-lg border" aria-label="Search results">
              {results.map((location) => (
                <li key={`${location.latitude},${location.longitude}`}>
                  <button
                    type="button"
                    onClick={() => handleSelectLocation(location)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:outline-none"
                  >
                    <MapPin className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{location.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {formatCoordinate(location.latitude)}, {formatCoordinate(location.longitude)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
        <FieldDescription>
          Search uses the free Open-Meteo geocoding API, or enter the details yourself.
        </FieldDescription>
      </Field>

      <Field data-invalid={!!fieldErrors['location.name']}>
        <FieldLabel htmlFor="weather-location-name">Location name *</FieldLabel>
        <Input
          id="weather-location-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Shown on the dashboard"
          disabled={isSubmitting}
        />
        {fieldErrors['location.name'] && <FieldError>{fieldErrors['location.name']}</FieldError>}
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field data-invalid={!!fieldErrors['location.latitude']}>
          <FieldLabel htmlFor="weather-latitude">Latitude *</FieldLabel>
          <Input
            id="weather-latitude"
            inputMode="decimal"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            placeholder="30.2672"
            className="font-mono"
            disabled={isSubmitting}
          />
          {fieldErrors['location.latitude'] && <FieldError>{fieldErrors['location.latitude']}</FieldError>}
        </Field>
        <Field data-invalid={!!fieldErrors['location.longitude']}>
          <FieldLabel htmlFor="weather-longitude">Longitude *</FieldLabel>
          <Input
            id="weather-longitude"
            inputMode="decimal"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            placeholder="-97.7431"
            className="font-mono"
            disabled={isSubmitting}
          />
          {fieldErrors['location.longitude'] && <FieldError>{fieldErrors['location.longitude']}</FieldError>}
        </Field>
      </div>

      <Field data-invalid={!!fieldErrors.units}>
        <FieldLabel>Units</FieldLabel>
        <ToggleGroup
          type="single"
          variant="outline"
          value={units}
          onValueChange={(value) => value && setUnits(value as WeatherUnits)}
          className="grid w-full grid-cols-2"
          disabled={isSubmitting}
        >
          {UNIT_OPTIONS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {fieldErrors.units && <FieldError>{fieldErrors.units}</FieldError>}
      </Field>

      <WidgetFormFooter
        isEditing={!!widget}
        isSubmitting={isSubmitting}
        generalError={fieldErrors.general}
        onCancel={onCancel}
      />
    </form>
  );
}
