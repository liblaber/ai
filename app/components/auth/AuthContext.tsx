import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
  isLoginModalOpen: boolean;
  loginModalTitle: string | null;
  toggleLoginModal: (open: boolean, title?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalTitle, setLoginModalTitle] = useState<string | null>(null);

  const toggleLoginModal = (open: boolean, title?: string) => {
    setIsLoginModalOpen(open);

    if (title) {
      setLoginModalTitle(title);
    } else if (!open) {
      setLoginModalTitle(null);
    }
  };

  return (
    <AuthContext.Provider value={{ isLoginModalOpen, loginModalTitle, toggleLoginModal }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
