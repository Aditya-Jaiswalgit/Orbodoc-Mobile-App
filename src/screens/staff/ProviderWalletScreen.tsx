import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { StaffHeader } from '../../components/common/StaffHeader';
import { Pagination } from '../../components/common/Pagination';
import { RequestState } from '../../components/common/RequestState';
import { useAuthContext } from '../../context/AuthContext';
import { useRemoteData } from '../../hooks/useRemoteData';
import { getProviderWalletTransactionsApi } from '../../api/providerWalletApi';
import { dashboardNumber, displayAmount, displayDate } from '../../utils/dashboardValues';

export function ProviderWalletScreen({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const { activeClinicId, token } = useAuthContext();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  useEffect(() => { setPage(1); }, [activeClinicId]);
  const wallet = useRemoteData(`${token}:${activeClinicId}:wallet:${page}:${limit}`, async () => {
    if (!activeClinicId) throw new Error('No clinic selected');
    const result = await getProviderWalletTransactionsApi(activeClinicId, page, limit);
    if (!result.success || !result.data?.wallet || !Array.isArray(result.data.transactions?.data)) throw new Error('Wallet unavailable');
    return result.data;
  });
  const total = Number(wallet.data?.transactions.total ?? 0);
  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <StaffHeader onOpenDrawer={onOpenDrawer} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} refreshControl={<RefreshControl refreshing={wallet.loading} onRefresh={wallet.refresh} />}>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>Wallet Overview</Text>
        <RequestState loading={wallet.loading && !wallet.data} error={wallet.error} onRetry={wallet.refresh} />
        <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 12, gap: 10 }}>
          <Text>Available balance</Text>
          <Text style={{ fontSize: 28 }}>{displayAmount(dashboardNumber(wallet.data?.wallet.available_balance))}</Text>
          <Text>Pending balance: {displayAmount(dashboardNumber(wallet.data?.wallet.pending_balance))}</Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>Transactions</Text>
        <RequestState empty={wallet.data && total === 0 ? 'No transactions yet.' : undefined} />
        {wallet.data?.transactions.data.map(item => (
          <View key={item.id} style={{ backgroundColor: 'white', padding: 16, borderRadius: 12, gap: 6 }}>
            <Text>{item.description || item.transaction_type || 'Transaction'}</Text>
            <Text>{displayAmount(dashboardNumber(item.amount))}</Text>
            <Text>{item.status} · {displayDate(item.created_at)}</Text>
          </View>
        ))}
        <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil(total / limit))} totalItems={total} pageSize={limit}
          onPageChange={setPage} onPageSizeChange={size => { setLimit(size); setPage(1); }} />
      </ScrollView>
    </View>
  );
}
