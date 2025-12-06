# Run all dev processes in parallel
dev:
    #!/usr/bin/env bash
    trap 'kill 0' EXIT
    npm run dev:main &
    npm run dev:renderer &
    sleep 3
    npm run start:dev

# Individual dev commands
dev-main:
    npm run dev:main

dev-renderer:
    npm run dev:renderer

start:
    npm run start:dev

# Build commands
build:
    npm run build

build-main:
    npm run build:main

build-renderer:
    npm run build:renderer

# Package commands
package-deb:
    npm run package:deb

package-appimage:
    npm run package:appimage

# Build and install .deb package
install-deb:
    npm run package:deb
    sudo dpkg -i release/dumb-notes_1.1.0_amd64.deb

# Uninstall the app
uninstall:
    sudo dpkg -r dumb-notes

# Utilities
clean:
    npm run clean

typecheck:
    npm run typecheck

install:
    npm install
