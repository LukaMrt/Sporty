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

const LocaleController = () => import('#controllers/locale_controller')
const OnboardingController = () => import('#controllers/onboarding/onboarding_controller')
const SessionsController = () => import('#controllers/sessions/sessions_controller')
const RegisterController = () => import('#controllers/auth/register_controller')
const LoginController = () => import('#controllers/auth/login_controller')
const LogoutController = () => import('#controllers/auth/logout_controller')
const DashboardController = () => import('#controllers/dashboard/dashboard_controller')
const AdminUsersController = () => import('#controllers/admin/users_controller')
const PasswordController = () => import('#controllers/profile/password_controller')
const ProfileController = () => import('#controllers/profile/profile_controller')
const PhysiologyGuideController = () => import('#controllers/profile/physiology_guide_controller')
const ConnectorsController = () => import('#controllers/connectors/connectors_controller')
const StravaConnectorController = () =>
  import('#controllers/connectors/strava_connector_controller')
const ConnectorSettingsController = () =>
  import('#controllers/connectors/connector_settings_controller')
const ImportController = () => import('#controllers/import/import_controller')
const ImportSessionsController = () => import('#controllers/import/import_sessions_controller')
const AthleteProfileController = () => import('#controllers/planning/athlete_profile_controller')
const GoalsController = () => import('#controllers/planning/goals_controller')
const GoalWizardController = () => import('#controllers/planning/goal_wizard_controller')
const PlanningController = () => import('#controllers/planning/planning_controller')
const RecalibrationController = () => import('#controllers/planning/recalibration_controller')
const InactivityController = () => import('#controllers/planning/inactivity_controller')
const HistoryController = () => import('#controllers/planning/history_controller')
const GpxController = () => import('#controllers/sessions/gpx_controller')

router.post('/locale', [LocaleController, 'update']).use(middleware.silentAuth())

router.get('/register', [RegisterController, 'show'])
router.post('/register', [RegisterController, 'register'])

router.get('/login', [LoginController, 'show'])
router.post('/login', [LoginController, 'login'])

router
  .group(() => {
    router.get('/onboarding', [OnboardingController, 'show'])
    router.post('/onboarding', [OnboardingController, 'complete'])
  })
  .use(middleware.auth())

router
  .group(() => {
    router.get('/', [DashboardController, 'index'])
    router.get('/sessions', [SessionsController, 'index'])
    router.get('/sessions/create', [SessionsController, 'create'])
    router.get('/sessions/trash', [SessionsController, 'trash'])
    router.post('/sessions', [SessionsController, 'store'])
    router.post('/sessions/parse-gpx', [GpxController, 'parseGpx'])
    router.post('/sessions/:id/enrich-gpx', [GpxController, 'enrichGpx'])
    router.get('/sessions/:id', [SessionsController, 'show'])
    router.get('/sessions/:id/edit', [SessionsController, 'edit'])
    router.put('/sessions/:id', [SessionsController, 'update'])
    router.delete('/sessions/:id', [SessionsController, 'destroy'])
    router.post('/sessions/:id/restore', [SessionsController, 'restore'])
    router.get('/planning', [PlanningController, 'index'])
    router.get('/planning/week/:weekNumber', [PlanningController, 'weekDetail'])
    router.get('/planning/goal', [GoalWizardController, 'create'])
    router.post('/planning/goals', [GoalsController, 'store'])
    router.put('/planning/goals/:id', [GoalsController, 'update'])
    router.post('/planning/goals/:id/abandon', [GoalsController, 'abandon'])
    router.post('/planning/generate', [PlanningController, 'generate'])
    router.put('/planning/sessions/:id', [PlanningController, 'updateSession'])
    router.post('/planning/sessions/:id/link', [PlanningController, 'linkSession'])
    router.post('/planning/transition', [PlanningController, 'generateTransition'])
    router.post('/planning/maintenance', [PlanningController, 'generateMaintenance'])
    router.post('/planning/abandon', [PlanningController, 'abandon'])
    router.post('/planning/toggle-auto-recalibrate', [RecalibrationController, 'toggle'])
    router.get('/planning/history', [HistoryController, 'index'])
    router.get('/planning/history/:id', [HistoryController, 'show'])
    router.post('/planning/resume-from-inactivity', [InactivityController, 'resume'])
    router.post('/planning/abandon-for-new-plan', [InactivityController, 'abandonForNewPlan'])
    router.post('/planning/vdot-down-proposal', [RecalibrationController, 'handleVdotProposal'])
    router.get('/profile/athlete', [AthleteProfileController, 'show'])
    router.get('/profile/athlete/estimate-vdot', [AthleteProfileController, 'estimateVdot'])
    router.post('/profile/athlete/confirm-vdot', [AthleteProfileController, 'confirmVdot'])
    router.put('/profile/athlete', [AthleteProfileController, 'updateProfile'])
    router.get('/profile', [ProfileController, 'show'])
    router.put('/profile', [ProfileController, 'update'])
    router.put('/profile/password', [PasswordController, 'update'])
    router.get('/profile/physiology-guide', [PhysiologyGuideController, 'show'])
    router.post('/logout', [LogoutController, 'logout'])
    router.get('/connectors', [ConnectorsController, 'index'])
    router.get('/connectors/strava', [StravaConnectorController, 'show'])
    router.get('/connectors/strava/authorize', [StravaConnectorController, 'authorize'])
    router.post('/connectors/strava/disconnect', [StravaConnectorController, 'disconnect'])
    router.post('/connectors/:provider/settings', [ConnectorSettingsController, 'update'])
    router.post('/import/batch', [ImportController, 'batch'])
    router.post('/import/sessions/:id/ignore', [ImportSessionsController, 'ignore'])
    router.post('/import/sessions/:id/restore', [ImportSessionsController, 'restore'])
    router.post('/import/sessions/:id/reimport', [ImportSessionsController, 'reimport'])
  })
  .use([middleware.auth(), middleware.onboarding()])

// Hors groupe auth : Strava redirige ici depuis un domaine externe,
// la session est vérifiée manuellement dans le controller
router
  .get('/connectors/strava/callback', [StravaConnectorController, 'callback'])
  .use(middleware.silentAuth())

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
