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
      name: 'domain-no-internal-deps',
      severity: 'error',
      comment:
        'Le domaine (entités, interfaces, value objects) ne doit importer aucune autre couche interne.',
      from: { path: '^app/domain/' },
      to: {
        path: layerPattern([
          'use_cases',
          'repositories',
          'services',
          'models',
          'controllers',
          'middleware',
          'validators',
          'exceptions',
        ]),
      },
    },

    {
      name: 'use-cases-only-domain',
      severity: 'error',
      comment:
        "Les use cases ne doivent dépendre que du domaine — jamais de l'infra ni de la couche HTTP.",
      from: { path: '^app/use_cases/' },
      to: {
        path: layerPattern([
          'repositories',
          'services',
          'models',
          'controllers',
          'middleware',
          'validators',
          'exceptions',
        ]),
      },
    },

    {
      name: 'infra-no-http-nor-usecases',
      severity: 'error',
      comment: "L'infrastructure ne doit pas dépendre des use cases ou de la couche HTTP.",
      from: { path: '^app/(repositories|services)/' },
      to: {
        path: layerPattern(['use_cases', 'controllers', 'middleware', 'validators', 'exceptions']),
      },
    },

    {
      name: 'models-isolated',
      severity: 'error',
      comment:
        'Les models Lucid ne doivent importer aucune couche métier interne (domain, use_cases, infra, HTTP).',
      from: { path: '^app/models/' },
      to: {
        path: layerPattern([
          'domain',
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
