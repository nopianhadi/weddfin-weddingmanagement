import React, { useState, useMemo } from 'react';
import { TeamProjectPayment, Card, FinancialPocket } from '../types';
import { CheckSquareIcon, DollarSignIcon, CreditCardIcon, AlertCircleIcon } from '../constants';

interface BatchPaymentProps {
    payments: TeamProjectPayment[];
    cards: Card[];
    pockets: FinancialPocket[];
    onBatchPay: (paymentIds: string[], sourceCardId: string, sourcePocketId?: string) => Promise<void>;
    showNotification: (message: string) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

export const BatchPayment: React.FC<BatchPaymentProps> = ({
    payments,
    cards,
    pockets,
    onBatchPay,
    showNotification,
}) => {
    const [selectedPaymentIds, setSelectedPaymentIds] = useState<Set<string>>(new Set());
    const [paymentType, setPaymentType] = useState<'card' | 'pocket'>('card');
    const [sourceCardId, setSourceCardId] = useState('');
    const [sourcePocketId, setSourcePocketId] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Filter unpaid payments
    const unpaidPayments = useMemo(() =>
        payments.filter(p => p.status === 'Unpaid'),
        [payments]
    );

    // Calculate total selected
    const totalSelected = useMemo(() => {
        return unpaidPayments
            .filter(p => selectedPaymentIds.has(p.id))
            .reduce((sum, p) => sum + p.fee, 0);
    }, [unpaidPayments, selectedPaymentIds]);

    // Get available balance
    const availableBalance = useMemo(() => {
        if (paymentType === 'card' && sourceCardId) {
            const card = cards.find(c => c.id === sourceCardId);
            return card?.balance || 0;
        }
        if (paymentType === 'pocket' && sourcePocketId) {
            const pocket = pockets.find(p => p.id === sourcePocketId);
            return pocket?.amount || 0;
        }
        return 0;
    }, [paymentType, sourceCardId, sourcePocketId, cards, pockets]);

    const isSufficientBalance = availableBalance >= totalSelected;

    const handleTogglePayment = (paymentId: string) => {
        const newSelected = new Set(selectedPaymentIds);
        if (newSelected.has(paymentId)) {
            newSelected.delete(paymentId);
        } else {
            newSelected.add(paymentId);
        }
        setSelectedPaymentIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedPaymentIds.size === unpaidPayments.length) {
            setSelectedPaymentIds(new Set());
        } else {
            setSelectedPaymentIds(new Set(unpaidPayments.map(p => p.id)));
        }
    };

    const handleBatchPay = async () => {
        if (selectedPaymentIds.size === 0) {
            showNotification('Pilih minimal satu pembayaran');
            return;
        }

        if (!sourceCardId && paymentType === 'card') {
            showNotification('Pilih kartu untuk pembayaran');
            return;
        }

        if (!sourcePocketId && paymentType === 'pocket') {
            showNotification('Pilih kantong untuk pembayaran');
            return;
        }

        if (!isSufficientBalance) {
            showNotification('Saldo tidak mencukupi');
            return;
        }

        setIsProcessing(true);
        try {
            await onBatchPay(
                Array.from(selectedPaymentIds),
                sourceCardId,
                paymentType === 'pocket' ? sourcePocketId : undefined
            );
            setSelectedPaymentIds(new Set());
            setSourceCardId('');
            setSourcePocketId('');
            showNotification(`Berhasil membayar ${selectedPaymentIds.size} pembayaran`);
        } catch (error) {
            console.error('Batch payment error:', error);
            showNotification('Gagal melakukan pembayaran batch');
        } finally {
            setIsProcessing(false);
        }
    };

    if (unpaidPayments.length === 0) {
        return (
            <div className="text-center py-8 text-brand-text-secondary">
                <CheckSquareIcon className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>Semua pembayaran sudah lunas</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-sm font-semibold text-brand-accent hover:underline"
                >
                    {selectedPaymentIds.size === unpaidPayments.length ? 'Batalkan Semua' : 'Pilih Semua'}
                </button>
                <span className="text-sm text-brand-text-secondary">
                    {selectedPaymentIds.size} dari {unpaidPayments.length} terpilih
                </span>
            </div>

            {/* Payment List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
                {unpaidPayments.map((payment) => (
                    <label
                        key={payment.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedPaymentIds.has(payment.id)
                            ? 'border-brand-accent bg-brand-accent/5'
                            : 'border-brand-border hover:border-brand-accent/50 bg-brand-bg'
                            }`}
                    >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <input
                                type="checkbox"
                                checked={selectedPaymentIds.has(payment.id)}
                                onChange={() => handleTogglePayment(payment.id)}
                                className="h-4 w-4 text-brand-accent rounded focus:ring-brand-accent flex-shrink-0 transition-colors"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-brand-text-light text-sm truncate">
                                    {payment.teamMemberName}
                                </p>
                                <p className="text-xs text-brand-text-secondary truncate">
                                    Fee Acara • {new Date(payment.date).toLocaleDateString('id-ID')}
                                </p>
                            </div>
                        </div>
                        <span className="font-bold text-brand-text-light text-sm ml-2">
                            {formatCurrency(payment.fee)}
                        </span>
                    </label>
                ))}
            </div>

            {/* Payment Summary */}
            {selectedPaymentIds.size > 0 && (
                <div className="bg-brand-bg rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-brand-text-secondary">
                            Total Terpilih
                        </span>
                        <span className="text-lg font-bold text-brand-text-light">
                            {formatCurrency(totalSelected)}
                        </span>
                    </div>

                    {/* Payment Source Selection */}
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setPaymentType('card');
                                    setSourcePocketId('');
                                }}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${paymentType === 'card'
                                    ? 'bg-brand-accent text-white'
                                    : 'bg-brand-input text-brand-text-primary hover:bg-brand-accent/10'
                                    }`}
                            >
                                Kartu
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setPaymentType('pocket');
                                    setSourceCardId('');
                                }}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${paymentType === 'pocket'
                                    ? 'bg-brand-accent text-white'
                                    : 'bg-brand-input text-brand-text-primary hover:bg-brand-accent/10'
                                    }`}
                            >
                                Kantong
                            </button>
                        </div>

                        {paymentType === 'card' ? (
                            <select
                                value={sourceCardId}
                                onChange={(e) => setSourceCardId(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
                            >
                                <option value="">Pilih Kartu...</option>
                                {cards.map((card) => (
                                    <option key={card.id} value={card.id}>
                                        {card.bankName} {card.lastFourDigits !== 'CASH' ? `**** ${card.lastFourDigits}` : '(Tunai)'} - {formatCurrency(card.balance)}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <select
                                value={sourcePocketId}
                                onChange={(e) => setSourcePocketId(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
                            >
                                <option value="">Pilih Kantong...</option>
                                {pockets.map((pocket) => (
                                    <option key={pocket.id} value={pocket.id}>
                                        {pocket.name} - {formatCurrency(pocket.amount)}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Balance Check */}
                    {(sourceCardId || sourcePocketId) && (
                        <div className={`flex items-center gap-2 text-sm ${isSufficientBalance ? 'text-green-500' : 'text-red-500'
                            }`}>
                            {isSufficientBalance ? (
                                <>
                                    <CheckSquareIcon className="w-4 h-4" />
                                    <span>Saldo mencukupi: {formatCurrency(availableBalance)}</span>
                                </>
                            ) : (
                                <>
                                    <AlertCircleIcon className="w-4 h-4" />
                                    <span>Saldo tidak cukup: {formatCurrency(availableBalance)}</span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Pay Button */}
                    <button
                        type="button"
                        onClick={handleBatchPay}
                        disabled={!isSufficientBalance || isProcessing || (!sourceCardId && !sourcePocketId)}
                        className="w-full px-4 py-3 rounded-xl bg-brand-accent text-white font-semibold hover:bg-brand-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Memproses...</span>
                            </>
                        ) : (
                            <>
                                <DollarSignIcon className="w-5 h-5" />
                                <span>Bayar Terpilih ({selectedPaymentIds.size} items)</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default BatchPayment;
