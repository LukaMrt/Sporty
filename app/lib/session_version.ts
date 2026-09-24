/**
 * Clé de session mémorisant la version de session de l'utilisateur à la connexion.
 * Comparée à `users.session_version`, incrémentée à chaque changement de mot de passe.
 */
export const SESSION_VERSION_KEY = 'session_version'
