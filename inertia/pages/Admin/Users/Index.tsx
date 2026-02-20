import React from 'react'
import { Head, Link } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'

interface User {
  id: number
  fullName: string
  email: string
  role: string
  createdAt: string
}

interface AdminUsersIndexProps {
  users: User[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function AdminUsersIndex({ users }: AdminUsersIndexProps) {
  return (
    <>
      <Head title="Administration — Utilisateurs" />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Utilisateurs</h1>
          <Link
            href="/admin/users/create"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Ajouter un utilisateur
          </Link>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nom</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Rôle</th>
                <th className="px-4 py-3 text-left font-medium">Création</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t transition hover:bg-muted/50">
                  <td className="px-4 py-3">{user.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

AdminUsersIndex.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
