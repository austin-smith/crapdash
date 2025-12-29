import Image from "next/image";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="w-full bg-muted/50 border-b border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/compy.png"
              alt="Compy"
              width={56}
              height={56}
              className="rounded-xl shadow-md"
            />
            <div>
              <h1 className="text-4xl font-bold text-gradient-title">{title}</h1>
              {description && (
                <p className="text-muted-foreground mt-2">{description}</p>
              )}
            </div>
          </div>
          {children && (
            <div className="flex items-center gap-3 flex-wrap">{children}</div>
          )}
        </div>
      </div>
    </div>
  );
}

