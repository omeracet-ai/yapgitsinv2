// Bundle node_modules into a single file so server doesn't need npm install.
// Native modules (bcrypt, sqlite3, mysql2's optional deps) stay external.
const path = require('path');

module.exports = function (options) {
  return {
    ...options,
    externals: {
      // Native binaries that can't be bundled — keep these in node_modules on server.
      bcrypt: 'commonjs bcrypt',
      iyzipay: 'commonjs iyzipay',
      sharp: 'commonjs sharp',
      sqlite3: 'commonjs sqlite3',
      // mysql2 has runtime require resolution issues when bundled
      mysql2: 'commonjs mysql2',
      'mysql2/promise': 'commonjs mysql2/promise',
      // Optional NestJS deps that NestJS tries to load but warns if missing
      '@nestjs/microservices': 'commonjs @nestjs/microservices',
      '@nestjs/microservices/microservices-module': 'commonjs @nestjs/microservices/microservices-module',
      '@nestjs/websockets/socket-module': 'commonjs @nestjs/websockets/socket-module',
      '@grpc/grpc-js': 'commonjs @grpc/grpc-js',
      'amqplib': 'commonjs amqplib',
      'amqp-connection-manager': 'commonjs amqp-connection-manager',
      'kafkajs': 'commonjs kafkajs',
      'mqtt': 'commonjs mqtt',
      'nats': 'commonjs nats',
      'redis': 'commonjs redis',
      'ioredis': 'commonjs ioredis',
      // class-transformer / validator have dynamic requires
      // pg-native is optional, skip
      'pg-native': 'commonjs pg-native',
      // hiredis optional
      'hiredis': 'commonjs hiredis',
    },
    output: {
      ...options.output,
      filename: 'main.js',
      path: path.join(__dirname, 'dist'),
    },
    plugins: [...(options.plugins || [])],
    optimization: { ...options.optimization, minimize: false },
  };
};
