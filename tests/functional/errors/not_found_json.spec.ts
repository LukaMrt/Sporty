import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import HttpExceptionHandler from '#exceptions/handler'

/** Erreur telle que la lève Lucid sur findOrFail / firstOrFail */
function rowNotFound() {
  return Object.assign(new Error('Row not found'), { code: 'E_ROW_NOT_FOUND', status: 404 })
}

test.group('Erreurs / ressource introuvable', () => {
  test('appel JSON : 404 avec un message traduit, sans détail technique', async ({ assert }) => {
    const ctx = await testUtils.createHttpContext()
    ctx.request.request.headers.accept = 'application/json'

    await new HttpExceptionHandler().handle(rowNotFound(), ctx)

    assert.equal(ctx.response.getStatus(), 404)
    const body = ctx.response.getBody() as { message: string }
    assert.isString(body.message)
    assert.notInclude(body.message, 'Row not found')
  })
})
