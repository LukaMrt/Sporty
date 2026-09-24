/** Jeton CSRF (cookie XSRF-TOKEN posé par Shield) pour les requêtes fetch hors Inertia */
export function xsrfToken(): string {
  const raw =
    document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('XSRF-TOKEN='))
      ?.split('=')[1] ?? ''
  return decodeURIComponent(raw)
}

/** POST multipart (upload de fichier) avec le jeton CSRF */
export function postMultipart(url: string, body: FormData): Promise<Response> {
  return fetch(url, { method: 'POST', headers: { 'X-XSRF-TOKEN': xsrfToken() }, body })
}

/** POST JSON (appel AJAX hors Inertia) avec le jeton CSRF */
export function postJson(url: string, body?: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-XSRF-TOKEN': xsrfToken(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}
