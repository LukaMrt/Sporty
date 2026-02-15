/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

const RegisterController = () => import('#controllers/auth/register_controller')

router.on('/').renderInertia('home')

router.get('/register', [RegisterController, 'show'])
router.post('/register', [RegisterController, 'register'])
