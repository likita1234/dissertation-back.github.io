const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });
const app = require('./app');

const port = process.env.PORT || 3000;

// import db connection
require('./config/db-connection');

// console.log(process.env.NODE_ENV);
const server = app.listen(port, () => {
  console.log(`App running on server:: localhost:${port}...`);
});

app.get('/', () => {
  console.log('Welcome to my server');
});

// Handles all the unhandled promises errors in the overall application
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('UNHANDLED REJECTION! Shutting down..');
  server.close(() => {
    process.exit(1);
  });
});
