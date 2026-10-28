import React, { useCallback, useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { walletService } from '../services/walletService';
import { transactionService } from '../services/transactionService';
import { formatDistanceToNow } from 'date-fns';

const Transactions = () => {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState('');
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async (walletId) => {
    try {
      const data = await transactionService.getWalletTransactions(walletId);
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  }, []);

  const fetchWallets = useCallback(async () => {
    try {
      if (user?.id) {
        const data = await walletService.getWallets(user.id);
        setWallets(data.wallets || []);
        if (data.wallets?.length > 0) {
          setSelectedWallet(data.wallets[0].id);
          fetchTransactions(data.wallets[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch wallets:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchTransactions, user]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const handleWalletChange = (e) => {
    const walletId = e.target.value;
    setSelectedWallet(walletId);
    fetchTransactions(walletId);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Transaction History</h1>

      <div className="mb-6">
        <label className="block text-gray-700 font-semibold mb-2">Select Wallet</label>
        <select
          value={selectedWallet}
          onChange={handleWalletChange}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              {wallet.accountNumber} - {wallet.accountType}
            </option>
          ))}
        </select>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">
          <p>No transactions found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Reference</th>
                <th className="px-6 py-3 text-left font-semibold">Type</th>
                <th className="px-6 py-3 text-left font-semibold">Amount</th>
                <th className="px-6 py-3 text-left font-semibold">Status</th>
                <th className="px-6 py-3 text-left font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-sm">{tx.reference}</td>
                  <td className="px-6 py-3">{tx.type}</td>
                  <td className="px-6 py-3 font-semibold">₦{parseFloat(tx.amount).toFixed(2)}</td>
                  <td className="px-6 py-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      tx.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800'
                        : tx.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : tx.status === 'FAILED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Transactions;
