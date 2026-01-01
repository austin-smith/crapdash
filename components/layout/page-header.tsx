import Image from "next/image";
import Link from "next/link";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="w-full bg-muted border-b border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 shrink-0">
            <Link href="/">
              <Image
                src="/compy.png"
                alt="Compy"
                width={56}
                height={56}
                className="hover:scale-105 transition-transform"
              />
            </Link>
            <div>
              <h1 className="text-4xl font-bold font-mono text-gradient-title">{title}</h1>
              {description && (
                <p className="text-muted-foreground mt-2">{description}</p>
              )}
            </div>
          </div>
          {children && (
            <div className="flex items-center justify-end gap-2 md:gap-3 w-full md:w-auto">{children}</div>
          )}
        </div>
      </div>
    </div>
  );
}
