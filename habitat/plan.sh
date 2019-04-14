pkg_name=hab-svc-ring-viz
pkg_origin=jvogt
pkg_version=0.1.0
pkg_deps=(core/node core/coreutils)

do_build() {
  echo "--- Setting up /usr/bin/env hack ---"
  mkdir -p /usr/bin
  ln -svf "$(pkg_path_for coreutils)/bin/env" /usr/bin/env
  if [[ -n "$HAB_NONINTERACTIVE" ]]; then
    export NPM_CONFIG_PROGRESS=false
  fi

  echo "--- Copying files to cache ---"
  for target in index.js package.json package-lock.json src public node_modules; do
    cp -r $target $CACHE_PATH/
  done

  cd $CACHE_PATH

  echo "--- npm install ---"
  npm install \
    --unsafe-perm \
    --loglevel error \
    --fetch-retries 5 
  
  echo "--- npm run-script build ---"
  npm run-script build
}

do_install() {
  cd $CACHE_PATH
  echo "--- npm prune --production ---"
  npm prune --production
  echo "--- copying build to pkg prefix ---"
  for target in index.js package.json build node_modules; do
    cp -r $target $pkg_prefix/
  done
}