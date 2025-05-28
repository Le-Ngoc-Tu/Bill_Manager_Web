"use client"

import { AuthStatusDemo } from "@/components/auth-status-demo";
import { withAuth } from "@/lib/auth";

function AuthDemoPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Authentication Demo</h1>
        <p className="text-gray-600 mt-2">
          Test automatic logout functionality and token monitoring
        </p>
      </div>
      
      <AuthStatusDemo />
      
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h2 className="font-semibold text-yellow-900 mb-2">⚠️ Development Only</h2>
        <p className="text-yellow-800 text-sm">
          This page is for testing authentication functionality during development. 
          It should be removed or protected in production.
        </p>
      </div>
    </div>
  );
}

export default withAuth(AuthDemoPage);
