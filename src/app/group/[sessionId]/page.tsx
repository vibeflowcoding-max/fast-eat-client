"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Copy, QrCode, Share2, ShoppingBag, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import LoadingScreen from '@/components/LoadingScreen';
import { useCartStore } from '@/store';
import { useGroupCartSync } from '@/features/social/hooks/useGroupCartSync';
import { buildGroupLobbySummary, getGroupLobbyParticipantStateLabel } from '@/features/social/lib/groupLobby';

function buildSessionLink(sessionId: string) {
    if (typeof window === 'undefined') {
        return `/group/${sessionId}`;
    }

    return `${window.location.origin}/group/${sessionId}`;
}

export default function GroupCartJoinPage() {
    const t = useTranslations('groupLobby');
    const params = useParams();
    const router = useRouter();
    const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;

    const {
        branchId,
        customerName,
        groupSessionId,
        groupParticipants,
        isHost,
        leaveGroupSession,
        participantId,
        participantName,
        restaurantInfo,
        setGroupSession,
    } = useCartStore();

    useGroupCartSync();

    const [copied, setCopied] = React.useState(false);
    const [sharing, setSharing] = React.useState(false);

    React.useEffect(() => {
        if (!sessionId) {
            return;
        }

        if (groupSessionId === sessionId && participantId) {
            return;
        }

        const nextParticipantId = `guest_${Math.random().toString(36).slice(2, 9)}`;
        const nextParticipantName = participantName || customerName || t('guestName');
        setGroupSession(sessionId, false, nextParticipantId, nextParticipantName);
    }, [customerName, groupSessionId, participantId, participantName, sessionId, setGroupSession, t]);

    const summary = React.useMemo(() => buildGroupLobbySummary(groupParticipants), [groupParticipants]);
    const sessionCode = sessionId ? sessionId.toUpperCase() : '---';
    const sessionLink = sessionId ? buildSessionLink(sessionId) : '';
    const continueHref = React.useMemo(() => {
        if (!branchId) {
            return '/';
        }

        return `/?branch_id=${encodeURIComponent(branchId)}`;
    }, [branchId]);

    const handleCopyInvite = React.useCallback(async () => {
        if (!sessionLink || !navigator.clipboard) {
            return;
        }

        await navigator.clipboard.writeText(sessionLink);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
    }, [sessionLink]);

    const handleShareInvite = React.useCallback(async () => {
        if (!sessionLink) {
            return;
        }

        if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
            await handleCopyInvite();
            return;
        }

        try {
            setSharing(true);
            await navigator.share({
                title: t('shareTitle'),
                text: t('shareText'),
                url: sessionLink,
            });
        } finally {
            setSharing(false);
        }
    }, [handleCopyInvite, sessionLink, t]);

    const handleLeave = React.useCallback(() => {
        leaveGroupSession();
        router.push('/');
    }, [leaveGroupSession, router]);

    if (!sessionId) {
        return <LoadingScreen />;
    }

    return (
        <main className="ui-page min-h-screen pb-12">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pb-8 pt-6">
                <header className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={() => router.push(continueHref)}
                            className="ui-btn-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {t('backToMenu')}
                        </button>
                        <div>
                            <p className="ui-section-title">{t('eyebrow')}</p>
                            <h1 className="text-2xl font-black tracking-[-0.03em]">{t('title')}</h1>
                            <p className="ui-text-muted text-sm">{t('subtitle')}</p>
                        </div>
                    </div>

                    <div className="ui-panel-soft min-w-[108px] rounded-[1.6rem] px-4 py-3 text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                            {t('sessionCode')}
                        </p>
                        <p className="mt-1 text-sm font-black tracking-[0.14em] text-[var(--color-text)]">{sessionCode}</p>
                    </div>
                </header>

                <section className="ui-panel rounded-[2rem] p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                            <p className="text-lg font-black tracking-[-0.02em] text-[var(--color-text)]">
                                {restaurantInfo?.name || t('restaurantFallback')}
                            </p>
                            <p className="ui-text-muted text-sm">
                                {restaurantInfo?.category || t('waitingSubtitle')}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <span className="ui-chip-brand rounded-full px-4 py-2 text-xs font-black">
                                {t('joinedCount', { count: summary.participantCount })}
                            </span>
                            <span className="ui-btn-secondary rounded-full px-4 py-2 text-xs font-black">
                                {t('readyCount', { count: summary.readyCount })}
                            </span>
                        </div>
                    </div>

                    <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-[var(--color-brand-soft)]/60">
                        <div
                            className="rounded-full bg-[var(--color-brand)] transition-all"
                            style={{ width: `${Math.max(18, Math.min(100, summary.participantCount * 20))}%` }}
                        />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <button
                            type="button"
                            onClick={() => void handleShareInvite()}
                            className="ui-btn-primary inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-black"
                        >
                            <Share2 className="h-4 w-4" />
                            {sharing ? t('sharing') : t('shareInvite')}
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleCopyInvite()}
                            className="ui-btn-secondary inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-black"
                        >
                            <Copy className="h-4 w-4" />
                            {copied ? t('copied') : t('copyLink')}
                        </button>
                        <div className="ui-panel-soft inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-black text-[var(--color-text)]">
                            <QrCode className="h-4 w-4 text-[var(--color-brand)]" />
                            {t('shareCodeHint')}
                        </div>
                    </div>
                </section>

                <section className="ui-panel rounded-[2rem] p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="ui-section-title">{t('participantsEyebrow')}</p>
                            <h2 className="text-lg font-black tracking-[-0.02em]">{t('participantsTitle')}</h2>
                        </div>
                        <span className="ui-btn-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black">
                            <Users className="h-4 w-4" />
                            {summary.participantCount}
                        </span>
                    </div>

                    {groupParticipants.length === 0 ? (
                        <div className="ui-panel-soft rounded-[1.6rem] p-4 text-sm text-[var(--color-text-muted)]">
                            {t('emptyParticipants')}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {groupParticipants.map((participant) => {
                                const participantTotal = participant.items.reduce(
                                    (sum, item) => sum + item.price * item.quantity,
                                    0,
                                );
                                const participantState = getGroupLobbyParticipantStateLabel(participant);
                                const isCurrentParticipant = participant.id === participantId;

                                return (
                                    <article
                                        key={participant.id}
                                        className="ui-list-card rounded-[1.5rem] p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-sm font-black text-[var(--color-text)]">
                                                        {isCurrentParticipant ? t('youLabel') : participant.name}
                                                    </p>
                                                    {participant.isHost ? (
                                                        <span className="ui-chip-brand rounded-full px-2 py-1 text-[10px] font-black">
                                                            {t('hostLabel')}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <p className="ui-text-muted text-xs">
                                                    {participantState === 'ready' ? t('participantReady') : t('participantBrowsing')}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-[var(--color-text)]">
                                                    ₡{Math.round(participantTotal).toLocaleString('es-CR')}
                                                </p>
                                                <p className="ui-text-muted text-[11px]">
                                                    {t('itemsCount', { count: participant.items.reduce((sum, item) => sum + item.quantity, 0) })}
                                                </p>
                                            </div>
                                        </div>

                                        {participant.items.length === 0 ? (
                                            <p className="ui-text-muted mt-3 text-xs italic">{t('participantNoItems')}</p>
                                        ) : (
                                            <div className="mt-3 space-y-2">
                                                {participant.items.map((item, index) => (
                                                    <div
                                                        key={`${participant.id}-${item.id}-${index}`}
                                                        className="ui-panel-soft flex items-center justify-between rounded-[1rem] px-3 py-2 text-xs"
                                                    >
                                                        <span className="text-[var(--color-text)]">
                                                            {item.quantity}x {item.name}
                                                        </span>
                                                        <span className="font-bold text-[var(--color-text)]">
                                                            ₡{Math.round(item.quantity * item.price).toLocaleString('es-CR')}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="ui-panel rounded-[2rem] p-5 space-y-3">
                    <div>
                        <p className="ui-section-title">{t('settlementEyebrow')}</p>
                        <h2 className="text-lg font-black tracking-[-0.02em]">{t('settlementTitle')}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="ui-btn-primary rounded-full px-4 py-2 text-xs font-black">{t('splitBill')}</span>
                        <span className="ui-btn-secondary rounded-full px-4 py-2 text-xs font-black">{t('hostPays')}</span>
                    </div>
                    <p className="ui-text-muted text-sm">{t('settlementHint')}</p>
                </section>

                <footer className="ui-panel rounded-[2rem] p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="ui-section-title">{t('groupTotal')}</p>
                            <p className="text-2xl font-black tracking-[-0.03em] text-[var(--color-text)]">
                                ₡{Math.round(summary.totalAmount).toLocaleString('es-CR')}
                            </p>
                            <p className="ui-text-muted text-sm">{t('groupItems', { count: summary.totalItems })}</p>
                        </div>

                        <div className="flex flex-wrap gap-2 md:justify-end">
                            {summary.totalItems > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => router.push('/checkout')}
                                    className="ui-btn-secondary inline-flex min-h-[48px] items-center justify-center rounded-full px-5 py-3 text-sm font-black"
                                >
                                    {t('goToCheckout')}
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={() => router.push(continueHref)}
                                className="ui-btn-primary inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black"
                            >
                                <ShoppingBag className="h-4 w-4" />
                                {t('continueToMenu')}
                            </button>
                            <button
                                type="button"
                                onClick={handleLeave}
                                className="ui-btn-secondary inline-flex min-h-[48px] items-center justify-center rounded-full px-5 py-3 text-sm font-black"
                            >
                                {isHost ? t('closeLobby') : t('leaveGroup')}
                            </button>
                        </div>
                    </div>
                </footer>
            </div>
        </main>
    );
}
