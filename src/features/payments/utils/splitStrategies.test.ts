import { describe, it, expect } from 'vitest';
import { EqualSplitStrategy, ItemizedSplitStrategy, CustomAmountSplitStrategy } from './splitStrategies';
import { GroupCartParticipant, CartItem } from '@/types';

const mockParticipant = (id: string, name: string, items: CartItem[] = []): GroupCartParticipant => ({
    id,
    name,
    isHost: false,
    items,
    joinedAt: Date.now()
});

const mockItem = (id: string, name: string, price: number, quantity: number = 1): CartItem => ({
    id,
    name,
    description: '',
    price,
    category: '',
    image: '',
    quantity,
    notes: ''
});

describe('Split Strategies', () => {
    describe('EqualSplitStrategy', () => {
        const strategy = new EqualSplitStrategy();

        it('should split equally among participants', () => {
            const participants = [
                mockParticipant('1', 'Alice'),
                mockParticipant('2', 'Bob')
            ];
            const subtotal = 100;
            const taxes = 10;
            const results = strategy.calculate(participants, subtotal, taxes);

            expect(results).toHaveLength(2);
            expect(results[0].finalTotal).toBe(55);
            expect(results[1].finalTotal).toBe(55);
            expect(results[0].itemsTotal).toBe(50);
            expect(results[0].proportionalTaxAndFees).toBe(5);
        });

        it('should return empty array for no participants', () => {
            const results = strategy.calculate([], 100, 10);
            expect(results).toEqual([]);
        });

        it('should handle zero subtotal and taxes', () => {
            const participants = [mockParticipant('1', 'Alice')];
            const results = strategy.calculate(participants, 0, 0);
            expect(results[0].finalTotal).toBe(0);
        });
    });

    describe('ItemizedSplitStrategy', () => {
        const strategy = new ItemizedSplitStrategy();

        it('should split based on items consumed', () => {
            const participants = [
                mockParticipant('1', 'Alice', [mockItem('i1', 'Pizza', 20, 1)]),
                mockParticipant('2', 'Bob', [mockItem('i2', 'Burger', 30, 1)])
            ];
            const subtotal = 50;
            const taxes = 10;
            const results = strategy.calculate(participants, subtotal, taxes);

            expect(results).toHaveLength(2);

            // Alice: 20/50 = 40%
            // Bob: 30/50 = 60%
            const alice = results.find(r => r.participantId === '1');
            const bob = results.find(r => r.participantId === '2');

            expect(alice?.itemsTotal).toBe(20);
            expect(alice?.proportionalTaxAndFees).toBe(4); // 40% of 10
            expect(alice?.finalTotal).toBe(24);

            expect(bob?.itemsTotal).toBe(30);
            expect(bob?.proportionalTaxAndFees).toBe(6); // 60% of 10
            expect(bob?.finalTotal).toBe(36);
        });

        it('should handle participant with no items', () => {
            const participants = [
                mockParticipant('1', 'Alice', [mockItem('i1', 'Pizza', 20, 1)]),
                mockParticipant('2', 'Bob', [])
            ];
            const subtotal = 20;
            const taxes = 10;
            const results = strategy.calculate(participants, subtotal, taxes);

            const bob = results.find(r => r.participantId === '2');
            expect(bob?.itemsTotal).toBe(0);
            expect(bob?.proportionalTaxAndFees).toBe(0);
            expect(bob?.finalTotal).toBe(0);
        });

        it('should handle zero total subtotal safely', () => {
            const participants = [
                mockParticipant('1', 'Alice', []),
                mockParticipant('2', 'Bob', [])
            ];
            const subtotal = 0;
            const taxes = 10;
            // Should not throw and participants get 0
            const results = strategy.calculate(participants, subtotal, taxes);
            expect(results[0].finalTotal).toBe(0);
            expect(results[1].finalTotal).toBe(0);
        });
    });

    describe('CustomAmountSplitStrategy', () => {
        it('should split based on custom amounts', () => {
            const amounts = { '1': 40, '2': 60 };
            const strategy = new CustomAmountSplitStrategy(amounts);
            const participants = [
                mockParticipant('1', 'Alice'),
                mockParticipant('2', 'Bob')
            ];
            const subtotal = 80;
            const taxes = 20; // Total 100

            const results = strategy.calculate(participants, subtotal, taxes);

            const alice = results.find(r => r.participantId === '1');
            const bob = results.find(r => r.participantId === '2');

            expect(alice?.finalTotal).toBe(40);
            expect(alice?.itemsTotal).toBe(32); // 80 * (40/100)
            expect(alice?.proportionalTaxAndFees).toBe(8); // 20 * (40/100)

            expect(bob?.finalTotal).toBe(60);
            expect(bob?.itemsTotal).toBe(48); // 80 * (60/100)
            expect(bob?.proportionalTaxAndFees).toBe(12); // 20 * (60/100)
        });

        it('should default to 0 for missing participants', () => {
            const strategy = new CustomAmountSplitStrategy({ '1': 40 });
            const participants = [
                mockParticipant('1', 'Alice'),
                mockParticipant('2', 'Bob')
            ];
            const results = strategy.calculate(participants, 80, 20);
            const bob = results.find(r => r.participantId === '2');
            expect(bob?.finalTotal).toBe(0);
        });

        it('should handle zero total amount safely', () => {
            const strategy = new CustomAmountSplitStrategy({ '1': 0 });
            const participants = [mockParticipant('1', 'Alice')];
            const results = strategy.calculate(participants, 0, 0);
            expect(results[0].finalTotal).toBe(0);
        });
    });
});
