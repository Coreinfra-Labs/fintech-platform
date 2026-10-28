import React, { useCallback, useState, useEffect } from 'react';
import { transactionService } from '../services/transactionService';
import { walletService } from '../services/walletService';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { v4 as uuidv4 } from 'uuid';

const Transfer = () => {
  const { user } = useAuthStore();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sourceWalletId: '',
    destinationAccountNumber: '',
    destinationBankCode: '',
    amount: '',
    description: '',
  });

  const fetchWallets = useCallback(async () => {
    try {
      if (user?.id) {
        const data = await walletService.getWallets(user.id);
        setWallets(data.wallets || []);
        if (data.wallets?.length > 0) {
          setFormData((prev) => ({
            ...prev,
            sourceWalletId: data.wallets[0].id,
          }));
        }
      }
    } catch (error) {
      toast.error('Failed to fetch wallets');
    }
  }, [user]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ❌ Removed unused variable assignment
      await transactionService.createTransaction({
        ...formData,
        idempotencyKey: uuidv4(),
      });
      toast.success('Transfer initiated successfully!');
      setFormData({
        sourceWalletId: wallets[0]?.id || '',
        destinationAccountNumber: '',
        destinationBankCode: '',
        amount: '',
        description: '',
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create transfer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Transfer Money</h1>

      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">From Wallet</label>
            <select
              name="sourceWalletId"
              value={formData.sourceWalletId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            >
              <option value="">Select a wallet</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.accountNumber} - ₦{parseFloat(wallet.balance).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Destination Account Number
            </label>
            <input
              type="text"
              name="destinationAccountNumber"
              value={formData.destinationAccountNumber}
              onChange={handleChange}
              placeholder="Enter account number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Bank Code</label>
            <input
              type="text"
              name="destinationBankCode"
              value={formData.destinationBankCode}
              onChange={handleChange}
              placeholder="e.g., 001, 009"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Amount (₦)</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional: Add a description"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Send Transfer'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Transfer;
