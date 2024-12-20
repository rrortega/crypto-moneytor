const Redis = require('redis');
try{
    const redis = new Redis({
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379,
    });
    module.exports = redis;
}
catch(e){
    console.error('Error al conectar con Redis:', e.message);
    module.exports = null;
}



