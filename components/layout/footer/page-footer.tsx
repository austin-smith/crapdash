import Image from "next/image";
import { Button } from "@/components/ui/button";
import { DEFAULT_APP_TITLE } from "@/lib/types";

export function PageFooter() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION;

  return (
    <footer className="fixed bottom-3 right-4 sm:right-6">
      <Button
        variant="ghost"
        size="xs"
        asChild
        className="bg-background/80 font-mono text-muted-foreground/60 backdrop-blur-sm hover:bg-background/80 hover:text-muted-foreground"
      >
        <a
          href="https://github.com/austin-smith/crapdash"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on GitHub"
        >
          <Image
            src="/github-mark.svg"
            alt=""
            width={12}
            height={12}
            data-icon="inline-start"
            className="opacity-60 transition-opacity group-hover/button:opacity-100 dark:invert"
          />
          <span>{DEFAULT_APP_TITLE} {version}</span>
        </a>
      </Button>
    </footer>
  );
}
