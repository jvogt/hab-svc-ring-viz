# hab-svc-ring-viz

This is a project to visualize the members of your habitat service ring.

There are two ways to run it.

### Local dev mode
1. `npm install`
2. `npm run-script start-dev`

This will run just the frontend, and can only connect to a local service ring (http://localhost:9631).  Pro-tip, add `-p 9631:9631` to your `$HAB_DOCKER_OPTS` if your supervisor is in a docker studio.

You can access this version on http://localhost:3000.  If you want to change the port you can change step 2 to `PORT=1234 npm run-script start-dev`


### As a habitat package
1. `hab svc load jvogt/hab-svc-ring-viz`

This will launch a small node app which will proxy the census data to the frontend app.  Warning: this means anyone that can see this tool can access the `/census` endpoint on your habitat svc ring.

You can change the default port this visualization runs on (`3000`) with a user.toml.
