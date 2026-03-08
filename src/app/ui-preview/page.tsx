import Link from 'next/link';
import {
  AppShell,
  Badge,
  Button,
  CartCard,
  ChoiceCard,
  EmptyState,
  PromoBanner,
  RestaurantCard,
  SectionHeader,
  StatusIndicator,
  Surface,
  TextAreaField,
  TextField,
} from '@/../resources/components';

export default function UiPreviewPage() {
  return (
    <AppShell chromeInset="none">
      <div className="space-y-8 py-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <SectionHeader
              eyebrow="Resources"
              title="UI Preview"
              description="Live preview of the reusable component library built from the design resources."
            />
            <Link
              className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              href="/"
            >
              Back home
            </Link>
          </div>

          <PromoBanner
            ctaAction={<Button variant="outline">Open design audit</Button>}
            description="Review the shared surfaces, forms, cards, and status modules without depending on a full app flow."
            eyebrow="Component library"
            title="Resources now have a live preview route"
            tone="orange"
          />
        </section>

        <section className="space-y-4">
          <SectionHeader title="Primitives" description="Buttons, badges, inputs, and base surfaces." />
          <Surface className="space-y-4" variant="base">
            <div className="flex flex-wrap gap-3">
              <Button>Primary action</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Badge variant="brand">New</Badge>
              <Badge variant="success">Synced</Badge>
            </div>
            <div className="grid gap-4">
              <TextField defaultValue="ivanquiroscenteno@gmail.com" description="Supports helper copy and icon slots." label="Email" readOnly />
              <TextAreaField defaultValue="Leave at reception and call on arrival." description="Textarea styles used in profile and checkout address flows." label="Delivery notes" readOnly rows={3} />
            </div>
          </Surface>
        </section>

        <section className="space-y-4">
          <SectionHeader title="Selection Patterns" description="Choice cards and status modules reused across checkout and profile." />
          <div className="grid gap-4">
            <Surface className="grid gap-3" variant="base">
              <ChoiceCard checked description="Useful for service mode, address type, or payment selections." title="Delivery" />
              <ChoiceCard description="Static preview of an unchecked choice card." title="Pickup" />
            </Surface>
            <StatusIndicator
              currentStep={1}
              label="Checkout migration"
              meta="First integration slice is moving route-level pieces onto shared components."
              progress={45}
              steps={["Audit", "Preview route", "Checkout row", "Menu cards"]}
            />
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader title="Composites" description="Representative cards from the shared component library." />
          <div className="grid gap-4">
            <RestaurantCard
              averageTicket="₡6.500"
              badge="Top rated"
              categories={["Ramen", "Sushi"]}
              deliveryFee="₡1.000"
              eta="25-35 min"
              favoriteAction={<span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">Saved</span>}
              image={<div className="h-full w-full bg-gradient-to-br from-orange-200 via-amber-300 to-rose-400" />}
              rating={4.8}
              title="Izakaya Zen"
            />
            <CartCard
              itemCount="3 items"
              metadata={[
                { label: 'Service mode', value: 'Delivery' },
                { label: 'Payment', value: 'SINPE Móvil' },
              ]}
              primaryAction={<span className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-950">Resume checkout</span>}
              status="Active"
              subtitle="Updated 2 min ago"
              title="Friday dinner cart"
              total="₡18.400"
            />
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader title="Empty State" description="Reusable fallback when data is not available yet." />
          <EmptyState
            action={<Button variant="secondary">Browse restaurants</Button>}
            description="This is the shared empty module now used when favorites or carts have no content to show."
            title="Nothing here yet"
          />
        </section>
      </div>
    </AppShell>
  );
}