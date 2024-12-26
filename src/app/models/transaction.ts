export interface TransactionModel {
    id: string;
    block: number;
    from: string;
    to: string;
    amount: number;
    currency: string;
    fee: number;
    confirmed: boolean;
    confirmations: number;
    timestamp: number;
}