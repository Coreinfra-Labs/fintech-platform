import React, { useCallback, useEffect, useState } from 'react';
import { walletService } from '../services/walletService';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const Wallets = () => {
  const { user } = useAuthStore();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState('SAVINGS');

  const fetchWallets = useCallback(async () => {
    try {
      if (user?.id) {
        const data = await walletService.getWallets(user.id);
        setWallets(data.wallets || []);
      }
    } catch (error) {
      toast.error('Failed to fetch wallets');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const handleCreateWallet = async (e) => {
    e.preventDefault();
    try {
      await walletService.createWallet(accountType);
      toast.success('Wallet created successfully!');
      fetchWallets();
      setAccountType('SAVINGS');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create wallet');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">My Wallets</h1>

      {/* Create Wallet Form */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Create New Wallet</h2>
        <form onSubmit={handleCreateWallet} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Account Type</label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="SAVINGS">Savings</option>
              <option value="CHECKING">Checking</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
          >
            Create Wallet
          </button>
        </form>
      </div>

      {/* Wallets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {wallets.map((wallet) => (
          <div
            key={wallet.id}
            className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600"
          >
            <div className="mb-4">
              <p className="text-gray-600 text-sm">Account Number</p>
              <p className="text-2xl font-bold text-gray-800">{wallet.accountNumber}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-gray-600 text-sm">Type</p>
                <p className="font-semibold text-gray-800">{wallet.accountType}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Status</p>
                <p className="font-semibold">
                  {wallet.isFrozen ? (
                    <span className="text-red-600">Frozen</span>
                  ) : (
                    <span className="text-green-600">Active</span>
                  )}
                </p>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-gray-600 text-sm">Balance</p>
              <p className="text-3xl font-bold text-blue-600">
                ₦{parseFloat(wallet.balance).toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Wallets;
