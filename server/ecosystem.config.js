module.exports = {
    apps: [
        {
            name: 'kagzso-api',
            script: 'server.js',
            instances: 'max',       // Utilize all CPU cores for high scalability
            exec_mode: 'cluster',  // Run in cluster mode for horizontal scaling
            env: {
                NODE_ENV: 'development',
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 5000,
            },
            // Keep alive & reliability
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',

            // Logging
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            merge_logs: true,

            // Scaling behavior
            listen_timeout: 10000,
            kill_timeout: 5000,
            wait_ready: true,      // Wait for "process.send('ready')" in server.js
        }
    ]
};
