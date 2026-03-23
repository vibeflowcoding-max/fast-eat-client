"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Copy, QrCode, Share2, ShoppingBag, Users } from 'lucide-react';
import { Badge, Button, SectionHeader, Surface } from '@/../resources/components';
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

        const nextParticipantId = `guest_${crypto.randomUUID().split('-')[0]}`;
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
        <main className="min-h-screen bg-[#f8f6f2] pb-12 text-slate-900 dark:bg-[#221610] dark:text-slate-100">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pb-8 pt-6">
                <header className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(continueHref)}
                            leadingIcon={<ArrowLeft className="h-4 w-4" />}
                        >
                            {t('backToMenu')}
                        </Button>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-600 dark:text-orange-300">{t('eyebrow')}</p>
                            <h1 className="break-words text-2xl font-black tracking-[-0.03em]">{t('title')}</h1>
                            <p className="break-words text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
                        </div>
                    </div>

                    <Surface className="min-w-0 shrink-0 rounded-[1.6rem] px-4 py-3 text-right" padding="none" variant="muted">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            {t('sessionCode')}
                        </p>
                        <p className="mt-1 break-all text-sm font-black tracking-[0.14em] text-slate-900 dark:text-slate-100">{sessionCode}</p>
                    </Surface>
                </header>

                <Surface className="rounded-[2rem]" padding="lg" variant="base">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0 space-y-2">
                            <p className="break-words text-lg font-black tracking-[-0.02em] text-slate-900 dark:text-slate-100">
                                {restaurantInfo?.name || t('restaurantFallback')}
                            </p>
                            <p className="break-words text-sm text-slate-500 dark:text-slate-400">
                                {restaurantInfo?.category || t('waitingSubtitle')}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Badge className="px-4 py-2 text-xs font-black" variant="brand">
                                {t('joinedCount', { count: summary.participantCount })}
                            </Badge>
                            <Badge className="px-4 py-2 text-xs font-black" variant="neutral">
                                {t('readyCount', { count: summary.readyCount })}
                            </Badge>
                        </div>
                    </div>

                    <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-orange-100/80 dark:bg-orange-950/40">
                        <div
                            className="rounded-full bg-orange-600 transition-all dark:bg-orange-400"
                            style={{ width: `${Math.max(18, Math.min(100, summary.participantCount * 20))}%` }}
                        />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <Button
                            onClick={() => void handleShareInvite()}
                            leadingIcon={<Share2 className="h-4 w-4" />}
                        >
                            {sharing ? t('sharing') : t('shareInvite')}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => void handleCopyInvite()}
                            leadingIcon={<Copy className="h-4 w-4" />}
                        >
                            {copied ? t('copied') : t('copyLink')}
                        </Button>
                        <Surface className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-black text-slate-900 dark:text-slate-100" padding="none" variant="muted">
                            <QrCode className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                            {t('shareCodeHint')}
                        </Surface>
                    </div>
                </Surface>

                <Surface className="space-y-4 rounded-[2rem]" padding="lg" variant="base">
                    <div className="flex items-center justify-between gap-3">
                        <SectionHeader eyebrow={t('participantsEyebrow')} title={t('participantsTitle')} />
                        <Badge className="px-4 py-2 text-xs font-black" leading={<Users className="h-4 w-4" />} variant="neutral">
                            {summary.participantCount}
                        </Badge>
                    </div>

                    {groupParticipants.length === 0 ? (
                        <Surface className="rounded-[1.6rem] text-sm text-slate-500 dark:text-slate-400" variant="muted">
                            {t('emptyParticipants')}
                        </Surface>
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
                                    <Surface
                                        key={participant.id}
                                        className="rounded-[1.5rem]"
                                        variant="muted"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                                                        {isCurrentParticipant ? t('youLabel') : participant.name}
                                                    </p>
                                                    {participant.isHost ? (
                                                        <Badge className="px-2 py-1 text-[10px] font-black" variant="brand">
                                                            {t('hostLabel')}
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                    {participantState === 'ready' ? t('participantReady') : t('participantBrowsing')}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                                                    ₡{Math.round(participantTotal).toLocaleString('es-CR')}
                                                </p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    {t('itemsCount', { count: participant.items.reduce((sum, item) => sum + item.quantity, 0) })}
                                                </p>
                                            </div>
                                        </div>

                                        {participant.items.length === 0 ? (
                                            <p className="mt-3 text-xs italic text-slate-500 dark:text-slate-400">{t('participantNoItems')}</p>
                                        ) : (
                                            <div className="mt-3 space-y-2">
                                                {participant.items.map((item, index) => (
                                                    <Surface
                                                        key={`${participant.id}-${item.id}-${index}`}
                                                        className="flex items-center justify-between rounded-[1rem] px-3 py-2 text-xs"
                                                        padding="none"
                                                        variant="base"
                                                    >
                                                        <span className="text-slate-900 dark:text-slate-100">
                                                            {item.quantity}x {item.name}
                                                        </span>
                                                        <span className="font-bold text-slate-900 dark:text-slate-100">
                                                            ₡{Math.round(item.quantity * item.price).toLocaleString('es-CR')}
                                                        </span>
                                                    </Surface>
                                                ))}
                                            </div>
                                        )}
                                    </Surface>
                                );
                            })}
                        </div>
                    )}
                </Surface>

                <Surface className="space-y-3 rounded-[2rem]" padding="lg" variant="base">
                    <SectionHeader eyebrow={t('settlementEyebrow')} title={t('settlementTitle')} />
                    <div className="flex flex-wrap gap-2">
                        <Badge className="px-4 py-2 text-xs font-black" variant="brand">{t('splitBill')}</Badge>
                        <Badge className="px-4 py-2 text-xs font-black" variant="neutral">{t('hostPays')}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('settlementHint')}</p>
                </Surface>

                <Surface asChild={false} className="rounded-[2rem]" padding="lg" variant="base">
                <footer>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-600 dark:text-orange-300">{t('groupTotal')}</p>
                            <p className="text-2xl font-black tracking-[-0.03em] text-slate-900 dark:text-slate-100">
                                ₡{Math.round(summary.totalAmount).toLocaleString('es-CR')}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t('groupItems', { count: summary.totalItems })}</p>
                        </div>

                        <div className="flex flex-wrap gap-2 md:justify-end">
                            {summary.totalItems > 0 ? (
                                <Button
                                    variant="outline"
                                    onClick={() => router.push('/checkout')}
                                >
                                    {t('goToCheckout')}
                                </Button>
                            ) : null}
                            <Button
                                onClick={() => router.push(continueHref)}
                                leadingIcon={<ShoppingBag className="h-4 w-4" />}
                            >
                                {t('continueToMenu')}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleLeave}
                            >
                                {isHost ? t('closeLobby') : t('leaveGroup')}
                            </Button>
                        </div>
                    </div>
                </footer>
                </Surface>
            </div>
        </main>
    );
}
