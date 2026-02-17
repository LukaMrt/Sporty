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

router.get('/register', [RegisterController, 'show'])
router.post('/register', [RegisterController, 'register'])

router.get('/login', [LoginController, 'show'])
router.post('/login', [LoginController, 'login'])

router
  .group(() => {
    router.on('/').renderInertia('home')
    router.post('/logout', [LogoutController, 'logout'])
  })
  .use(middleware.auth())
