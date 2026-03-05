'use client';

import { useState, useEffect } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

export default function TestAnalyticsPage() {
  const [range, setRange] = useState('7d');
  const [testResults, setTestResults] = useState<any>(null);
  const { weeklyData, overview, loading, error, refresh } = useAnalytics(range);

  const testAPIs = async () => {
    const authData = localStorage.getItem('evolve-auth');
    if (!authData) {
      setTestResults({ error: 'No hay token de autenticación' });
      return;
    }

    const auth = JSON.parse(authData);
    const token = auth.accessToken;

    const results: {
      overview: any;
      performance: any;
      conversations: any;
      errors: string[];
    } = {
      overview: null,
      performance: null,
      conversations: null,
      errors: []
    };

    try {
      // Test Overview API
      const overviewResponse = await fetch(`/api/analytics/overview?range=${range}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (overviewResponse.ok) {
        results.overview = await overviewResponse.json();
      } else {
        results.errors.push(`Overview API: ${overviewResponse.status} ${overviewResponse.statusText}`);
      }

      // Test Performance API
      const performanceResponse = await fetch(`/api/analytics/performance?range=${range}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (performanceResponse.ok) {
        results.performance = await performanceResponse.json();
      } else {
        results.errors.push(`Performance API: ${performanceResponse.status} ${performanceResponse.statusText}`);
      }

      // Test Conversations API
      const conversationsResponse = await fetch(`/api/analytics/conversations?range=${range}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (conversationsResponse.ok) {
        results.conversations = await conversationsResponse.json();
      } else {
        results.errors.push(`Conversations API: ${conversationsResponse.status} ${conversationsResponse.statusText}`);
      }

    } catch (error) {
      results.errors.push(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    setTestResults(results);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Analytics APIs</h1>

        {/* Controls */}
        <div className="mb-8 flex gap-4 items-center">
          <select 
            value={range} 
            onChange={(e) => setRange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
          >
            <option value="7d">7 días</option>
            <option value="30d">30 días</option>
            <option value="90d">90 días</option>
          </select>
          
          <button 
            onClick={testAPIs}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Probar APIs
          </button>
          
          <button 
            onClick={refresh}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
          >
            Refresh Hook
          </button>
        </div>

        {/* Hook Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">useAnalytics Hook</h2>
            <div className="space-y-2">
              <p><strong>Loading:</strong> {loading ? 'true' : 'false'}</p>
              <p><strong>Error:</strong> {error || 'none'}</p>
              <p><strong>Overview:</strong></p>
              <pre className="bg-gray-800 p-2 rounded text-sm overflow-auto">
                {JSON.stringify(overview, null, 2)}
              </pre>
              <p><strong>Weekly Data:</strong></p>
              <pre className="bg-gray-800 p-2 rounded text-sm overflow-auto max-h-40">
                {JSON.stringify(weeklyData, null, 2)}
              </pre>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">API Test Results</h2>
            {testResults ? (
              <div className="space-y-4">
                {testResults.errors.length > 0 && (
                  <div className="bg-red-900/50 border border-red-700 rounded p-3">
                    <p className="font-semibold text-red-300">Errores:</p>
                    {testResults.errors.map((error: string, i: number) => (
                      <p key={i} className="text-red-200 text-sm">{error}</p>
                    ))}
                  </div>
                )}
                
                {testResults.overview && (
                  <div className="bg-green-900/50 border border-green-700 rounded p-3">
                    <p className="font-semibold text-green-300">✅ Overview API</p>
                    <p className="text-sm text-green-200">
                      Users: {testResults.overview.data?.totalUsers}, 
                      Clients: {testResults.overview.data?.totalClients}
                    </p>
                  </div>
                )}
                
                {testResults.performance && (
                  <div className="bg-green-900/50 border border-green-700 rounded p-3">
                    <p className="font-semibold text-green-300">✅ Performance API</p>
                    <p className="text-sm text-green-200">
                      Conversations: {testResults.performance.data?.conversations?.total}
                    </p>
                  </div>
                )}
                
                {testResults.conversations && (
                  <div className="bg-green-900/50 border border-green-700 rounded p-3">
                    <p className="font-semibold text-green-300">✅ Conversations API</p>
                    <p className="text-sm text-green-200">
                      Total: {testResults.conversations.data?.overview?.totalConversations}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-400">Haz clic en "Probar APIs" para testear</p>
            )}
          </div>
        </div>

        {/* Raw API Responses */}
        {testResults && (
          <div className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Raw API Responses</h2>
            <div className="space-y-4">
              {testResults.overview && (
                <details className="border border-gray-700 rounded">
                  <summary className="bg-gray-800 p-2 cursor-pointer">Overview API Response</summary>
                  <pre className="p-4 text-xs overflow-auto max-h-60">
                    {JSON.stringify(testResults.overview, null, 2)}
                  </pre>
                </details>
              )}
              
              {testResults.performance && (
                <details className="border border-gray-700 rounded">
                  <summary className="bg-gray-800 p-2 cursor-pointer">Performance API Response</summary>
                  <pre className="p-4 text-xs overflow-auto max-h-60">
                    {JSON.stringify(testResults.performance, null, 2)}
                  </pre>
                </details>
              )}
              
              {testResults.conversations && (
                <details className="border border-gray-700 rounded">
                  <summary className="bg-gray-800 p-2 cursor-pointer">Conversations API Response</summary>
                  <pre className="p-4 text-xs overflow-auto max-h-60">
                    {JSON.stringify(testResults.conversations, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
