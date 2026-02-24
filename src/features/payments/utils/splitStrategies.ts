import { GroupCartParticipant } from '@/types';

export interface SplitResult {
    participantId: string;
    participantName: string;
    itemsTotal: number;
    proportionalTaxAndFees: number;
    finalTotal: number;
}

export interface SplitStrategy {
    calculate(
        participants: GroupCartParticipant[],
        subtotal: number,
        taxesAndFees: number
    ): SplitResult[];
}

export class EqualSplitStrategy implements SplitStrategy {
    calculate(participants: GroupCartParticipant[], subtotal: number, taxesAndFees: number): SplitResult[] {
        const count = participants.length;
        if (count === 0) return [];

        const totalAmount = subtotal + taxesAndFees;
        const perPersonTotal = totalAmount / count;
        const perPersonSubtotal = subtotal / count;
        const perPersonFees = taxesAndFees / count;

        return participants.map(p => ({
            participantId: p.id,
            participantName: p.name,
            itemsTotal: perPersonSubtotal,
            proportionalTaxAndFees: perPersonFees,
            finalTotal: perPersonTotal
        }));
    }
}

export class ItemizedSplitStrategy implements SplitStrategy {
    calculate(participants: GroupCartParticipant[], subtotal: number, taxesAndFees: number): SplitResult[] {
        const results: SplitResult[] = [];

        // Sum the actual items of each participant to find their share of the subtotal
        const actualSubtotal = participants.reduce((acc, p) =>
            acc + p.items.reduce((sum, item) => sum + (item.price * item.quantity), 0), 0);

        // Avoid division by zero
        const effectiveSubtotal = actualSubtotal > 0 ? actualSubtotal : 1;

        for (const p of participants) {
            const pItemsTotal = p.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const proportion = pItemsTotal / effectiveSubtotal;
            const pTaxesAndFees = taxesAndFees * proportion;

            results.push({
                participantId: p.id,
                participantName: p.name,
                itemsTotal: pItemsTotal,
                proportionalTaxAndFees: pTaxesAndFees,
                finalTotal: pItemsTotal + pTaxesAndFees
            });
        }

        return results;
    }
}

export class CustomAmountSplitStrategy implements SplitStrategy {
    private amounts: Record<string, number>;

    constructor(amounts: Record<string, number>) {
        this.amounts = amounts;
    }

    calculate(participants: GroupCartParticipant[], subtotal: number, taxesAndFees: number): SplitResult[] {
        const totalAmount = subtotal + taxesAndFees;

        return participants.map(p => {
            const amount = this.amounts[p.id] || 0;
            const pct = totalAmount > 0 ? amount / totalAmount : 0;

            return {
                participantId: p.id,
                participantName: p.name,
                itemsTotal: subtotal * pct,
                proportionalTaxAndFees: taxesAndFees * pct,
                finalTotal: amount
            };
        });
    }
}
