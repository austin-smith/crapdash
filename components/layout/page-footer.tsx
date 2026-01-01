export function PageFooter() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION;

  return (
    <footer className="fixed bottom-3 right-4 sm:right-6">
      <p className="text-xs text-muted-foreground/60 font-mono bg-background/80 backdrop-blur-sm px-2 py-1 rounded">
        crapdash {version}
      </p>
    </footer>
  );
}

