#!/bin/sh
set -e

# Les migrations tournent à chaque démarrage : c'est adapté à un déploiement
# mono-instance. Avec plusieurs réplicas, les lancer dans un job dédié.
echo "Running database migrations..."
node ace migration:run --force

echo "Starting server..."
exec node bin/server.js
