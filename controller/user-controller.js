const User = require('../models/user-model');
const AppError = require('../utils/app-errors');
const catchAsync = require('../utils/catch-async');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  console.log(newObj);
  return newObj;
};

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find({});

  // Send Response
  res.status(200).json({
    status: 'success',
    totalRecords: users.length,
    data: {
      users,
    },
  });
});

exports.updateUserDetails = catchAsync(async (req, res, next) => {
  // fetch User details
  const { name, surname, email } = req.body;
  // 1) Create error if user POSTS password details
  if (req.body.password || req.body.confirmPassword) {
    return next(
      new AppError(
        'You cannot update password here. Please use a different link.',
        400,
      ),
    );
  }

  // 2) Filter the fields first and update into the existing user object
  const filteredUserDetails = filterObj(req.body, 'name', 'surname');
  // 3) Update User details

  const updatedUser = await User.findByIdAndUpdate(
    req.loggedUser._id,
    filteredUserDetails,
    { new: true, runValidators: true },
  );

  res.status(200).json({
    message: 'User details updated successfully',
    user: updatedUser,
  });
});
