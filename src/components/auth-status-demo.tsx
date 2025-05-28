"use client"

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { isTokenExpired } from "@/lib/api/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/**
 * Demo component to test automatic logout functionality
 * This component shows token status and allows testing various scenarios
 */
export function AuthStatusDemo() {
  const { user, logout, forceTokenRefresh } = useAuth();
  const [tokenStatus, setTokenStatus] = useState<{
    accessToken: string | null;
    refreshToken: string | null;
    accessTokenExpired: boolean;
    refreshTokenExpired: boolean;
    accessTokenTimeLeft: number;
    refreshTokenTimeLeft: number;
  }>({
    accessToken: null,
    refreshToken: null,
    accessTokenExpired: false,
    refreshTokenExpired: false,
    accessTokenTimeLeft: 0,
    refreshTokenTimeLeft: 0,
  });

  // Update token status every second
  useEffect(() => {
    const updateTokenStatus = () => {
      const accessToken = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");

      if (accessToken && refreshToken) {
        const accessTokenExpired = isTokenExpired(accessToken);
        const refreshTokenExpired = isTokenExpired(refreshToken);

        // Calculate time left
        let accessTokenTimeLeft = 0;
        let refreshTokenTimeLeft = 0;

        try {
          const accessPayload = JSON.parse(atob(accessToken.split('.')[1]));
          const refreshPayload = JSON.parse(atob(refreshToken.split('.')[1]));
          
          accessTokenTimeLeft = Math.max(0, (accessPayload.exp * 1000) - Date.now());
          refreshTokenTimeLeft = Math.max(0, (refreshPayload.exp * 1000) - Date.now());
        } catch (error) {
          console.error("Error parsing token:", error);
        }

        setTokenStatus({
          accessToken,
          refreshToken,
          accessTokenExpired,
          refreshTokenExpired,
          accessTokenTimeLeft,
          refreshTokenTimeLeft,
        });
      } else {
        setTokenStatus({
          accessToken: null,
          refreshToken: null,
          accessTokenExpired: false,
          refreshTokenExpired: false,
          accessTokenTimeLeft: 0,
          refreshTokenTimeLeft: 0,
        });
      }
    };

    updateTokenStatus();
    const interval = setInterval(updateTokenStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTimeLeft = (milliseconds: number): string => {
    if (milliseconds <= 0) return "Expired";
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleTestTokenRefresh = async () => {
    try {
      await forceTokenRefresh();
      toast.success("Token refreshed successfully!", {
        className: "text-lg font-medium"
      });
    } catch (error) {
      toast.error("Failed to refresh token", {
        description: error instanceof Error ? error.message : "Unknown error",
        className: "text-lg font-medium",
        descriptionClassName: "text-base"
      });
    }
  };

  const handleTestLogout = () => {
    logout();
  };

  const handleExpireAccessToken = () => {
    // Set access token to an expired one for testing
    const expiredToken = createExpiredToken();
    localStorage.setItem("accessToken", expiredToken);
    toast.info("Access token set to expired for testing", {
      className: "text-lg font-medium"
    });
  };

  const handleExpireRefreshToken = () => {
    // Set refresh token to an expired one for testing
    const expiredToken = createExpiredToken();
    localStorage.setItem("refreshToken", expiredToken);
    toast.info("Refresh token set to expired for testing", {
      className: "text-lg font-medium"
    });
  };

  // Helper function to create an expired token for testing
  const createExpiredToken = (): string => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      exp: Math.floor((Date.now() - 1000) / 1000), // Expired 1 second ago
      iat: Math.floor(Date.now() / 1000),
      userId: user?.id || 1,
      username: user?.username || 'testuser',
      email: user?.email || 'test@example.com'
    }));
    const signature = 'test-signature';
    
    return `${header}.${payload}.${signature}`;
  };

  if (!user) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Authentication Status</CardTitle>
          <CardDescription>User not authenticated</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Please log in to see token status.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Authentication Status Demo</CardTitle>
        <CardDescription>
          Monitor token status and test automatic logout functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Info */}
        <div>
          <h3 className="text-lg font-semibold mb-2">User Information</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Username: {user.username}</div>
            <div>Email: {user.email}</div>
            <div>Role ID: {user.role_id}</div>
            <div>Authenticated: <Badge variant={user.isAuthenticated ? "default" : "destructive"}>
              {user.isAuthenticated ? "Yes" : "No"}
            </Badge></div>
          </div>
        </div>

        {/* Token Status */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Token Status</h3>
          <div className="space-y-3">
            <div className="p-3 border rounded">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">Access Token</span>
                <Badge variant={tokenStatus.accessTokenExpired ? "destructive" : "default"}>
                  {tokenStatus.accessTokenExpired ? "Expired" : "Valid"}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                Time left: {formatTimeLeft(tokenStatus.accessTokenTimeLeft)}
              </div>
              {tokenStatus.accessToken && (
                <div className="text-xs text-gray-400 mt-1 font-mono break-all">
                  {tokenStatus.accessToken.substring(0, 50)}...
                </div>
              )}
            </div>

            <div className="p-3 border rounded">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">Refresh Token</span>
                <Badge variant={tokenStatus.refreshTokenExpired ? "destructive" : "default"}>
                  {tokenStatus.refreshTokenExpired ? "Expired" : "Valid"}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                Time left: {formatTimeLeft(tokenStatus.refreshTokenTimeLeft)}
              </div>
              {tokenStatus.refreshToken && (
                <div className="text-xs text-gray-400 mt-1 font-mono break-all">
                  {tokenStatus.refreshToken.substring(0, 50)}...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Test Actions */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Test Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleTestTokenRefresh} variant="outline">
              Force Token Refresh
            </Button>
            <Button onClick={handleTestLogout} variant="destructive">
              Manual Logout
            </Button>
            <Button onClick={handleExpireAccessToken} variant="secondary">
              Expire Access Token
            </Button>
            <Button onClick={handleExpireRefreshToken} variant="secondary">
              Expire Refresh Token
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <h4 className="font-medium text-blue-900 mb-1">Testing Instructions</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Watch the token status update in real-time</li>
            <li>• Use "Expire Access Token" to test automatic refresh</li>
            <li>• Use "Expire Refresh Token" to test automatic logout</li>
            <li>• The system should automatically handle expired tokens</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
