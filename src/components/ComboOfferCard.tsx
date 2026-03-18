import React from 'react';
import { useTranslations } from 'next-intl';
import { Badge, Button, Surface } from '@/../resources/components';
import type { OfferCombo } from '@/types';

interface ComboOfferCardProps {
  combo: OfferCombo;
  currentQuantity: number;
  onAddCombo: (combo: OfferCombo, nextQuantity: number) => Promise<boolean>;
}

const ComboOfferCard: React.FC<ComboOfferCardProps> = ({ combo, currentQuantity, onAddCombo }) => {
  const t = useTranslations('comboOfferCard');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleAdd = React.useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onAddCombo(combo, currentQuantity > 0 ? currentQuantity + 1 : 1);
    } finally {
      setIsSubmitting(false);
    }
  }, [combo, currentQuantity, onAddCombo]);

  return (
    <Surface className="space-y-4 rounded-[1.75rem] border border-amber-200/70 bg-[linear-gradient(135deg,#fff7ed_0%,#fff1d6_100%)]" variant="base">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]" variant="brand">
              {t('badge')}
            </Badge>
            {currentQuantity > 0 ? (
              <Badge className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]" variant="neutral">
                {t('inCart', { count: currentQuantity })}
              </Badge>
            ) : null}
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">{combo.title}</h3>
            <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              {combo.description || t('fallbackDescription')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{t('comboPrice')}</p>
          <p className="text-2xl font-black text-orange-600 dark:text-orange-300">₡{combo.comboPrice.toLocaleString()}</p>
          {combo.savingsAmount > 0 ? (
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
              {t('saveAmount', { amount: combo.savingsAmount.toLocaleString() })}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{t('includes')}</p>
        <div className="flex flex-wrap gap-2">
          {combo.items.map((item) => (
            <Badge key={`${combo.id}-${item.itemId}`} className="px-3 py-2 text-[11px] font-bold" variant="neutral">
              {item.quantity > 1 ? `${item.quantity}x ` : ''}{item.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-amber-200/70 pt-4 dark:border-amber-700/40">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{t('basePrice')}</p>
          <p className="text-sm font-bold text-slate-700 line-through dark:text-slate-300">₡{combo.basePrice.toLocaleString()}</p>
        </div>
        <Button disabled={isSubmitting} onClick={() => void handleAdd()} type="button">
          {isSubmitting ? t('adding') : currentQuantity > 0 ? t('addAnother') : t('addCombo')}
        </Button>
      </div>
    </Surface>
  );
};

export default ComboOfferCard;