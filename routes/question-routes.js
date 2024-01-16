const express = require('express');

const authController = require('../controller/auth-controller');
const questionController = require('../controller/question-controller');

const router = express.Router();

router.post(
  '/add',
  authController.validateToken,
//   authController.restrictTo('admin', 'superadmin'),
  questionController.addQuestion,
);

module.exports = router;