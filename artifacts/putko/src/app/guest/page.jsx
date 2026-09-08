import React from 'react';
import ProtectedRoute from '../ProtectedRoute';
import GuestLayout from './GuestLayout';

export default function GuestPage() {
  return (
    <ProtectedRoute allowedRoles={['guest']}>
      <GuestLayout />
    </ProtectedRoute>
  );
}