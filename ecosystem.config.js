module.exports = {
  apps: [{
    name: 'playnexa',
    script: 'node_modules/.bin/next',
    args: 'dev -p 3000',
    cwd: '/home/z/my-project',
    env: {
      NODE_ENV: 'development',
    },
    max_restarts: 5,
    restart_delay: 5000,
    watch: false,
    autorestart: true,
  }]
}
