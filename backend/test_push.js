const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// We need an FCM token to send to. 
// For this test script, you would pass it as an argument:
// node test_push.js "<DEVICE_FCM_TOKEN>"

const targetToken = process.argv[2];

if (!targetToken) {
  console.error("Please provide an FCM token as an argument.");
  console.error("Usage: node test_push.js <token>");
  process.exit(1);
}

const message = {
  notification: {
    title: 'New Task Available!',
    body: 'Someone needs help in your area.'
  },
  data: {
    route: '/messages',
    taskId: '123'
  },
  token: targetToken
};

admin.messaging().send(message)
  .then((response) => {
    console.log('Successfully sent message:', response);
  })
  .catch((error) => {
    console.log('Error sending message:', error);
  });
