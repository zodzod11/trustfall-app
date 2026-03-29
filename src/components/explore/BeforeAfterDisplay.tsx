type BeforeAfterDisplayProps = {
  beforeImageUrl: string
  afterImageUrl: string
  serviceTitle: string
}

export function BeforeAfterDisplay({
  beforeImageUrl,
  afterImageUrl,
  serviceTitle,
}: BeforeAfterDisplayProps) {
  return (
    <section className="space-y-3">
      <div className="tf-card overflow-hidden">
        <div className="relative aspect-[4/5]">
          <img
            src={afterImageUrl}
            alt={`${serviceTitle} after result`}
            className="h-full w-full object-cover"
          />
          <span className="tf-tag absolute left-3 top-3 border-border/80 bg-background/80 text-foreground backdrop-blur-sm">
            After
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="tf-card overflow-hidden">
          <div className="relative aspect-[3/4]">
            <img
              src={beforeImageUrl}
              alt={`${serviceTitle} before`}
              className="h-full w-full object-cover"
            />
            <span className="tf-tag absolute left-2 top-2 border-border/80 bg-background/80 text-foreground">
              Before
            </span>
          </div>
        </div>
        <div className="tf-card overflow-hidden">
          <div className="relative aspect-[3/4]">
            <img
              src={afterImageUrl}
              alt={`${serviceTitle} after close-up`}
              className="h-full w-full object-cover"
            />
            <span className="tf-tag absolute left-2 top-2 border-border/80 bg-background/80 text-foreground">
              After
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
