/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const RegisterController = () => import('#controllers/auth/register_controller')
const LoginController = () => import('#controllers/auth/login_controller')
const LogoutController = () => import('#controllers/auth/logout_controller')
const DashboardController = () => import('#controllers/dashboard/dashboard_controller')
const AdminUsersController = () => import('#controllers/admin/users_controller')
const PasswordController = () => import('#controllers/profile/password_controller')

router.get('/register', [RegisterController, 'show'])
router.post('/register', [RegisterController, 'register'])

router.get('/login', [LoginController, 'show'])
router.post('/login', [LoginController, 'login'])

router
  .group(() => {
    router.get('/', [DashboardController, 'index'])
    router.on('/sessions').renderInertia('Sessions/Index')
    router.on('/planning').renderInertia('Planning/Index')
    router.on('/profile').renderInertia('Profile/Edit')
    router.put('/profile/password', [PasswordController, 'update'])
    router.post('/logout', [LogoutController, 'logout'])
  })
  .use(middleware.auth())

router
  .group(() => {
    router.get('/users', [AdminUsersController, 'index'])
    router.get('/users/create', [AdminUsersController, 'create'])
    router.post('/users', [AdminUsersController, 'store'])
    router.get('/users/:id/edit', [AdminUsersController, 'edit'])
    router.put('/users/:id', [AdminUsersController, 'update'])
    router.put('/users/:id/password', [AdminUsersController, 'resetPassword'])
    router.delete('/users/:id', [AdminUsersController, 'destroy'])
  })
  .prefix('/admin')
  .use([middleware.auth(), middleware.admin()])
