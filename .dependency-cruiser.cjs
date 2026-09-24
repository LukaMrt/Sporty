/**
 * Helper : génère un pattern qui matche à la fois les chemins résolus (app/layer/...)
 * et les subpath imports non résolus (#layer/...).
 */
function layerPattern(layers) {
  const joined = layers.join('|')
  return `(^app/(${joined})/|^#(${joined})/)`
}

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Pas de dépendances circulaires',
      from: {},
      to: { circular: true },
    },

    {
      name: 'domain-only-domain',
      severity: 'error',
      comment:
        "Liste blanche : le domaine n'importe QUE le domaine (ni autre couche, ni package npm, ni module Node).",
      from: { path: '^app/domain/' },
      to: { pathNot: layerPattern(['domain']) },
    },

    {
      name: 'use-cases-only-domain',
      severity: 'error',
      comment:
        "Liste blanche : les use cases n'importent que le domaine, les autres use cases et @adonisjs/core (pour @inject uniquement). Les services Adonis (emitter, logger…) passent par des ports.",
      from: { path: '^app/use_cases/' },
      to: {
        pathNot: [layerPattern(['domain', 'use_cases']), '@adonisjs/core/build/index\\.js$'],
      },
    },

    {
      name: 'listeners-thin',
      severity: 'error',
      comment:
        'Les listeners délèguent à un use case : domaine, use cases et @adonisjs/core seulement.',
      from: { path: '^app/listeners/' },
      to: {
        pathNot: [layerPattern(['domain', 'use_cases']), '@adonisjs/core/build/index\\.js$'],
      },
    },

    {
      name: 'infra-no-http-nor-usecases',
      severity: 'error',
      comment: "L'infrastructure ne doit pas dépendre des use cases ou de la couche HTTP.",
      from: { path: '^app/(repositories|services|connectors)/' },
      to: {
        path: layerPattern(['use_cases', 'controllers', 'middleware', 'validators', 'exceptions']),
      },
    },

    {
      name: 'models-isolated',
      severity: 'error',
      // Les entités et value objects du domaine (enums, types) peuvent typer les
      // colonnes des models ; ports, services et erreurs du domaine restent interdits.
      // (Les alias #… ne sont pas résolus par depcruise : on ne peut pas distinguer
      // les `import type`, d'où ce découpage par dossier.)
      comment:
        'Les models Lucid ne doivent importer aucune couche métier interne (domain, use_cases, infra, HTTP).',
      from: { path: '^app/models/' },
      to: {
        path: layerPattern([
          'domain/(interfaces|services|errors)',
          'use_cases',
          'repositories',
          'services',
          'controllers',
          'middleware',
          'validators',
          'exceptions',
        ]),
      },
    },

    {
      name: 'controllers-no-direct-infra',
      severity: 'error',
      comment:
        "Les controllers doivent passer par les use cases — pas d'import direct de repositories, services ou models.",
      from: { path: '^app/controllers/' },
      to: {
        path: layerPattern(['repositories', 'services', 'models']),
      },
    },

    {
      name: 'validators-isolated',
      severity: 'error',
      comment: 'Les validators ne doivent pas dépendre des autres couches internes.',
      from: { path: '^app/validators/' },
      to: {
        path: layerPattern([
          'controllers',
          'use_cases',
          'repositories',
          'services',
          'models',
          'middleware',
          'exceptions',
        ]),
      },
    },

    {
      name: 'middleware-no-infra',
      severity: 'error',
      comment: "Les middleware HTTP ne doivent pas accéder directement à l'infrastructure.",
      from: { path: '^app/middleware/' },
      to: {
        path: layerPattern(['repositories', 'services', 'models']),
      },
    },
  ],

  options: {
    // Les `import type` sont aussi contrôlés (invisibles par défaut)
    tsPreCompilationDeps: true,

    doNotFollow: {
      path: 'node_modules',
    },

    tsConfig: {
      fileName: 'tsconfig.json',
    },

    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      mainFields: ['main', 'types', 'typings'],
    },
  },
}
