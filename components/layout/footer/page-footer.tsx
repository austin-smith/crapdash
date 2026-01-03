import Image from "next/image";
import { Button } from "@/components/ui/button";

export function PageFooter() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION;

  return (
    <footer className="fixed bottom-3 right-4 sm:right-6">
      <div className="flex items-center gap-1 text-xs text-muted-foreground/60 font-mono bg-background/80 backdrop-blur-sm pl-1 pr-2 py-1 rounded">
        <Button variant="ghost" size="icon-xs" asChild>
          <a
            href="https://github.com/crapshack/crapdash"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on GitHub"
          >
            <Image
              src="/github-mark.svg"
              alt="GitHub"
              width={12}
              height={12}
              className="opacity-60 group-hover/button:opacity-100 transition-opacity dark:invert"
            />
          </a>
        </Button>
        <span>crapdash {version}</span>
      </div>
    </footer>
  );
}
